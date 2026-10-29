import type { Annuaire, Coffre, Domaine, Fournisseur } from "@/lib/donnees";

// Sauvegarde Access : un fichier JSON avec domaines, fournisseurs et le coffre.
// Les acces y restent CHIFFRES : le fichier ne sert a rien sans la phrase secrete.

export type FichierAccess = {
  app: "access"; version: 1; le: string;
  domaines: Pick<Domaine, "nom" | "ordre">[];
  fournisseurs: (Omit<Fournisseur, "id" | "domaine_id" | "updated_at"> & { domaine: string })[];
  coffre: Coffre;
};

export function exporter(a: Annuaire, maintenant = new Date()): FichierAccess {
  const nomDomaine = new Map(a.domaines.map((d) => [d.id, d.nom]));
  return {
    app: "access", version: 1, le: maintenant.toISOString(),
    domaines: a.domaines.map((d) => ({ nom: d.nom, ordre: d.ordre })),
    fournisseurs: a.fournisseurs.map((f) => ({
      nom: f.nom, domaine: nomDomaine.get(f.domaine_id) ?? "Sans domaine",
      site: f.site, site_cao: f.site_cao, notes: f.notes, acces: f.acces,
    })),
    coffre: a.coffre,
  };
}

export const nomFichier = (d = new Date()) => `access-sauvegarde-${d.toISOString().slice(0, 10)}.json`;

export type PlanImport = {
  erreur?: string;
  domainesACreer: string[];
  aAjouter: FichierAccess["fournisseurs"];
  aMettreAJour: (FichierAccess["fournisseurs"][number] & { id: string })[];
  /** Le coffre du fichier doit etre cree dans la base (base sans coffre). */
  creerCoffre: Coffre;
  /** Acces ignores : le fichier vient d'un autre coffre (autre phrase secrete). */
  accesIgnores: number;
};

/** Prepare l'import sans rien ecrire : un fournisseur deja present (meme nom) est mis a jour. */
export function planifier(p: unknown, base: Annuaire): PlanImport {
  const vide: PlanImport = { domainesACreer: [], aAjouter: [], aMettreAJour: [], creerCoffre: null, accesIgnores: 0 };
  if (!p || typeof p !== "object" || (p as { app?: unknown }).app !== "access") return { ...vide, erreur: "Ce fichier n'est pas une sauvegarde Access." };
  const f = p as FichierAccess;
  if (!Array.isArray(f.domaines) || !Array.isArray(f.fournisseurs)) return { ...vide, erreur: "Sauvegarde abîmée : listes manquantes." };
  const sansNom = f.fournisseurs.find((x) => !String(x?.nom ?? "").trim() || !String(x?.domaine ?? "").trim());
  if (sansNom) return { ...vide, erreur: "Sauvegarde abîmée : un fournisseur n'a pas de nom ou de domaine." };

  const memeCoffre = !!f.coffre && !!base.coffre && f.coffre.sel === base.coffre.sel;
  const creerCoffre = !base.coffre && f.coffre ? f.coffre : null;
  const accesOk = memeCoffre || !!creerCoffre;
  let accesIgnores = 0;

  const cle = (s: string) => s.trim().toLowerCase();
  const domainesBase = new Set(base.domaines.map((d) => cle(d.nom)));
  const domainesACreer = [...new Set([...f.domaines.map((d) => d.nom), ...f.fournisseurs.map((x) => x.domaine)].map((s) => s.trim()))]
    .filter((n) => n && !domainesBase.has(cle(n)));

  const parNom = new Map(base.fournisseurs.map((x) => [cle(x.nom), x]));
  const aAjouter: PlanImport["aAjouter"] = [];
  const aMettreAJour: PlanImport["aMettreAJour"] = [];
  for (const x of f.fournisseurs) {
    const existant = parNom.get(cle(x.nom));
    let acces = x.acces ?? null;
    if (acces && !accesOk) { accesIgnores++; acces = existant?.acces ?? null; }
    const ligne = { nom: x.nom.trim(), domaine: x.domaine.trim(), site: x.site ?? "", site_cao: x.site_cao ?? "", notes: x.notes ?? "", acces };
    if (existant) aMettreAJour.push({ ...ligne, id: existant.id });
    else aAjouter.push(ligne);
  }
  return { domainesACreer, aAjouter, aMettreAJour, creerCoffre, accesIgnores };
}
