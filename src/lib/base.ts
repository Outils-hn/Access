import { createClient } from "@supabase/supabase-js";

// Access range ses donnees dans le projet Supabase de MASSE (meme PIN pour les modifications).
// Cle publique (« publishable ») : elle ne donne que les droits prevus par les regles de la base,
// c'est-a-dire la lecture et l'appel des fonctions protegees par le PIN.
export const BASE_URL = "https://kkxqgdljkvuapryqydcx.supabase.co";
export const BASE_KEY = "sb_publishable_xAvqc9Z9clDeBJi_MVsh_g_-oRKBSqK";

// Pas de comptes dans Access : aucune session a garder
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: any = createClient(BASE_URL, BASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
