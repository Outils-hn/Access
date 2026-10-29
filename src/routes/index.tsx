import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Box, ExternalLink, Pencil, Plus, Search, Settings2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { grouper, useAcces, useActions, useAnnuaire, type Fournisseur } from "@/lib/donnees";
import { useCompte } from "@/lib/compte";
import { correspond, hote } from "@/lib/recherche";
import { AccesCellule } from "@/components/access/AccesCellule";
import { FournisseurDialog } from "@/components/access/FournisseurDialog";
import { DomainesDialog } from "@/components/access/DomainesDialog";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Access — annuaire des fournisseurs" }] }),
  component: Annuaire,
});

function Annuaire() {
  const { domaines, fournisseurs, chargement, erreur } = useAnnuaire();
  const { supprimerFournisseur } = useActions();
  const { valide } = useCompte();
  const acces = useAcces();
  const [q, setQ] = useState("");
  const [filtre, setFiltre] = useState<string | null>(null);
  const [edition, setEdition] = useState<{ f: Fournisseur | null; domaine?: string } | null>(null);
  const [aSupprimer, setASupprimer] = useState<Fournisseur | null>(null);
  const [gererDomaines, setGererDomaines] = useState(false);
  const recherche = useRef<HTMLInputElement>(null);

  // « / » place le curseur dans la recherche, Echap la vide
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(t.tagName) && !t.isContentEditable) { e.preventDefault(); recherche.current?.focus(); }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);

  const groupes = useMemo(() => grouper(domaines, fournisseurs), [domaines, fournisseurs]);
  const visibles = useMemo(
    () => groupes
      .filter((g) => !filtre || g.domaine.id === filtre)
      .map((g) => ({ ...g, fournisseurs: g.fournisseurs.filter((f) => correspond(f, g.domaine.nom, q)) }))
      .filter((g) => g.fournisseurs.length > 0 || (!q && filtre === g.domaine.id)),
    [groupes, filtre, q],
  );
  const total = visibles.reduce((n, g) => n + g.fournisseurs.length, 0);

  if (chargement) return <p className="py-16 text-center text-sm text-muted-foreground">Chargement…</p>;
  if (erreur) {
    const pasPrete = /access_|schema cache|does not exist|PGRST205|42P01/i.test(erreur.message ?? "");
    return (
      <div className="panel mx-auto mt-10 max-w-lg p-6 text-sm">
        <h2 className="font-semibold">{pasPrete ? "Base pas encore préparée" : "Base injoignable"}</h2>
        <p className="mt-2 text-muted-foreground">
          {pasPrete
            ? "Les tables d'Access n'existent pas encore dans le projet Supabase d'Index : lancer le fichier supabase/access-index.sql dans le SQL Editor."
            : "Vérifiez la connexion puis rechargez la page."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-5 flex items-center gap-3">
        <div className="relative w-96">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input ref={recherche} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setQ("")}
            placeholder="Rechercher un fournisseur, un domaine, une note…" aria-label="Rechercher" className="pl-9 pr-8" />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border px-1.5 font-mono text-[10px] text-muted-foreground">/</kbd>
        </div>
        <span className="text-sm text-muted-foreground">{total} fournisseur{total > 1 ? "s" : ""}</span>
        {valide && <div className="ml-auto flex gap-2">
          <Button variant="outline" className="gap-1.5" onClick={() => setGererDomaines(true)}><Settings2 className="size-4" /> Domaines</Button>
          <Button className="gap-1.5" disabled={!domaines.length} onClick={() => setEdition({ f: null, domaine: filtre ?? undefined })}>
            <Plus className="size-4" /> Nouveau fournisseur
          </Button>
        </div>}
      </div>

      {domaines.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5" role="group" aria-label="Filtrer par domaine">
          <Puce actif={!filtre} onClick={() => setFiltre(null)} label="Tous" n={fournisseurs.length} />
          {groupes.map((g) => (
            <Puce key={g.domaine.id} actif={filtre === g.domaine.id} onClick={() => setFiltre(filtre === g.domaine.id ? null : g.domaine.id)} label={g.domaine.nom} n={g.fournisseurs.length} />
          ))}
        </div>
      )}

      {domaines.length === 0 ? (
        <div className="panel mx-auto mt-10 max-w-lg p-6 text-center text-sm">
          <h2 className="font-semibold">L'annuaire est vide</h2>
          <p className="mt-2 text-muted-foreground">Commencez par créer les domaines (menuiserie alu, isolation, quincaillerie…), puis ajoutez les fournisseurs. Une sauvegarde peut aussi être importée depuis le pied de page.</p>
          {valide ? <Button className="mt-4 gap-1.5" onClick={() => setGererDomaines(true)}><Plus className="size-4" /> Créer un domaine</Button>
            : <p className="mt-3 text-muted-foreground">Connectez-vous avec un compte Index validé pour le remplir.</p>}
        </div>
      ) : visibles.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Aucun fournisseur ne correspond à « {q} ».</p>
      ) : (
        <div className="space-y-6">
          {visibles.map((g) => (
            <section key={g.domaine.id} className="panel overflow-hidden" aria-labelledby={`d-${g.domaine.id}`}>
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <h2 id={`d-${g.domaine.id}`} className="card-title">{g.domaine.nom} <span className="text-muted-foreground">· {g.fournisseurs.length}</span></h2>
                {valide && <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setEdition({ f: null, domaine: g.domaine.id })}>+ Ajouter ici</button>}
              </div>
              {g.fournisseurs.length === 0 ? (
                <p className="px-4 py-4 text-sm text-muted-foreground">Aucun fournisseur dans ce domaine.</p>
              ) : (
                <table className="tbl table-fixed">
                  <colgroup><col className="w-[22%]" /><col className="w-[24%]" /><col className="w-[22%]" /><col /><col className="w-20" /></colgroup>
                  <thead><tr><th className="pl-4">Fournisseur</th><th>Liens</th><th>Accès</th><th>Notes</th><th><span className="sr-only">Actions</span></th></tr></thead>
                  <tbody>
                    {g.fournisseurs.map((f) => (
                      <tr key={f.id} className="group">
                        <td className="pl-4 font-medium">{f.nom}</td>
                        <td>
                          <div className="flex items-center gap-3">
                            {f.site ? (
                              <a href={f.site} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 items-center gap-1 underline-offset-2 hover:underline" title={f.site}>
                                <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" /><span className="truncate">{hote(f.site)}</span>
                              </a>
                            ) : <span className="text-muted-foreground">—</span>}
                            {f.site_cao && (
                              <a href={f.site_cao} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 underline-offset-2 hover:underline" title={f.site_cao}>
                                <Box className="size-3.5 text-muted-foreground" />CAO
                              </a>
                            )}
                          </div>
                        </td>
                        <td><AccesCellule bureau={acces.bureau(f.id)} perso={acces.perso(f.id)} nom={f.nom} connecte={valide} /></td>
                        <td className="truncate text-muted-foreground" title={f.notes}>{f.notes}</td>
                        <td>
                          {valide && <div className="flex justify-end opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                            <Button size="icon" variant="ghost" className="size-8" onClick={() => setEdition({ f })} aria-label={`Modifier ${f.nom}`}><Pencil className="size-4" /></Button>
                            <Button size="icon" variant="ghost" className="size-8 text-destructive hover:text-destructive" onClick={() => setASupprimer(f)} aria-label={`Supprimer ${f.nom}`}><Trash2 className="size-4" /></Button>
                          </div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          ))}
        </div>
      )}

      <FournisseurDialog open={!!edition} onOpenChange={(o) => !o && setEdition(null)} initial={edition?.f ?? null} domaineParDefaut={edition?.domaine} />
      <DomainesDialog open={gererDomaines} onOpenChange={setGererDomaines} />
      <AlertDialog open={!!aSupprimer} onOpenChange={(o) => !o && setASupprimer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {aSupprimer?.nom} ?</AlertDialogTitle>
            <AlertDialogDescription>Le fournisseur et ses accès (bureau et perso de chacun) sont retirés de l'annuaire. Pensez à télécharger une sauvegarde avant les grands ménages.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => { if (aSupprimer) supprimerFournisseur(aSupprimer.id); setASupprimer(null); }}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Puce({ actif, onClick, label, n }: { actif: boolean; onClick: () => void; label: string; n: number }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={actif}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${actif ? "border-[var(--app-fill)] bg-[var(--app-fill)] text-[var(--app-on)]" : "border-border bg-card text-foreground hover:bg-muted"}`}>
      {label} <span className={actif ? "opacity-80" : "text-muted-foreground"}>{n}</span>
    </button>
  );
}
