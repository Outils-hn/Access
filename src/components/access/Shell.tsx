import { useEffect, useState, type ReactNode } from "react";
import { KeyRound, Moon, Sun } from "lucide-react";
import { usePin, setPin } from "@/lib/pin";
import { poserCle, useCle } from "@/lib/cle-session";
import { useAnnuaire } from "@/lib/donnees";
import { SelecteurApplis } from "./SelecteurApplis";
import { AccessMark } from "./AccessMark";
import { AppFooter } from "./AppFooter";
import { ouvrirCoffre } from "./CoffreDialog";

const THEME_KEY = "access-theme";

/** Theme clair / sombre retenu sur l'ordinateur ; la classe est posee avant l'affichage (voir __root.tsx). */
function useTheme() {
  const [dark, setDarkState] = useState(false);
  useEffect(() => {
    let d = false;
    try { d = localStorage.getItem(THEME_KEY) === "dark"; } catch { /* stockage bloque */ }
    document.documentElement.classList.toggle("dark", d);
    setDarkState(d);
  }, []);
  const toggle = () => setDarkState((d) => {
    const next = !d;
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem(THEME_KEY, next ? "dark" : "light"); } catch { /* stockage bloque */ }
    return next;
  });
  return [dark, toggle] as const;
}

const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleString("fr-CH", { dateStyle: "short", timeStyle: "short" }) : "");

export function Shell({ children }: { children: ReactNode }) {
  const pin = usePin();
  const cle = useCle();
  const { coffre, horsLigne } = useAnnuaire();
  const [dark, setDark] = useTheme();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl items-center gap-x-6 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <AccessMark />
            <SelecteurApplis />
            <span className="sr-only">Annuaire des fournisseurs</span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs">
            {cle ? (
              <>
                <span className="status status-open">Accès visibles</span>
                <button className="btn btn-sm" onClick={() => ouvrirCoffre("changer")}>Changer la phrase</button>
                <button className="btn btn-sm" onClick={() => poserCle(null)}>Masquer</button>
              </>
            ) : coffre ? (
              <button className="btn btn-sm" onClick={() => ouvrirCoffre("ouvrir")}><KeyRound className="size-3.5" /> Afficher les accès</button>
            ) : null}
            <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
            {pin ? (
              <>
                <span className="status status-open">Modification déverrouillée</span>
                <button className="btn btn-sm" onClick={() => setPin(null)}>Verrouiller</button>
              </>
            ) : (
              <span className="status">Lecture seule</span>
            )}
            <button onClick={setDark} className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Basculer le thème">
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </div>
        </div>
      </header>
      {horsLigne && (
        <div role="status" className="border-b border-border bg-muted px-4 py-2 text-center text-xs text-foreground">
          Base de données injoignable : affichage de la copie locale du {fmtDate(horsLigne)}, en lecture seule.
        </div>
      )}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
      <AppFooter />
    </div>
  );
}
