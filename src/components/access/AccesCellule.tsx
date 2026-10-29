import { useEffect, useState } from "react";
import { Copy, Eye, EyeOff, Lock } from "lucide-react";
import { toast } from "sonner";
import { dechiffrerAcces, type Acces, type Bloc } from "@/lib/coffre";
import { useCle } from "@/lib/cle-session";
import { ouvrirCoffre } from "./CoffreDialog";

async function copier(texte: string, quoi: string) {
  try { await navigator.clipboard.writeText(texte); toast.success(`${quoi} copié`, { id: "copie" }); }
  catch { toast.error("Copie impossible dans ce navigateur."); }
}

const btn = "inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground";

/** Identifiant et mot de passe d'un fournisseur : masques tant que le coffre est verrouille. */
export function AccesCellule({ bloc, nom }: { bloc: Bloc | null; nom: string }) {
  const cle = useCle();
  const [acces, setAcces] = useState<Acces | null>(null);
  const [erreur, setErreur] = useState(false);
  const [voir, setVoir] = useState(false);

  useEffect(() => {
    let actif = true;
    setAcces(null); setErreur(false); setVoir(false);
    if (cle && bloc) dechiffrerAcces(cle, bloc).then((a) => actif && setAcces(a)).catch(() => actif && setErreur(true));
    return () => { actif = false; };
  }, [cle, bloc]);

  if (!bloc) return <span className="text-muted-foreground">—</span>;
  if (!cle) {
    return (
      <button type="button" onClick={() => ouvrirCoffre("ouvrir")} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground" aria-label={`Afficher l'accès de ${nom}`}>
        <Lock className="size-3.5" /> Accès enregistré
      </button>
    );
  }
  if (erreur) return <span className="text-xs text-destructive">Illisible (autre phrase secrète)</span>;
  if (!acces) return <span className="text-xs text-muted-foreground">…</span>;
  return (
    <div className="inline-grid max-w-full grid-cols-[minmax(0,max-content)_auto] items-center gap-x-2 font-mono text-xs">
      <span className="truncate" title={acces.identifiant}>{acces.identifiant || "—"}</span>
      <span className="flex">
        {acces.identifiant && <button type="button" className={btn} onClick={() => copier(acces.identifiant, "Identifiant")} aria-label={`Copier l'identifiant de ${nom}`}><Copy className="size-3.5" /></button>}
      </span>
      <span className="truncate">{acces.motDePasse ? (voir ? acces.motDePasse : "••••••••") : "—"}</span>
      <span className="flex">
        {acces.motDePasse && (
          <>
            <button type="button" className={btn} onClick={() => setVoir((v) => !v)} aria-label={voir ? "Masquer le mot de passe" : "Voir le mot de passe"}>
              {voir ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
            <button type="button" className={btn} onClick={() => copier(acces.motDePasse, "Mot de passe")} aria-label={`Copier le mot de passe de ${nom}`}><Copy className="size-3.5" /></button>
          </>
        )}
      </span>
    </div>
  );
}
