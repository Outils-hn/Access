import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/base";
import { write } from "@/lib/pin";
import type { Bloc } from "@/lib/coffre";

export type Domaine = { id: string; nom: string; ordre: number };
export type Fournisseur = {
  id: string; nom: string; domaine_id: string; site: string; site_cao: string; notes: string;
  acces: Bloc | null; updated_at?: string;
};
export type Coffre = { sel: string; temoin: Bloc } | null;
export type Annuaire = { domaines: Domaine[]; fournisseurs: Fournisseur[]; coffre: Coffre; horsLigne?: string };

const COPIE = "access-copie-locale";
const vide: Annuaire = { domaines: [], fournisseurs: [], coffre: null };

async function charger(): Promise<Annuaire> {
  try {
    const [d, f, c] = await Promise.all([
      db.from("access_domaines").select("id,nom,ordre").order("ordre").order("nom"),
      db.from("access_fournisseurs").select("id,nom,domaine_id,site,site_cao,notes,acces,updated_at").order("nom"),
      db.from("access_coffre").select("sel,temoin").maybeSingle(),
    ]);
    const err = d.error || f.error || c.error;
    if (err) throw err;
    const a: Annuaire = { domaines: d.data ?? [], fournisseurs: f.data ?? [], coffre: c.data ?? null };
    try { localStorage.setItem(COPIE, JSON.stringify({ ...a, le: new Date().toISOString() })); } catch { /* stockage plein ou bloque */ }
    return a;
  } catch (e) {
    // Base injoignable : derniere copie connue, en lecture seule
    try {
      const raw = localStorage.getItem(COPIE);
      if (raw) { const c = JSON.parse(raw); return { domaines: c.domaines, fournisseurs: c.fournisseurs, coffre: c.coffre, horsLigne: c.le }; }
    } catch { /* copie illisible */ }
    throw e;
  }
}

export function useAnnuaire() {
  const q = useQuery({ queryKey: ["access"], queryFn: charger, staleTime: 30_000, retry: 1 });
  return { ...(q.data ?? vide), chargement: q.isLoading, erreur: q.error as Error | null };
}

export function useActions() {
  const qc = useQueryClient();
  const apres = async <T,>(r: T) => { if (r) await qc.invalidateQueries({ queryKey: ["access"] }); return r; };
  return {
    enregistrerFournisseur: (p: Omit<Fournisseur, "id" | "updated_at"> & { id?: string }) => write("access_save_fournisseur", { p }).then(apres),
    supprimerFournisseur: (id: string) => write("access_delete_fournisseur", { p_id: id }).then(apres),
    enregistrerDomaine: (p: { id?: string; nom: string; ordre?: number }) => write("access_save_domaine", { p }).then(apres),
    supprimerDomaine: (id: string) => write("access_delete_domaine", { p_id: id }).then(apres),
    creerCoffre: (sel: string, temoin: Bloc) => write("access_init_coffre", { p_sel: sel, p_temoin: temoin }).then(apres),
    rechiffrer: (sel: string, temoin: Bloc, items: { id: string; acces: Bloc }[]) =>
      write("access_rekey", { p_sel: sel, p_temoin: temoin, p_items: items }).then(apres),
  };
}

/** Domaines dans l'ordre, chacun avec ses fournisseurs (tries par nom). */
export function grouper(domaines: Domaine[], fournisseurs: Fournisseur[]) {
  return [...domaines]
    .sort((a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom, "fr"))
    .map((d) => ({ domaine: d, fournisseurs: fournisseurs.filter((f) => f.domaine_id === d.id).sort((a, b) => a.nom.localeCompare(b.nom, "fr")) }));
}
