// Recherche tolerante : sans accents ni majuscules, chaque mot doit apparaitre quelque part.

export const sansAccents = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/ß/g, "ss");

export type Cherchable = { nom: string; notes?: string; site?: string; site_cao?: string; email?: string; email_technique?: string };

export function correspond(f: Cherchable, domaine: string, q: string): boolean {
  const mots = sansAccents(q).split(/\s+/).filter(Boolean);
  if (!mots.length) return true;
  const texte = sansAccents([f.nom, domaine, f.notes ?? "", hote(f.site), hote(f.site_cao), f.email ?? "", f.email_technique ?? ""].join(" "));
  return mots.every((m) => texte.includes(m));
}

/** « https://www.schueco.com/ch/fr » -> « schueco.com » : affichage court d'un lien. */
export function hote(url?: string): string {
  if (!url) return "";
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

/** Ajoute https:// quand on colle « schueco.com ». */
export function normaliserUrl(s: string): string {
  const t = s.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

/** Nombre de fiches Index d'un fournisseur : tous les mots de son nom dans le champ « fournisseur » de la fiche. */
export function compterFiches(nom: string, fournisseursDesFiches: string[]): number {
  const mots = sansAccents(nom).split(/[\s\-–&.,()]+/).filter((m) => m.length > 1);
  if (!mots.length) return 0;
  return fournisseursDesFiches.filter((s) => {
    const t = sansAccents(s ?? "");
    return mots.every((m) => t.includes(m));
  }).length;
}

/** Email plausible (vide accepte : le champ est facultatif). */
export const emailOk = (s: string) => !s.trim() || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.trim());
/** Telephone : chiffres, espaces, +, (), point, tiret, barre. */
export const telephoneOk = (s: string) => /^[0-9+()./ -]*$/.test(s.trim()) && s.trim().length <= 30;
/** Lien tel: sans espaces ni ponctuation (« +41 21 123 45 67 » -> « tel:+41211234567 »). */
export const lienTel = (s: string) => `tel:${s.replace(/\(0\)/g, "").replace(/[^0-9+]/g, "")}`;
/** Email avec objet pre-rempli pour une demande d'information. */
export const lienDemande = (email: string, fournisseur: string) =>
  `mailto:${email.trim()}?subject=${encodeURIComponent(`Demande d'information – ${fournisseur}`)}`;
