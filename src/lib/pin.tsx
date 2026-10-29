import { useSyncExternalStore, useState, useEffect } from "react";
import { toast } from "sonner";
import { db } from "@/lib/base";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Meme PIN que Masse (meme base). Garde pour la session de l'onglet seulement.
const KEY = "access-pin";
let pin: string | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

function loadPin() {
  if (pin === null && typeof window !== "undefined") {
    try { pin = sessionStorage.getItem(KEY); } catch { /* stockage bloque */ }
  }
}
export function setPin(p: string | null) {
  pin = p;
  try { if (p) sessionStorage.setItem(KEY, p); else sessionStorage.removeItem(KEY); } catch { /* stockage bloque */ }
  emit();
}
export function usePin() {
  return useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => (loadPin(), pin),
    () => null,
  );
}

let resolver: ((v: string | null) => void) | null = null;
let promptOpen = false;
const promptSubs = new Set<() => void>();
export function askPin(): Promise<string | null> {
  promptOpen = true;
  promptSubs.forEach((f) => f());
  return new Promise((r) => (resolver = r));
}

const OFFLINE_MSG = "Base injoignable : vérifiez la connexion, rien n'a été enregistré.";
const isNetwork = (e: { message?: string } | null | undefined) => /fetch|network|Load failed/i.test(e?.message ?? "");

/** Appelle une fonction protegee par le PIN. Renvoie le resultat, ou null si annule / refuse. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function write(fn: string, args: Record<string, unknown>): Promise<any | null> {
  loadPin();
  let p = pin;
  if (!p) {
    p = await askPin();
    if (!p) return null;
  }
  const { data, error } = await db.rpc(fn, { p_pin: p, ...args });
  if (error) {
    toast.error(isNetwork(error) ? OFFLINE_MSG : "Erreur : " + error.message);
    return null;
  }
  if (!data?.ok) {
    if (/PIN|essais/.test(data?.error ?? "")) setPin(null);
    toast.error(data?.error ?? "Échec de la modification.", { id: "pin" });
    return null;
  }
  setPin(p);
  return data;
}

export function PinDialog() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const f = () => setOpen(promptOpen);
    promptSubs.add(f);
    return () => void promptSubs.delete(f);
  }, []);
  const close = (v: string | null) => {
    promptOpen = false;
    setOpen(false);
    setValue("");
    resolver?.(v);
    resolver = null;
  };
  const submit = async () => {
    setBusy(true);
    const { data, error } = await db.rpc("verify_pin", { p_pin: value });
    setBusy(false);
    if (data?.ok) { toast.dismiss("pin"); close(value); }
    else toast.error(error && isNetwork(error) ? OFFLINE_MSG : (data?.error ?? "PIN incorrect."), { id: "pin" });
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close(null)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Code PIN requis</DialogTitle>
          <DialogDescription>Le même PIN que Masse. Il déverrouille les modifications pendant cette session.</DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          type="password"
          inputMode="numeric"
          aria-label="Code PIN"
          className="font-mono"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && value && submit()}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => close(null)}>Annuler</Button>
          <Button disabled={busy || !value} onClick={submit}>Déverrouiller</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
