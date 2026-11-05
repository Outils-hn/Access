// Recherche tolerante : sans accents ni majuscules, chaque mot doit apparaitre quelque part.

export const sansAccents = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/ß/g, "ss");

export type Cherchable = { nom: string; notes?: string; site?: string; site_cao?: string; email?: string; contact_nom?: string; contact_prenom?: string; contact_email?: string };

export function correspond(f: Cherchable, domaine: string, q: string): boolean {
  const mots = sansAccents(q).split(/\s+/).filter(Boolean);
  if (!mots.length) return true;
  const texte = sansAccents([f.nom, domaine, f.notes ?? "", hote(f.site), hote(f.site_cao), f.email ?? "", f.contact_nom ?? "", f.contact_prenom ?? "", f.contact_email ?? ""].join(" "));
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

/** Adresse web plausible : un nom de domaine avec un point, sans espace (« pas un site » est refuse). Vide accepte. */
export function urlOk(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  if (/\s/.test(t)) return false;
  try { const u = new URL(normaliserUrl(t)); return /^https?:$/.test(u.protocol) && /^[^.]+(\.[^.]+)+$/.test(u.hostname); } catch { return false; }
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

/** Fournisseurs presents dans les fiches Index mais sans fiche dans l'annuaire (nom tel qu'ecrit dans Index, nombre de fiches). */
export function fournisseursSansFiche(fichesIndex: string[], annuaire: { nom: string }[]): { nom: string; n: number }[] {
  const noms = new Map<string, { nom: string; n: number }>();
  for (const brut of fichesIndex) {
    const nom = (brut ?? "").trim();
    if (!nom) continue;
    const cle = sansAccents(nom);
    const e = noms.get(cle);
    if (e) e.n++; else noms.set(cle, { nom, n: 1 });
  }
  return [...noms.values()]
    .filter((e) => !annuaire.some((f) => compterFiches(f.nom, [e.nom]) > 0))
    .sort((a, b) => sansAccents(a.nom).localeCompare(sansAccents(b.nom)));
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
