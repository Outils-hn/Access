// Check-up Access dans un vrai navigateur, avec une base Supabase SIMULEE (aucune donnee reelle).
// La simulation reproduit les regles de la base : lecture libre des fournisseurs, acces visibles
// seulement par les comptes valides (ceux du bureau + les siens). Ecrit out/checkup.txt et des captures.
import { chromium } from "playwright";
import { mesures, axe, tabsJusqua, focusVisible, note, tenter, ecrire } from "./audit-lib.mjs";
import fs from "node:fs";

const out = process.argv[2] || "out";
const URL0 = "http://127.0.0.1:8080";
const SB = "https://ngfzwfbraqkdcocdcmib.supabase.co";
const lignes = [];
const ok = (cond, msg) => { lignes.push(`${cond ? "OK" : "ECHEC"} ${msg}`); console.log(`${cond ? "OK" : "ECHEC"} ${msg}`); };

const COMPTES = {
  "alice@exemple.ch": { id: "11111111-1111-4111-8111-111111111111", valide: true },
  "bob@exemple.ch": { id: "22222222-2222-4222-8222-222222222222", valide: true },
  "carl@exemple.ch": { id: "33333333-3333-4333-8333-333333333333", valide: false },
};
const MDP = "Motdepasse-compte";
const parId = (id) => Object.entries(COMPTES).find(([, c]) => c.id === id);

// ---- Base simulee ----
const etat = { access_domaines: [], access_fournisseurs: [], access_acces: [], ecritures: [] };
// Fiches Index (table « products », lecture libre)
const FICHES = [{ supplier: "Schüco International KG" }, { supplier: "SCHUCO" }, { supplier: "Flumroc AG" }];
let n = 0;
const uid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
function seed() {
  const d1 = uid(), d2 = uid(), d3 = uid();
  etat.access_domaines = [{ id: d1, nom: "Menuiserie alu", ordre: 1 }, { id: d2, nom: "Acier", ordre: 2 }, { id: d3, nom: "Isolation", ordre: 3 }];
  etat.access_fournisseurs = [
    { id: uid(), nom: "Schüco", domaine_id: d1, site: "https://www.schueco.com/ch/fr", site_cao: "https://cad.schueco.com", notes: "Délais 6 semaines" },
    { id: uid(), nom: "Jansen", domaine_id: d2, site: "https://www.jansen.com", site_cao: "", notes: "" },
    { id: uid(), nom: "Flumroc", domaine_id: d3, site: "https://www.flumroc.ch", site_cao: "", notes: "Fiches techniques sur le site" },
  ];
}
const utilisateur = (req) => {
  const tok = (req.headers()["authorization"] || "").replace("Bearer ", "");
  return tok.startsWith("tok-") ? tok.slice(4) : null;
};
const valide = (u) => !!u && !!parId(u)?.[1].valide;
const visible = (table, u, row) => table !== "access_acces" || (valide(u) && (row.proprietaire === null || row.proprietaire === u));
const filtreId = (url) => url.searchParams.get("id")?.replace(/^eq\./, "");

async function brancher(ctx) {
  await ctx.route(`${SB}/**`, async (r) => {
    const req = r.request();
    const u = new URL(req.url());
    const moi = utilisateur(req);
    const json = (b, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(b) });
    if (u.pathname === "/auth/v1/token") {
      const { email, password } = JSON.parse(req.postData() || "{}");
      const c = COMPTES[email];
      if (!c || password !== MDP) return json({ error: "invalid_grant", error_description: "Invalid login credentials", msg: "Invalid login credentials", code: "invalid_credentials" }, 400);
      const user = { id: c.id, email, aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
      return json({ access_token: `tok-${c.id}`, token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user });
    }
    if (u.pathname === "/auth/v1/logout") return r.fulfill({ status: 204, body: "" });
    if (u.pathname === "/auth/v1/user") { const e = parId(moi); return e ? json({ id: moi, email: e[0], aud: "authenticated", role: "authenticated" }) : json({ msg: "no" }, 401); }
    if (u.pathname === "/rest/v1/rpc/is_approved") return json(valide(moi));
    const table = u.pathname.replace("/rest/v1/", "");
    if (table === "products") return json(FICHES);
    if (!(table in etat)) return json([]);
    const m = req.method();
    if (m === "GET") return json(etat[table].filter((row) => visible(table, moi, row)));
    // Ecritures : comptes valides seulement, et jamais l'acces perso de quelqu'un d'autre
    if (!valide(moi)) return json({ code: "42501", message: "new row violates row-level security policy" }, 403);
    const corps = req.postData() ? JSON.parse(req.postData()) : null;
    etat.ecritures.push({ table, m, corps, moi });
    const unique = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
    if (m === "POST") {
      const rows = (Array.isArray(corps) ? corps : [corps]).map((x) => ({ id: uid(), ...x }));
      if (table === "access_acces" && rows.some((x) => x.proprietaire !== null && x.proprietaire !== moi)) return json({ code: "42501", message: "row-level security" }, 403);
      etat[table].push(...rows);
      return json(unique ? rows[0] : rows, 201);
    }
    const id = filtreId(u);
    const row = etat[table].find((x) => x.id === id);
    if (!row || !visible(table, moi, row)) return json([], 200);
    if (m === "PATCH") { Object.assign(row, corps); return json([], 200); }
    if (m === "DELETE") {
      etat[table] = etat[table].filter((x) => x.id !== id);
      if (table === "access_fournisseurs") etat.access_acces = etat.access_acces.filter((a) => a.fournisseur_id !== id);
      return r.fulfill({ status: 204, body: "" });
    }
    return json([]);
  });
}

// ---------- Audit UX ----------
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
async function page({ w = 1440, h = 900, dark = false, hors = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, permissions: ["clipboard-read", "clipboard-write"], acceptDownloads: true });
  if (dark) await ctx.addInitScript(() => localStorage.setItem("access-theme", "dark"));
  if (hors) await ctx.route(`${SB}/**`, (r) => r.abort()); else await brancher(ctx);
  const p = await ctx.newPage();
  p.on("pageerror", (e) => note("erreurJS:" + Date.now(), e.message));
  const t0 = Date.now(); await p.goto(URL0, { waitUntil: "networkidle" }); p._chargement = Date.now() - t0; return p;
}
const shot = async (p, nom, pleine = true) => { await p.waitForTimeout(500); await p.screenshot({ path: `${out}/${nom}.png`, fullPage: pleine }); };
const txt = async (p, sel = "body") => (await p.locator(sel).first().innerText().catch(() => "")).replace(/\s+/g, " ");
async function connecter(p, email, mdp = MDP) {
  await p.getByRole("button", { name: "Se connecter" }).first().click(); await p.getByLabel("Email").fill(email); await p.getByLabel("Mot de passe", { exact: true }).fill(mdp);
  await p.getByRole("dialog").getByRole("button", { name: "Se connecter" }).click(); await p.waitForTimeout(1200);
}
let p;
await tenter("base-vide", async () => { p = await page(); await shot(p, "01-base-vide", false); await mesures(p, "vide"); await axe(p, "vide"); note("vide:texte", (await txt(p)).slice(0, 400)); });
seed(); 
p = await page();
await tenter("visiteur", async () => { await shot(p, "02-visiteur"); await mesures(p, "visiteur"); await axe(p, "visiteur"); note("focus", await focusVisible(p)); note("visiteur:texte", (await txt(p)).slice(0, 700)); note("tabs-jusqu-a-recherche", await tabsJusqua(p, () => /recherch/i.test(document.activeElement?.getAttribute("aria-label") || document.activeElement?.placeholder || ""), 40)); });
await tenter("recherche", async () => { const r = p.getByLabel("Rechercher"); for (const [nom, v] of [["accent", "schuco"], ["partiel", "sch"], ["rien", "zzzz"], ["balise", "<b>x</b>"], ["espaces", "  "]]) { await r.fill(v); await p.waitForTimeout(300); note(`recherche:${nom}`, { lignes: await p.locator("tbody tr").count(), texte: (await txt(p, "main, body")).slice(-160) }); await shot(p, `03-recherche-${nom}`, false); } await r.fill(""); });
await tenter("connexion", async () => { await connecter(p, "alice@exemple.ch", "faux"); await shot(p, "04-mauvais-mdp", false); note("mauvais-mdp", (await txt(p, "[role=dialog]")).slice(0, 250)); await p.getByLabel("Mot de passe", { exact: true }).fill(MDP); await p.getByRole("dialog").getByRole("button", { name: "Se connecter" }).click(); await p.waitForTimeout(1200); await shot(p, "05-connecte"); });
await tenter("nouveau-fournisseur", async () => {
  await p.getByRole("button", { name: "Nouveau fournisseur" }).click(); await p.waitForTimeout(400); await shot(p, "06-formulaire", false); note("formulaire:champs", await p.locator("dialog input, [role=dialog] input, [role=dialog] select, [role=dialog] textarea").evaluateAll((els) => els.map((e) => (e.labels?.[0]?.textContent || e.getAttribute("aria-label") || e.placeholder || e.id).trim()).slice(0, 30)));
  await p.getByRole("button", { name: "Ajouter", exact: true }).click().catch(() => {}); await p.waitForTimeout(400); note("formulaire:vide", (await txt(p, "[role=dialog]")).slice(-300)); await shot(p, "06b-formulaire-vide", false);
  await p.getByLabel("Nom *").fill("Sika"); await p.getByLabel("Site", { exact: true }).fill("pas un site"); await p.waitForTimeout(300); note("formulaire:site-invalide", (await txt(p, "[role=dialog]")).slice(-300)); await shot(p, "06c-site-invalide", false);
  await p.getByLabel("Nom *").fill("Schüco"); await p.waitForTimeout(300); note("formulaire:doublon", (await txt(p, "[role=dialog]")).slice(-300)); await shot(p, "06d-doublon", false);
  await p.keyboard.press("Escape");
});
await tenter("volume", async () => {
  const d = etat.access_domaines.map((x) => x.id);
  for (let i = 0; i < 600; i++) etat.access_fournisseurs.push({ id: `f${i}`, nom: `Fournisseur ${String(i).padStart(3, "0")} SA`, domaine_id: d[i % 3], site: `https://exemple${i}.ch`, site_cao: i % 4 ? "" : `https://cao${i}.ch`, notes: i % 7 ? "" : "Délais variables selon la saison" });
  const t0 = Date.now(); await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(800);
  note("volume:600-fournisseurs", { ms: Date.now() - t0, lignes: await p.locator("tbody tr").count() }); await shot(p, "07-volume", false);
  const t1 = Date.now(); await p.getByLabel("Rechercher").fill("fournisseur 42"); await p.waitForTimeout(300); note("volume:recherche-ms", Date.now() - t1);
});
await tenter("sauvegarde", async () => { await p.getByLabel("Rechercher").fill(""); await p.getByRole("button", { name: "Sauvegarde", exact: true }).click(); await p.waitForTimeout(400); await shot(p, "08-sauvegarde", false); note("sauvegarde:texte", (await txt(p, "[role=dialog]")).slice(0, 400)); });
note("boutons", (await p.getByRole("button").allInnerTexts()).map((s) => s.trim()).filter(Boolean).slice(0, 40).join(" | "));
await tenter("hors-ligne", async () => { const h = await page({ hors: true }); await shot(h, "09-hors-ligne", false); note("hors-ligne:texte", (await txt(h)).slice(0, 400)); });
for (const [nom, w, h] of [["mobile", 390, 844], ["tablette", 768, 1024]]) await tenter(nom, async () => { const m = await page({ w, h }); await shot(m, `10-${nom}`); await mesures(m, nom); await axe(m, nom); });
await tenter("sombre", async () => { const d = await page({ dark: true }); await shot(d, "11-sombre", false); await axe(d, "sombre"); });
ecrire(); await b.close();
