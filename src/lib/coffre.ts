// Coffre des acces fournisseurs : chiffrement dans le navigateur (WebCrypto).
// La phrase secrete ne quitte jamais l'ordinateur ; la base ne voit que du texte chiffre.
//   cle = PBKDF2-SHA256(phrase, sel, 600'000 tours) -> AES-GCM 256 bits
//   bloc = {"v":1,"i":<iv aleatoire base64>,"c":<texte chiffre base64>}

export type Bloc = { v: 1; i: string; c: string };
export type Acces = { identifiant: string; motDePasse: string };

export const TOURS = 600_000;
export const PHRASE_MIN = 12;
const TEMOIN = "access-coffre-ok";
const enc = new TextEncoder();
const dec = new TextDecoder();

export const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
export const deb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export const nouveauSel = () => b64(crypto.getRandomValues(new Uint8Array(16)));

export async function deriverCle(phrase: string, sel: string, tours = TOURS): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", enc.encode(phrase.normalize("NFC")), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: deb64(sel), iterations: tours },
    base,
    { name: "AES-GCM", length: 256 },
    true, // exportable : gardee pour la session de l'onglet (voir lib/coffre-session)
    ["encrypt", "decrypt"],
  );
}

export async function chiffrer(cle: CryptoKey, texte: string): Promise<Bloc> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const c = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cle, enc.encode(texte)));
  return { v: 1, i: b64(iv), c: b64(c) };
}

/** Leve une erreur si la cle n'est pas la bonne (AES-GCM verifie l'integrite). */
export async function dechiffrer(cle: CryptoKey, b: Bloc): Promise<string> {
  const t = await crypto.subtle.decrypt({ name: "AES-GCM", iv: deb64(b.i) }, cle, deb64(b.c));
  return dec.decode(t);
}

export const creerTemoin = (cle: CryptoKey) => chiffrer(cle, TEMOIN);
export async function cleValide(cle: CryptoKey, temoin: Bloc): Promise<boolean> {
  try { return (await dechiffrer(cle, temoin)) === TEMOIN; } catch { return false; }
}

export async function chiffrerAcces(cle: CryptoKey, a: Acces): Promise<Bloc | null> {
  if (!a.identifiant.trim() && !a.motDePasse) return null;
  return chiffrer(cle, JSON.stringify({ identifiant: a.identifiant.trim(), motDePasse: a.motDePasse }));
}
export async function dechiffrerAcces(cle: CryptoKey, b: Bloc): Promise<Acces> {
  const o = JSON.parse(await dechiffrer(cle, b));
  return { identifiant: String(o.identifiant ?? ""), motDePasse: String(o.motDePasse ?? "") };
}

export const exporterCle = async (cle: CryptoKey) => b64(new Uint8Array(await crypto.subtle.exportKey("raw", cle)));
export const importerCle = (raw: string) =>
  crypto.subtle.importKey("raw", deb64(raw), { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
