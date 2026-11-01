import { useState } from "react";
import { Copy, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import type { Acces } from "@/lib/donnees";

async function copier(texte: string, quoi: string) {
  try { await navigator.clipboard.writeText(texte); toast.success(`${quoi} copié`, { id: "copie" }); }
  catch { toast.error("Copie impossible dans ce navigateur."); }
}

const btn = "inline-flex size-10 shrink-0 sm:size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground";

/** Un acces (bureau ou perso) : identifiant + mot de passe masque, boutons copier. */
function Ligne({ a, etiquette, nom }: { a: Acces; etiquette: string; nom: string }) {
  const [voir, setVoir] = useState(false);
  return (
    <div className="grid grid-cols-[3.25rem_minmax(0,max-content)_auto] items-center gap-x-2">
      <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{etiquette}</span>
      <span className="flex min-w-0 flex-col font-mono text-xs leading-5">
        <span className="truncate" title={a.identifiant}>{a.identifiant || "—"}</span>
        <span className="truncate">{a.mot_de_passe ? (voir ? a.mot_de_passe : "••••••••") : "—"}</span>
      </span>
      <span className="flex flex-col">
        <span className="flex">{a.identifiant && <button type="button" className={btn} onClick={() => copier(a.identifiant, "Identifiant")} aria-label={`Copier l'identifiant ${etiquette.toLowerCase()} de ${nom}`}><Copy className="size-3.5" /></button>}</span>
        <span className="flex">
          {a.mot_de_passe && (
            <>
              <button type="button" className={btn} onClick={() => copier(a.mot_de_passe, "Mot de passe")} aria-label={`Copier le mot de passe ${etiquette.toLowerCase()} de ${nom}`}><Copy className="size-3.5" /></button>
              <button type="button" className={btn} onClick={() => setVoir((v) => !v)} aria-label={voir ? "Masquer le mot de passe" : "Voir le mot de passe"}>
                {voir ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </>
          )}
        </span>
      </span>
    </div>
  );
}

export function AccesCellule({ bureau, perso, nom, connecte }: { bureau: Acces | null; perso: Acces | null; nom: string; connecte: boolean }) {
  if (!connecte) {
    return (
      <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
        Connexion requise
        <button type="button" className="min-h-10 underline underline-offset-2 hover:text-foreground sm:min-h-0" onClick={() => window.dispatchEvent(new Event("access:connexion"))}>Me connecter</button>
      </span>
    );
  }
  if (!bureau && !perso) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="space-y-1.5">
      {bureau && <Ligne a={bureau} etiquette="Bureau" nom={nom} />}
      {perso && <Ligne a={perso} etiquette="Perso" nom={nom} />}
    </div>
  );
}
