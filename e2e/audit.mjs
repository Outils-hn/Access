// Audit Access : parcours dans un navigateur avec base SIMULEE + controles en LECTURE SEULE de la vraie base.
import { chromium } from "playwright";
import fs from "node:fs";
const out = process.argv[2] || "out";
const URL0 = "http://127.0.0.1:8080";
const REF = process.env.SB_REF, KEY = process.env.SB_KEY, SB = `https://${REF}.supabase.co`;
const notes = [];
const log = (s) => { notes.push(s); console.log(s); };

// 1. Vraie base : rien n'est ecrit, aucun compte cree.
async function real(path) {
  try {
    const r = await fetch(SB + path, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    const t = await r.text();
    return { status: r.status, body: t };
  } catch (e) { return { status: 0, body: String(e) }; }
}
const st = await real("/auth/v1/settings");
try {
  const j = JSON.parse(st.body);
  log(`REEL inscription ouverte (disable_signup=false) : ${j.disable_signup === false ? "OUI" : "NON"}`);
  log(`REEL confirmation email automatique (mailer_autoconfirm) : ${j.mailer_autoconfirm}`);
  log(`REEL fournisseurs externes : ${Object.entries(j.external || {}).filter(([, v]) => v).map(([k]) => k).join(", ")}`);
} catch { log(`REEL settings ${st.status} ${st.body.slice(0, 120)}`); }
for (const t of ["suppliers_public?select=id,name,domain,website,cad_website,notes", "suppliers?select=id,contact_email", "supplier_secrets?select=supplier_id", "domains?select=id,name", "email_templates?select=id,title"]) {
  const r = await real(`/rest/v1/${t}`);
  let n = "?";
  try { const j = JSON.parse(r.body); n = Array.isArray(j) ? `${j.length} ligne(s)` : r.body.slice(0, 100); } catch { n = r.body.slice(0, 100); }
  log(`REEL lecture SANS compte ${t.split("?")[0]} : HTTP ${r.status} -> ${n}`);
}

// 2. Parcours avec base simulee
const sup = [
  { id: "1", name: "Schüco", domain: "Menuiserie alu", website: "https://www.schueco.com", cad_website: "https://cad.schueco.com", contact_name: "M. Exemple", contact_email: "contact@exemple.ch", contact_phone: "+41 00 000 00 00", notes: "Délais 6 semaines" },
  { id: "2", name: "Jansen", domain: "Acier", website: "https://www.jansen.com", cad_website: "", contact_name: "", contact_email: "", contact_phone: "", notes: "" },
  { id: "3", name: "Flumroc", domain: "Isolation", website: "https://www.flumroc.ch", cad_website: "", contact_name: "", contact_email: "", contact_phone: "", notes: "Fiches techniques sur le site" },
];
const doms = [{ id: "d1", name: "Menuiserie alu", color: "blue" }, { id: "d2", name: "Acier", color: "slate" }, { id: "d3", name: "Isolation", color: "amber" }];
const b = await chromium.launch();
async function page(admin) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  if (admin) {
    const sess = { access_token: "x.y.z", token_type: "bearer", expires_in: 3600, expires_at: 4102444800, refresh_token: "r", user: { id: "u1", email: "admin@exemple.ch", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01" } };
    await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [`sb-${REF}-auth-token`, JSON.stringify(sess)]);
  }
  await ctx.route(`${SB}/**`, (r) => {
    const u = r.request().url();
    let body = [];
    if (u.includes("/suppliers")) body = sup;
    else if (u.includes("/domains")) body = doms;
    else if (u.includes("/supplier_secrets")) body = [{ supplier_id: "1", access_password: "identifiant / motdepasse" }];
    else if (u.includes("/email_templates")) body = [{ id: "t1", title: "Demande de prix", subject: "Demande", body: "Bonjour" }];
    else if (u.includes("/auth/v1/user")) body = sess_user();
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => log(`ERREUR JS ${e.message}`));
  return p;
}
function sess_user() { return { id: "u1", email: "admin@exemple.ch", aud: "authenticated", role: "authenticated" }; }
async function shot(p, name) { await p.waitForTimeout(800); await p.screenshot({ path: `${out}/${name}.png`, fullPage: true }); log(`capture ${name}`); }

const g = await page(false);
await g.goto(URL0); await g.waitForLoadState("networkidle"); await shot(g, "01-invite");
log(`invite : titre="${await g.title()}" lang=${await g.getAttribute("html", "lang")}`);
await g.goto(URL0 + "/auth"); await shot(g, "02-connexion");
await g.getByText("Créer un compte").click().catch(() => {}); await shot(g, "03-inscription");
await g.goto(URL0 + "/configuration"); await shot(g, "04-configuration-invite");

const a = await page(true);
await a.goto(URL0); await a.waitForLoadState("networkidle"); await shot(a, "05-admin");
await a.getByRole("button", { name: "Nouveau fournisseur" }).click().catch((e) => log("ECHEC nouveau " + e.message)); await shot(a, "06-formulaire");
await a.keyboard.press("Escape");
await a.getByLabel("Générer un mail").first().click().catch(() => {}); await shot(a, "07-mail");
await a.keyboard.press("Escape");
await a.goto(URL0 + "/configuration"); await shot(a, "08-configuration");
// recherche
await a.goto(URL0); await a.waitForLoadState("networkidle");
await a.getByPlaceholder(/Rechercher/).fill("schuco");
log(`recherche "schuco" (sans trema) -> ${await a.locator("article").count()} resultat(s)`);
await a.getByPlaceholder(/Rechercher/).fill("isolation");
log(`recherche "isolation" -> ${await a.locator("article").count()} resultat(s)`);
await b.close();
fs.writeFileSync(`${out}/checkup.txt`, notes.join("\n") + "\n");
