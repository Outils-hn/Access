import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Box, ChevronDown, ExternalLink, FileText, Mail, NotebookPen, Phone, Pencil, Plus, Search, Settings2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { grouper, useAcces, useActions, useAnnuaire, useFichesIndex, type Fournisseur } from "@/lib/donnees";
import { INDEX_URL } from "@/lib/base";
import { useCompte } from "@/lib/compte";
import { compterFiches, correspond, fournisseursSansFiche, hote, lienDemande, lienTel } from "@/lib/recherche";
import { AccesCellule, BoutonCopier } from "@/components/access/AccesCellule";
import { FournisseurDialog } from "@/components/access/FournisseurDialog";
import { DomainesDialog } from "@/components/access/DomainesDialog";

export const Route = createFileRoute("/")({
  // ?fournisseur=<id ou nom> : lien depuis une fiche d'Index, ouvre l'annuaire sur ce fournisseur
  validateSearch: (s: Record<string, unknown>): { fournisseur?: string } => ({
    ...(typeof s.fournisseur === "string" && s.fournisseur.trim() ? { fournisseur: s.fournisseur.trim().slice(0, 100) } : {}),
  }),
  head: () => ({ meta: [{ title: "Access — annuaire des fournisseurs" }] }),
  component: Annuaire,
});

const PAGE = 30;

function Annuaire() {
  const { domaines, fournisseurs, chargement, erreur, recharger } = useAnnuaire();
  const { supprimerFournisseur } = useActions();
  const { valide } = useCompte();
  const acces = useAcces();
  const fichesIndex = useFichesIndex();
  const [q, setQ] = useState("");
  const [filtre, setFiltre] = useState<string | null>(null);
  const [edition, setEdition] = useState<{ f: Fournisseur | null; domaine?: string; nom?: string } | null>(null);
  const [aSupprimer, setASupprimer] = useState<Fournisseur | null>(null);
  const [gererDomaines, setGererDomaines] = useState(false);
  const recherche = useRef<HTMLInputElement>(null);
  const sansFiche = useMemo(() => fournisseursSansFiche(fichesIndex, fournisseurs), [fichesIndex, fournisseurs]);
  const [limites, setLimites] = useState<Record<string, number>>({});
  const { fournisseur: cible } = Route.useSearch();
  const [mis, setMis] = useState<string | null>(null); // fournisseur mis en evidence quelques secondes
  const cibleFaite = useRef(false);

  // Lien depuis Index : recherche pre-remplie sur le fournisseur, ligne centree et surlignee
  useEffect(() => {
    if (!cible || chargement || cibleFaite.current || !fournisseurs.length) return;
    cibleFaite.current = true;
    const f = fournisseurs.find((x) => x.id === cible);
    setQ(f ? f.nom : cible);
    setFiltre(null);
    if (f) setMis(f.id);
  }, [cible, chargement, fournisseurs]);
  useEffect(() => {
    if (!mis) return;
    document.getElementById(`f-${mis}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    const t = setTimeout(() => setMis(null), 6000);
    return () => clearTimeout(t);
  }, [mis, q]);

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
              : "Vérifiez la connexion, puis réessayez."}
        </p>
        {!pasPrete && <Button className="mt-4" onClick={() => recharger()}>Réessayer</Button>}
      </div>
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="recherche" ref={recherche} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setQ("")}
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

      {valide && domaines.length > 0 && sansFiche.length > 0 && (
        <details className="panel mb-5 p-3">
          <summary className="cursor-pointer text-sm font-medium">Fournisseurs d'Index sans fiche ici ({sansFiche.length})</summary>
          <ul className="mt-2 divide-y divide-border" aria-label="Fournisseurs d'Index sans fiche Access">
            {sansFiche.map((e) => (
              <li key={e.nom} className="flex items-center gap-3 py-1.5 text-sm">
                <span className="min-w-0 flex-1 truncate">{e.nom}</span>
                <span className="text-xs text-muted-foreground">{e.n} fiche{e.n > 1 ? "s" : ""}</span>
                <Button size="sm" variant="outline" className="min-h-9" onClick={() => setEdition({ f: null, domaine: filtre ?? undefined, nom: e.nom })}>Créer la fiche</Button>
              </li>
            ))}
          </ul>
        </details>
      )}

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
                {valide && <button className="min-h-10 px-2 text-xs text-muted-foreground hover:text-foreground sm:min-h-0 sm:px-0" onClick={() => setEdition({ f: null, domaine: g.domaine.id })}>+ Ajouter ici</button>}
              </div>
              {g.fournisseurs.length === 0 ? (
                <p className="px-4 py-4 text-sm text-muted-foreground">Aucun fournisseur dans ce domaine.</p>
              ) : (
                <table className="tbl tbl-cartes table-fixed">
                  <colgroup><col className="w-[17%]" /><col className="w-[21%]" /><col className="w-[22%]" /><col className="w-[19%]" /><col /><col className="w-20" /></colgroup>
                  <thead><tr><th className="pl-4">Fournisseur</th><th>Liens</th><th>Contact</th><th>Accès</th><th>Notes</th><th><span className="sr-only">Actions</span></th></tr></thead>
                  <tbody>
                    {g.fournisseurs.slice(0, q || filtre ? undefined : limites[g.domaine.id] ?? PAGE).map((f) => (
                      <tr key={f.id} id={`f-${f.id}`} className={"group" + (mis === f.id ? " ligne-ciblee" : "")}>
                        <td className="pl-4 font-medium">{f.nom}</td>
                        <td data-label="Liens">
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
                            <LienFiches nom={f.nom} n={compterFiches(f.nom, fichesIndex)} />
                          </div>
                        </td>
                        <td data-label="Contact"><Contact f={f} /></td>
                        <td data-label="Accès"><AccesCellule bureau={acces.bureau(f.id)} perso={acces.perso(f.id)} nom={f.nom} connecte={valide} /></td>
                        <td data-label="Notes" className="text-muted-foreground"><NoteCellule texte={f.notes} /></td>
                        <td>
                          {valide && <div className="flex justify-end opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                            <Button size="icon" variant="ghost" className="size-11 sm:size-8" aria-label={`Noter dans Check à propos de ${f.nom}`} title="Noter dans Check"
                              onClick={() => window.open(`https://outils-hn.github.io/Check/?noter=${encodeURIComponent(`Fournisseur ${f.nom} : `)}`, "_blank", "noopener,noreferrer")}><NotebookPen className="size-4" /></Button>
                            <Button size="icon" variant="ghost" className="size-11 sm:size-8" onClick={() => setEdition({ f })} aria-label={`Modifier ${f.nom}`}><Pencil className="size-4" /></Button>
                            <Button size="icon" variant="ghost" className="size-11 text-destructive hover:text-destructive sm:size-8" onClick={() => setASupprimer(f)} aria-label={`Supprimer ${f.nom}`}><Trash2 className="size-4" /></Button>
                          </div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {!q && !filtre && g.fournisseurs.length > (limites[g.domaine.id] ?? PAGE) && (
                <div className="border-t border-border p-3 text-center">
                  <Button variant="outline" size="sm" onClick={() => setLimites((l) => ({ ...l, [g.domaine.id]: (l[g.domaine.id] ?? PAGE) + PAGE }))}>
                    Afficher la suite ({g.fournisseurs.length - (limites[g.domaine.id] ?? PAGE)} restant{g.fournisseurs.length - (limites[g.domaine.id] ?? PAGE) > 1 ? "s" : ""})
                  </Button>
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <FournisseurDialog open={!!edition} onOpenChange={(o) => !o && setEdition(null)} initial={edition?.f ?? null} domaineParDefaut={edition?.domaine} nomParDefaut={edition?.nom} />
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
      className={`rounded-full border px-3 py-2 text-xs sm:py-1 transition-colors ${actif ? "border-[var(--app-fill)] bg-[var(--app-fill)] text-[var(--app-on)]" : "border-border bg-card text-foreground hover:bg-muted"}`}>
      {label} <span className={actif ? "opacity-80" : "text-muted-foreground"}>{n}</span>
    </button>
  );
}

/** Lien vers les fiches techniques du fournisseur dans Index (affiche seulement s'il y en a). */
function LienFiches({ nom, n }: { nom: string; n: number }) {
  if (!n) return null;
  return (
    <a href={`${INDEX_URL}/?q=${encodeURIComponent(nom)}`} target="_blank" rel="noopener noreferrer"
      className="inline-flex shrink-0 items-center gap-1 underline-offset-2 hover:underline" title={`Ouvrir les fiches ${nom} dans Index`}>
      <FileText className="size-3.5 text-muted-foreground" />{n} fiche{n > 1 ? "s" : ""}
    </a>
  );
}

/** Contact general du fournisseur : email (objet « Demande d'information » pre-rempli), telephone, et une personne de contact depliable. */
function Contact({ f }: { f: Fournisseur }) {
  const personne = [f.contact_prenom, f.contact_nom].filter(Boolean).join(" ");
  if (!f.email && !f.telephone && !personne && !f.contact_telephone && !f.contact_email) return <span className="vide text-muted-foreground">—</span>;
  const lien = "inline-flex min-w-0 max-w-full items-center gap-1.5 underline-offset-2 hover:underline";
  return (
    <div className="flex min-w-0 flex-col gap-0.5 text-[13px]">
      {f.email && (
        <span className="flex min-w-0 items-center gap-1">
          <a href={lienDemande(f.email, f.nom)} className={lien} title={`Écrire à ${f.email}`}><Mail className="size-3.5 shrink-0 text-muted-foreground" /><span className="truncate">{f.email}</span></a>
          <BoutonCopier texte={f.email} quoi="Email" label={`Copier l'adresse mail de ${f.nom}`} />
        </span>
      )}
      {f.telephone && <a href={lienTel(f.telephone)} className={lien} title={`Appeler ${f.nom}`}><Phone className="size-3.5 shrink-0 text-muted-foreground" /><span className="truncate tabular-nums">{f.telephone}</span></a>}
      {(personne || f.contact_telephone || f.contact_email) && (
        <details className="group">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-muted-foreground hover:text-foreground">
            Personne de contact <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-0.5 flex flex-col gap-0.5 pl-0.5">
            {personne && <span className="truncate">{personne}</span>}
            {f.contact_email && (
              <span className="flex min-w-0 items-center gap-1">
                <a href={lienDemande(f.contact_email, f.nom)} className={lien} title={`Écrire à ${f.contact_email}`}><Mail className="size-3.5 shrink-0 text-muted-foreground" /><span className="truncate">{f.contact_email}</span></a>
                <BoutonCopier texte={f.contact_email} quoi="Email" label={`Copier l'adresse mail de ${personne || f.nom}`} />
              </span>
            )}
            {f.contact_telephone && <a href={lienTel(f.contact_telephone)} className={lien} title={`Appeler ${personne || f.nom}`}><Phone className="size-3.5 shrink-0 text-muted-foreground" /><span className="truncate tabular-nums">{f.contact_telephone}</span></a>}
          </div>
        </details>
      )}
    </div>
  );
}

/** Note d'un fournisseur : une ligne dans le tableau ; un clic la deroule en entier (et la referme). */
function NoteCellule({ texte }: { texte: string }) {
  const [ouverte, setOuverte] = useState(false);
  if (!texte) return null;
  return (
    <button type="button" aria-expanded={ouverte} onClick={() => setOuverte((o) => !o)}
      title={ouverte ? "Réduire la note" : "Lire toute la note"}
      className={"note-btn block w-full cursor-pointer text-left underline-offset-2 hover:text-foreground " + (ouverte ? "whitespace-pre-wrap break-words" : "truncate")}>
      {texte}
    </button>
  );
}
