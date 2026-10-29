import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useActions, useAnnuaire } from "@/lib/donnees";
import { useCompte } from "@/lib/compte";
import { exporter, nomFichier, planifier, type PlanImport } from "@/lib/sauvegarde";

export function SauvegardeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const annuaire = useAnnuaire();
  const { enregistrerDomaine, enregistrerFournisseur } = useActions();
  const { valide } = useCompte();
  const input = useRef<HTMLInputElement>(null);
  const [plan, setPlan] = useState<PlanImport | null>(null);
  const [busy, setBusy] = useState(false);

  const telecharger = () => {
    const blob = new Blob([JSON.stringify(exporter(annuaire), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nomFichier();
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const lire = async (f: File | undefined) => {
    if (!f) return;
    try {
      const p = planifier(JSON.parse(await f.text()), annuaire);
      if (p.erreur) toast.error(p.erreur); else setPlan(p);
    } catch { toast.error("Fichier illisible : ce n'est pas un fichier JSON."); }
    if (input.current) input.current.value = "";
  };

  const importer = async () => {
    if (!plan) return;
    setBusy(true);
    try {
      const ids = new Map(annuaire.domaines.map((d) => [d.nom.trim().toLowerCase(), d.id]));
      for (const d of plan.domainesACreer) {
        const id = await enregistrerDomaine(d);
        if (!id) return;
        ids.set(d.nom.toLowerCase(), id);
      }
      let n = 0;
      for (const f of [...plan.aAjouter, ...plan.aMettreAJour]) {
        const { domaine, ...reste } = f;
        const r = await enregistrerFournisseur({ ...reste, domaine_id: ids.get(domaine.toLowerCase()) ?? "" });
        if (!r) { toast.error(`Import arrêté à « ${f.nom} » (${n} fournisseur(s) importé(s)).`); return; }
        n++;
      }
      toast.success(`${n} fournisseur(s) importé(s).`);
      setPlan(null);
      onOpenChange(false);
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setPlan(null); }}>
      <DialogContent className="max-w-md text-left">
        <DialogHeader>
          <DialogTitle>Sauvegarde</DialogTitle>
          <DialogDescription>Un fichier avec tous les domaines et fournisseurs. Les identifiants des sites n'y sont jamais inclus.</DialogDescription>
        </DialogHeader>
        {!plan ? (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-1.5" onClick={telecharger} disabled={!annuaire.fournisseurs.length && !annuaire.domaines.length}>
              <Download className="size-4" /> Télécharger
            </Button>
            <Button variant="outline" className="flex-1 gap-1.5" disabled={!valide} title={valide ? undefined : "Réservé aux comptes validés"} onClick={() => input.current?.click()}>
              <Upload className="size-4" /> Importer…
            </Button>
            <input ref={input} type="file" accept="application/json,.json" className="hidden" onChange={(e) => lire(e.target.files?.[0])} />
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <p>{plan.aAjouter.length} fournisseur(s) ajouté(s), {plan.aMettreAJour.length} mis à jour (même nom), {plan.domainesACreer.length} domaine(s) créé(s).</p>
          </div>
        )}
        {plan && (
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPlan(null)}>Annuler</Button>
            <Button onClick={importer} disabled={busy}>{busy ? "Import…" : "Importer"}</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
