import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { grouper, useActions, useAnnuaire, type Domaine } from "@/lib/donnees";

export function DomainesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { domaines, fournisseurs } = useAnnuaire();
  const { enregistrerDomaine, supprimerDomaine } = useActions();
  const [nouveau, setNouveau] = useState("");
  const groupes = grouper(domaines, fournisseurs);

  const ajouter = async () => {
    if (!nouveau.trim()) return;
    if (await enregistrerDomaine({ nom: nouveau.trim(), ordre: Math.max(0, ...domaines.map((d) => d.ordre)) + 1 })) setNouveau("");
  };
  // Echange l'ordre avec le voisin (ordres renumerotes 1, 2, 3... pour eviter les egalites)
  const deplacer = async (i: number, sens: -1 | 1) => {
    const liste = groupes.map((g) => g.domaine);
    const j = i + sens;
    if (j < 0 || j >= liste.length) return;
    [liste[i], liste[j]] = [liste[j], liste[i]];
    for (const [k, d] of liste.entries()) if (d.ordre !== k + 1) await enregistrerDomaine({ id: d.id, nom: d.nom, ordre: k + 1 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Domaines</DialogTitle>
          <DialogDescription>Les catégories de l'annuaire, dans l'ordre d'affichage.</DialogDescription>
        </DialogHeader>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); ajouter(); }}>
          <Input placeholder="Nouveau domaine, ex. Garde-corps" value={nouveau} onChange={(e) => setNouveau(e.target.value)} aria-label="Nouveau domaine" />
          <Button type="submit" disabled={!nouveau.trim()} className="gap-1.5"><Plus className="size-4" /> Ajouter</Button>
        </form>
        <ul className="max-h-[50vh] divide-y divide-border overflow-auto rounded-lg border border-border">
          {groupes.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">Aucun domaine pour l'instant.</li>}
          {groupes.map((g, i) => (
            <Ligne key={g.domaine.id} d={g.domaine} n={g.fournisseurs.length} premier={i === 0} dernier={i === groupes.length - 1}
              onRenommer={(nom) => enregistrerDomaine({ id: g.domaine.id, nom })}
              onMonter={() => deplacer(i, -1)} onDescendre={() => deplacer(i, 1)}
              onSupprimer={() => supprimerDomaine(g.domaine.id)} />
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function Ligne({ d, n, premier, dernier, onRenommer, onMonter, onDescendre, onSupprimer }: {
  d: Domaine; n: number; premier: boolean; dernier: boolean;
  onRenommer: (nom: string) => void; onMonter: () => void; onDescendre: () => void; onSupprimer: () => void;
}) {
  const [nom, setNom] = useState(d.nom);
  useEffect(() => setNom(d.nom), [d.nom]);
  const modifie = nom.trim() !== d.nom && !!nom.trim();
  return (
    <li className="flex items-center gap-2 p-2">
      <Input value={nom} onChange={(e) => setNom(e.target.value)} className="h-8" aria-label={`Nom du domaine ${d.nom}`}
        onKeyDown={(e) => e.key === "Enter" && modifie && onRenommer(nom.trim())} />
      <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">{n} fourn.</span>
      {modifie && <Button size="icon" variant="ghost" className="size-8" onClick={() => onRenommer(nom.trim())} aria-label="Enregistrer le nom"><Check className="size-4" /></Button>}
      <Button size="icon" variant="ghost" className="size-8" disabled={premier} onClick={onMonter} aria-label={`Monter ${d.nom}`}><ArrowUp className="size-4" /></Button>
      <Button size="icon" variant="ghost" className="size-8" disabled={dernier} onClick={onDescendre} aria-label={`Descendre ${d.nom}`}><ArrowDown className="size-4" /></Button>
      <Button size="icon" variant="ghost" className="size-8 text-destructive hover:text-destructive" disabled={n > 0} title={n > 0 ? "Déplacez d'abord ses fournisseurs" : undefined} onClick={onSupprimer} aria-label={`Supprimer ${d.nom}`}><Trash2 className="size-4" /></Button>
    </li>
  );
}
