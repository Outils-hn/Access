import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { chiffrerAcces, dechiffrerAcces } from "@/lib/coffre";
import { useCle } from "@/lib/cle-session";
import { useActions, useAnnuaire, type Fournisseur } from "@/lib/donnees";
import { normaliserUrl } from "@/lib/recherche";
import { ouvrirCoffre } from "./CoffreDialog";

type Props = { open: boolean; onOpenChange: (o: boolean) => void; initial: Fournisseur | null; domaineParDefaut?: string };

export function FournisseurDialog({ open, onOpenChange, initial, domaineParDefaut }: Props) {
  const { domaines } = useAnnuaire();
  const { enregistrerFournisseur } = useActions();
  const cle = useCle();
  const [nom, setNom] = useState("");
  const [domaine, setDomaine] = useState("");
  const [site, setSite] = useState("");
  const [cao, setCao] = useState("");
  const [notes, setNotes] = useState("");
  const [identifiant, setIdentifiant] = useState("");
  const [mdp, setMdp] = useState("");
  const [voir, setVoir] = useState(false);
  const [accesTouche, setAccesTouche] = useState(false);
  const [busy, setBusy] = useState(false);

  // Remis a zero seulement a l'ouverture : un rechargement des donnees ne doit pas effacer la saisie
  const premierDomaine = useRef("");
  premierDomaine.current = domaines[0]?.id ?? "";
  useEffect(() => {
    if (!open) return;
    setNom(initial?.nom ?? ""); setDomaine(initial?.domaine_id ?? domaineParDefaut ?? premierDomaine.current);
    setSite(initial?.site ?? ""); setCao(initial?.site_cao ?? ""); setNotes(initial?.notes ?? "");
    setIdentifiant(""); setMdp(""); setVoir(false); setAccesTouche(false);
  }, [open, initial, domaineParDefaut]);

  // Acces existant : dechiffre dans le formulaire quand le coffre est ouvert
  useEffect(() => {
    if (!open || !cle || !initial?.acces) return;
    dechiffrerAcces(cle, initial.acces).then((a) => { setIdentifiant(a.identifiant); setMdp(a.motDePasse); }).catch(() => {});
  }, [open, cle, initial]);

  const enregistrer = async () => {
    setBusy(true);
    try {
      // Coffre ferme ou acces non modifie : l'acces chiffre existant est garde tel quel
      const acces = cle && accesTouche ? await chiffrerAcces(cle, { identifiant, motDePasse: mdp }) : (initial?.acces ?? null);
      const r = await enregistrerFournisseur({
        id: initial?.id, nom: nom.trim(), domaine_id: domaine,
        site: normaliserUrl(site), site_cao: normaliserUrl(cao), notes: notes.trim(), acces,
      });
      if (r) onOpenChange(false);
    } finally { setBusy(false); }
  };

  const champ = (id: string, label: string, v: string, set: (s: string) => void, placeholder?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={v} placeholder={placeholder} onChange={(e) => set(e.target.value)} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial ? `Modifier ${initial.nom}` : "Nouveau fournisseur"}</DialogTitle>
          <DialogDescription className="sr-only">Nom, domaine, liens et accès du fournisseur</DialogDescription>
        </DialogHeader>
        <form id="form-fournisseur" className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (nom.trim() && domaine) enregistrer(); }}>
          <div className="grid grid-cols-2 gap-4">
            {champ("f-nom", "Nom *", nom, setNom)}
            <div className="space-y-1.5">
              <Label htmlFor="f-domaine">Domaine *</Label>
              <Select value={domaine || undefined} onValueChange={setDomaine}>
                <SelectTrigger id="f-domaine"><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>
                  {domaines.map((d) => <SelectItem key={d.id} value={d.id}>{d.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {champ("f-site", "Site", site, setSite, "schueco.com")}
            {champ("f-cao", "Site CAO", cao, setCao, "facultatif")}
          </div>

          <fieldset className="space-y-3 rounded-lg border border-border p-3">
            <legend className="card-title px-1">Accès au site</legend>
            {cle ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="f-id">Identifiant</Label>
                  <Input id="f-id" autoComplete="off" className="font-mono" value={identifiant} onChange={(e) => { setIdentifiant(e.target.value); setAccesTouche(true); }} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="f-mdp">Mot de passe</Label>
                  <div className="relative">
                    <Input id="f-mdp" type={voir ? "text" : "password"} autoComplete="new-password" className="pr-9 font-mono" value={mdp} onChange={(e) => { setMdp(e.target.value); setAccesTouche(true); }} />
                    <button type="button" onClick={() => setVoir((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={voir ? "Masquer" : "Afficher"}>
                      {voir ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <p className="col-span-2 text-xs text-muted-foreground">Chiffré sur cet ordinateur avant l'envoi. Laisser vide pour retirer l'accès.</p>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {initial?.acces ? "Un accès est enregistré. Il est conservé tel quel." : "Aucun accès enregistré."}
                </p>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => ouvrirCoffre("ouvrir")}>
                  <Lock className="size-3.5" /> {initial?.acces ? "Déverrouiller pour modifier" : "Déverrouiller pour ajouter"}
                </Button>
              </div>
            )}
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="f-notes">Notes</Label>
            <Textarea id="f-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button type="submit" form="form-fournisseur" disabled={busy || !nom.trim() || !domaine}>{initial ? "Enregistrer" : "Ajouter"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
