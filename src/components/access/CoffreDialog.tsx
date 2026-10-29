import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PHRASE_MIN, chiffrerAcces, creerTemoin, dechiffrerAcces, deriverCle, nouveauSel } from "@/lib/coffre";
import { essayerPhrase, poserCle, useCle } from "@/lib/cle-session";
import { useActions, useAnnuaire } from "@/lib/donnees";

type Mode = "ouvrir" | "creer" | "changer";
let demande: { mode: Mode; fin: (ok: boolean) => void } | null = null;
const subs = new Set<() => void>();

/** Ouvre la fenetre du coffre ; renvoie true si la cle est disponible a la fin. */
export function ouvrirCoffre(mode: Mode): Promise<boolean> {
  return new Promise((fin) => { demande = { mode, fin }; subs.forEach((f) => f()); });
}

export function CoffreDialog() {
  const { coffre, fournisseurs } = useAnnuaire();
  const cle = useCle();
  const { creerCoffre, rechiffrer } = useActions();
  const [mode, setMode] = useState<Mode | null>(null);
  const [phrase, setPhrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const f = () => { setMode(demande?.mode ?? null); setPhrase(""); setConfirmation(""); };
    subs.add(f);
    return () => void subs.delete(f);
  }, []);

  const fermer = (ok: boolean) => { demande?.fin(ok); demande = null; setMode(null); setPhrase(""); setConfirmation(""); };
  // Sans coffre dans la base, « ouvrir » devient « creer »
  const m: Mode | null = mode === "ouvrir" && !coffre ? "creer" : mode;
  const nouvelle = m === "creer" || m === "changer";
  const trop_courte = nouvelle && phrase.length < PHRASE_MIN;
  const differente = nouvelle && confirmation !== phrase;

  const valider = async () => {
    setBusy(true);
    try {
      if (m === "ouvrir" && coffre) {
        const c = await essayerPhrase(phrase, coffre);
        if (!c) { toast.error("Phrase secrète incorrecte.", { id: "coffre" }); return; }
        toast.dismiss("coffre");
        await poserCle(c);
        fermer(true);
      } else if (m === "creer") {
        const sel = nouveauSel();
        const c = await deriverCle(phrase, sel);
        if (!(await creerCoffre(sel, await creerTemoin(c)))) return;
        await poserCle(c);
        toast.success("Coffre créé. Notez la phrase secrète en lieu sûr.");
        fermer(true);
      } else if (m === "changer" && cle) {
        // Tout est dechiffre avec l'ancienne cle puis rechiffre avec la nouvelle, en une seule ecriture
        const sel = nouveauSel();
        const c = await deriverCle(phrase, sel);
        const items = [];
        for (const f of fournisseurs) {
          if (!f.acces) continue;
          const bloc = await chiffrerAcces(c, await dechiffrerAcces(cle, f.acces));
          if (bloc) items.push({ id: f.id, acces: bloc });
        }
        if (!(await rechiffrer(sel, await creerTemoin(c), items))) return;
        await poserCle(c);
        toast.success("Phrase secrète changée : transmettez la nouvelle aux collègues concernés.");
        fermer(true);
      }
    } catch {
      toast.error("Impossible de déchiffrer un accès : rechargez la page et recommencez.");
    } finally {
      setBusy(false);
    }
  };

  const titre = m === "creer" ? "Créer le coffre des accès" : m === "changer" ? "Changer la phrase secrète" : "Afficher les accès";
  return (
    <Dialog open={!!m} onOpenChange={(o) => !o && fermer(!!cle && m === "ouvrir")}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{titre}</DialogTitle>
          <DialogDescription>
            {m === "ouvrir" && "Saisissez la phrase secrète pour voir et copier les identifiants pendant cette session."}
            {m === "creer" && "Les identifiants sont chiffrés sur cet ordinateur avec cette phrase. La base ne reçoit que du texte illisible."}
            {m === "changer" && "Tous les accès sont rechiffrés avec la nouvelle phrase. L'ancienne ne fonctionnera plus."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="phrase">{nouvelle ? "Nouvelle phrase secrète" : "Phrase secrète"}</Label>
            <Input id="phrase" type="password" autoFocus autoComplete={nouvelle ? "new-password" : "current-password"} value={phrase}
              onChange={(e) => setPhrase(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !nouvelle && phrase && valider()} />
            {nouvelle && <p className="text-xs text-muted-foreground">Au moins {PHRASE_MIN} caractères. Le plus simple : 4 mots sans rapport, par exemple « tuile lampe gravier hibou ».</p>}
          </div>
          {nouvelle && (
            <div className="space-y-1.5">
              <Label htmlFor="phrase2">Confirmer la phrase</Label>
              <Input id="phrase2" type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
            </div>
          )}
          {nouvelle && (
            <p className="note-access">Impossible de la retrouver si elle est oubliée : les fournisseurs restent, mais les accès devront être ressaisis.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => fermer(false)}>Annuler</Button>
          <Button disabled={busy || !phrase || trop_courte || differente} onClick={valider}>
            {busy ? "Calcul…" : m === "ouvrir" ? "Afficher" : m === "creer" ? "Créer le coffre" : "Changer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
