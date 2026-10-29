import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { db } from "@/lib/base";
import { useCompte } from "@/lib/compte";

export type Domaine = { id: string; nom: string; ordre: number };
export type Fournisseur = { id: string; nom: string; domaine_id: string; site: string; site_cao: string; notes: string; updated_at?: string };
export type Acces = { id: string; fournisseur_id: string; proprietaire: string | null; identifiant: string; mot_de_passe: string };
export type Annuaire = { domaines: Domaine[]; fournisseurs: Fournisseur[]; horsLigne?: string };

const COPIE = "access-copie-locale";
const vide: Annuaire = { domaines: [], fournisseurs: [] };

async function charger(): Promise<Annuaire> {
  try {
    const [d, f] = await Promise.all([
      db.from("access_domaines").select("id,nom,ordre").order("ordre").order("nom"),
      db.from("access_fournisseurs").select("id,nom,domaine_id,site,site_cao,notes,updated_at").order("nom"),
    ]);
    const err = d.error || f.error;
    if (err) throw err;
    const a: Annuaire = { domaines: d.data ?? [], fournisseurs: f.data ?? [] };
    // Copie locale SANS les acces : seulement noms, liens et notes
    try { localStorage.setItem(COPIE, JSON.stringify({ ...a, le: new Date().toISOString() })); } catch { /* stockage plein ou bloque */ }
    return a;
  } catch (e) {
    try {
      const raw = localStorage.getItem(COPIE);
      if (raw) { const c = JSON.parse(raw); return { domaines: c.domaines, fournisseurs: c.fournisseurs, horsLigne: c.le }; }
    } catch { /* copie illisible */ }
    throw e;
  }
}

export function useAnnuaire() {
  const q = useQuery({ queryKey: ["access", "annuaire"], queryFn: charger, staleTime: 30_000, retry: 1 });
  return { ...(q.data ?? vide), chargement: q.isLoading, erreur: q.error as Error | null };
}

/** Fournisseur de chaque fiche Index active (meme base : lecture libre), pour le lien « Fiches ». */
export function useFichesIndex() {
  const q = useQuery({
    queryKey: ["access", "fiches-index"],
    staleTime: 5 * 60_000,
    retry: 0,
    queryFn: async () => {
      const { data, error } = await db.from("products").select("supplier").is("deleted_at", null);
      if (error) throw error;
      return ((data ?? []) as { supplier: string | null }[]).map((r) => r.supplier ?? "");
    },
  });
  return q.data ?? [];
}

/** Acces lisibles par le compte connecte : ceux du bureau et les siens (filtre fait par la base). */
export function useAcces() {
  const { uid, valide } = useCompte();
  const q = useQuery({
    queryKey: ["access", "acces", uid],
    enabled: valide,
    queryFn: async () => {
      const { data, error } = await db.from("access_acces").select("id,fournisseur_id,proprietaire,identifiant,mot_de_passe");
      if (error) throw error;
      return (data ?? []) as Acces[];
    },
  });
  const liste = valide ? (q.data ?? []) : [];
  return {
    bureau: (fid: string) => liste.find((a) => a.fournisseur_id === fid && a.proprietaire === null) ?? null,
    perso: (fid: string) => liste.find((a) => a.fournisseur_id === fid && a.proprietaire === uid) ?? null,
  };
}

const OFFLINE = "Base injoignable : vérifiez la connexion, rien n'a été enregistré.";
function message(e: { message?: string; code?: string }) {
  if (/fetch|network|Load failed/i.test(e.message ?? "")) return OFFLINE;
  if (e.code === "42501" || /row-level security/i.test(e.message ?? "")) return "Modification refusée : compte pas encore validé dans Index.";
  if (e.code === "23505") return "Ce nom existe déjà.";
  if (e.code === "23503") return "Ce domaine contient encore des fournisseurs.";
  if (e.code === "23514") return "Valeur refusée : vérifiez les liens (https://…) et la longueur des champs.";
  return "Erreur : " + (e.message ?? "inconnue");
}

/** Ecritures directes : la base refuse tout ce qu'un compte non valide tenterait. */
export function useActions() {
  const qc = useQueryClient();
  const { uid } = useCompte();
  async function run<T>(p: Promise<{ data: T; error: { message?: string; code?: string } | null }>): Promise<T | null> {
    const { data, error } = await p;
    if (error) { toast.error(message(error)); return null; }
    await qc.invalidateQueries({ queryKey: ["access"] });
    return data ?? (true as unknown as T);
  }
  const maintenant = () => new Date().toISOString();

  async function enregistrerAcces(fid: string, perso: boolean, identifiant: string, motDePasse: string, existant: Acces | null) {
    const videe = !identifiant.trim() && !motDePasse;
    if (existant && videe) return run(db.from("access_acces").delete().eq("id", existant.id));
    if (existant) return run(db.from("access_acces").update({ identifiant: identifiant.trim(), mot_de_passe: motDePasse, updated_at: maintenant() }).eq("id", existant.id));
    if (videe) return true;
    return run(db.from("access_acces").insert({ fournisseur_id: fid, proprietaire: perso ? uid : null, identifiant: identifiant.trim(), mot_de_passe: motDePasse }));
  }

  return {
    /** Renvoie l'id du fournisseur, ou null en cas d'echec. */
    enregistrerFournisseur: async (p: Omit<Fournisseur, "id" | "updated_at"> & { id?: string }): Promise<string | null> => {
      const { id, ...champs } = p;
      if (id) return (await run(db.from("access_fournisseurs").update({ ...champs, updated_at: maintenant() }).eq("id", id))) ? id : null;
      const r = await run<{ id: string }>(db.from("access_fournisseurs").insert(champs).select("id").single());
      return r?.id ?? null;
    },
    supprimerFournisseur: (id: string) => run(db.from("access_fournisseurs").delete().eq("id", id)),
    enregistrerDomaine: async (p: { id?: string; nom: string; ordre?: number }): Promise<string | null> => {
      if (p.id) return (await run(db.from("access_domaines").update({ nom: p.nom, ...(p.ordre !== undefined ? { ordre: p.ordre } : {}), updated_at: maintenant() }).eq("id", p.id))) ? p.id : null;
      const r = await run<{ id: string }>(db.from("access_domaines").insert({ nom: p.nom, ordre: p.ordre ?? 999 }).select("id").single());
      return r?.id ?? null;
    },
    supprimerDomaine: (id: string) => run(db.from("access_domaines").delete().eq("id", id)),
    enregistrerAcces,
  };
}

/** Domaines dans l'ordre, chacun avec ses fournisseurs (tries par nom). */
export function grouper(domaines: Domaine[], fournisseurs: Fournisseur[]) {
  return [...domaines]
    .sort((a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom, "fr"))
    .map((d) => ({ domaine: d, fournisseurs: fournisseurs.filter((f) => f.domaine_id === d.id).sort((a, b) => a.nom.localeCompare(b.nom, "fr")) }));
}
