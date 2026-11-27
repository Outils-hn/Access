import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sansAccents } from "@/lib/recherche";

/** Champ texte avec suggestions maison (la liste native du navigateur ne suit pas le theme de l'appli). Repris de Check. */
export function ChampSuggestions({ id, valeur, onChange, suggestions, placeholder, maxLength = 60 }: {
  id: string; valeur: string; onChange: (v: string) => void; suggestions: string[]; placeholder?: string; maxLength?: number;
}) {
  const liste_id = useId();
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(-1);
  const mot = sansAccents(valeur.trim());
  const liste = suggestions.filter((s) => sansAccents(s) !== mot && (!mot || sansAccents(s).includes(mot))).slice(0, 6);
  const visible = ouvert && liste.length > 0;
  const choisir = (s: string) => { onChange(s); setOuvert(false); setActif(-1); };

  return (
    <div className="relative">
      <Input
        id={id} maxLength={maxLength} placeholder={placeholder} value={valeur} autoComplete="off"
        role="combobox" aria-expanded={visible} aria-controls={liste_id} aria-autocomplete="list"
        aria-activedescendant={visible && actif >= 0 ? `${liste_id}-${actif}` : undefined}
        onChange={(e) => { onChange(e.target.value); setOuvert(true); setActif(-1); }}
        onFocus={() => setOuvert(true)}
        onBlur={() => setOuvert(false)}
        onKeyDown={(e) => {
          if (!visible) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActif((a) => (a + 1) % liste.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActif((a) => (a <= 0 ? liste.length - 1 : a - 1)); }
          else if (e.key === "Enter" && actif >= 0) { e.preventDefault(); e.stopPropagation(); choisir(liste[actif]); }
          // Echap ferme la liste sans fermer la fenetre
          else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setOuvert(false); }
        }}
      />
      {visible && (
        <ul id={liste_id} role="listbox" className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          {liste.map((s, i) => (
            <li key={s} id={`${liste_id}-${i}`} role="option" aria-selected={i === actif}
              // mouseDown (pas click) : le champ perd le focus avant le click et la liste se fermerait
              onMouseDown={(e) => { e.preventDefault(); choisir(s); }} onMouseEnter={() => setActif(i)}
              className={cn("cursor-pointer rounded-sm px-2 py-1.5 text-sm", i === actif && "bg-accent text-accent-foreground")}>
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
