import type { Annuaire, Domaine, Fournisseur } from "@/lib/donnees";

// Sauvegarde Access : un fichier JSON avec domaines et fournisseurs (noms, liens, notes).
// Les identifiants des sites n'y sont JAMAIS : un fichier se perd ou se transfere trop facilement.

export type FichierAccess = {
  app: "access"; version: 2; le: string;
  domaines: Pick<Domaine, "nom" | "ordre">[];
  fournisseurs: (Omit<Fournisseur, "id" | "domaine_id" | "updated_at"> & { domaine: string })[];
};

export function exporter(a: Annuaire, maintenant = new Date()): FichierAccess {
  const nomDomaine = new Map(a.domaines.map((d) => [d.id, d.nom]));
  return {
    app: "access", version: 2, le: maintenant.toISOString(),
    domaines: a.domaines.map((d) => ({ nom: d.nom, ordre: d.ordre })),
    fournisseurs: a.fournisseurs.map((f) => ({
      nom: f.nom, domaine: nomDomaine.get(f.domaine_id) ?? "Sans domaine", site: f.site, site_cao: f.site_cao, notes: f.notes,
    })),
  };
}

export const nomFichier = (d = new Date()) => `access-sauvegarde-${d.toISOString().slice(0, 10)}.json`;

export type PlanImport = {
  erreur?: string;
  domainesACreer: { nom: string; ordre: number }[];
  aAjouter: FichierAccess["fournisseurs"];
  aMettreAJour: (FichierAccess["fournisseurs"][number] & { id: string })[];
};

/** Prepare l'import sans rien ecrire : un fournisseur deja present (meme nom) est mis a jour. */
export function planifier(p: unknown, base: Annuaire): PlanImport {
  const vide: PlanImport = { domainesACreer: [], aAjouter: [], aMettreAJour: [] };
  if (!p || typeof p !== "object" || (p as { app?: unknown }).app !== "access") return { ...vide, erreur: "Ce fichier n'est pas une sauvegarde Access." };
  const f = p as FichierAccess;
  if (!Array.isArray(f.domaines) || !Array.isArray(f.fournisseurs)) return { ...vide, erreur: "Sauvegarde abîmée : listes manquantes." };
  if (f.fournisseurs.some((x) => !String(x?.nom ?? "").trim() || !String(x?.domaine ?? "").trim())) return { ...vide, erreur: "Sauvegarde abîmée : un fournisseur n'a pas de nom ou de domaine." };

  const cle = (s: string) => s.trim().toLowerCase();
  const connus = new Set(base.domaines.map((d) => cle(d.nom)));
  const ordreFichier = new Map(f.domaines.map((d) => [cle(d.nom), d.ordre]));
  let suivant = Math.max(0, ...base.domaines.map((d) => d.ordre));
  const domainesACreer: PlanImport["domainesACreer"] = [];
  for (const nom of [...f.domaines.map((d) => d.nom), ...f.fournisseurs.map((x) => x.domaine)].map((s) => s.trim())) {
    if (!nom || connus.has(cle(nom))) continue;
    connus.add(cle(nom));
    domainesACreer.push({ nom, ordre: base.domaines.length ? ++suivant : (ordreFichier.get(cle(nom)) ?? ++suivant) });
  }

  const parNom = new Map(base.fournisseurs.map((x) => [cle(x.nom), x]));
  const aAjouter: PlanImport["aAjouter"] = [];
  const aMettreAJour: PlanImport["aMettreAJour"] = [];
  for (const x of f.fournisseurs) {
    const ligne = { nom: x.nom.trim(), domaine: x.domaine.trim(), site: x.site ?? "", site_cao: x.site_cao ?? "", notes: x.notes ?? "" };
    const existant = parNom.get(cle(x.nom));
    if (existant) aMettreAJour.push({ ...ligne, id: existant.id }); else aAjouter.push(ligne);
  }
  return { domainesACreer, aAjouter, aMettreAJour };
}
