import { useSyncExternalStore } from "react";
import { cleValide, deriverCle, exporterCle, importerCle, type Bloc } from "@/lib/coffre";

// Cle du coffre deverrouillee pour la session de l'onglet (effacee a la fermeture ou par « Verrouiller »).
const KEY = "access-cle";
let cle: CryptoKey | null = null;
let chargee = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

async function charger() {
  if (chargee || typeof window === "undefined") return;
  chargee = true;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) { cle = await importerCle(raw); emit(); }
  } catch { /* stockage bloque ou cle abimee */ }
}

export function useCle() {
  void charger();
  return useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => cle, () => null);
}

export async function poserCle(c: CryptoKey | null) {
  cle = c;
  try {
    if (c) sessionStorage.setItem(KEY, await exporterCle(c));
    else sessionStorage.removeItem(KEY);
  } catch { /* stockage bloque : la cle reste en memoire */ }
  emit();
}

/** Renvoie la cle si la phrase est la bonne, sinon null. */
export async function essayerPhrase(phrase: string, coffre: { sel: string; temoin: Bloc }): Promise<CryptoKey | null> {
  const c = await deriverCle(phrase, coffre.sel);
  return (await cleValide(c, coffre.temoin)) ? c : null;
}
