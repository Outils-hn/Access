// Recherche tolerante : sans accents ni majuscules, chaque mot doit apparaitre quelque part.

export const sansAccents = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/ß/g, "ss");

export type Cherchable = { nom: string; notes?: string; site?: string; site_cao?: string };

export function correspond(f: Cherchable, domaine: string, q: string): boolean {
  const mots = sansAccents(q).split(/\s+/).filter(Boolean);
  if (!mots.length) return true;
  const texte = sansAccents([f.nom, domaine, f.notes ?? "", hote(f.site), hote(f.site_cao)].join(" "));
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
