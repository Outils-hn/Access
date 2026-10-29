// Check-up Access dans un vrai navigateur, avec une base Supabase SIMULEE (aucune donnee reelle).
// La simulation reproduit les regles de la base : lecture libre des fournisseurs, acces visibles
// seulement par les comptes valides (ceux du bureau + les siens). Ecrit out/checkup.txt et des captures.
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
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

const b = await chromium.launch();
async function page({ dark = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
  if (dark) await ctx.addInitScript(() => localStorage.setItem("access-theme", "dark"));
  await brancher(ctx);
  const p = await ctx.newPage();
  p.on("pageerror", (e) => ok(false, `erreur JS : ${e.message}`));
  return p;
}
const shot = async (p, nom) => { await p.waitForTimeout(500); await p.screenshot({ path: `${out}/${nom}.png`, fullPage: true }); };
async function seConnecter(p, email, mdp = MDP) {
  await p.getByRole("button", { name: "Se connecter" }).first().click();
  await p.getByLabel("Email").fill(email);
  await p.getByLabel("Mot de passe", { exact: true }).fill(mdp);
  await p.getByRole("dialog").getByRole("button", { name: "Se connecter" }).click();
  await p.waitForTimeout(1200);
}

try {
  // 1. Base vide, visiteur
  let p = await page();
  await p.goto(URL0); await p.waitForLoadState("networkidle");
  ok(await p.getByText("L'annuaire est vide").isVisible(), "base vide : message d'accueil");
  ok((await p.getAttribute("html", "lang")) === "fr", "langue de la page = fr");
  await shot(p, "01-vide");

  // 2. Visiteur : liste lisible, acces caches, pas de modification
  seed();
  await p.reload(); await p.waitForLoadState("networkidle");
  ok((await p.locator("section h2").allTextContents()).map((t) => t.split(" ·")[0]).join("|") === "Menuiserie alu|Acier|Isolation", "fournisseurs groupés par domaine, dans l'ordre");
  ok(await p.getByText("Connexion requise").first().isVisible(), "visiteur : accès remplacés par « Connexion requise »");
  ok(!(await p.getByRole("button", { name: "Nouveau fournisseur" }).count()), "visiteur : pas de bouton d'ajout");
  await shot(p, "02-visiteur");
  const rech = p.getByLabel("Rechercher");
  await rech.fill("schuco");
  ok((await p.locator("tbody tr").count()) === 1, "recherche « schuco » trouve Schüco (sans tréma)");
  const lienFiches = p.locator("tr", { hasText: "Schüco" }).getByRole("link", { name: "2 fiches" });
  ok(await lienFiches.isVisible() && (await lienFiches.getAttribute("href")) === "https://index-hn.lovable.app/?q=Sch%C3%BCco", "lien « 2 fiches » vers Index (recherche Schüco)");
  await rech.press("Escape");
  await p.getByRole("button", { name: /^Acier/ }).click();
  ok((await p.locator("tbody tr").count()) === 1, "filtre par puce de domaine");
  ok(!(await p.locator("tr", { hasText: "Jansen" }).getByRole("link", { name: /fiche/ }).count()), "pas de lien « fiches » sans fiche dans Index");
  await p.getByRole("button", { name: /^Tous/ }).click();

  // 3. Mauvais mot de passe, puis compte en attente
  await seConnecter(p, "carl@exemple.ch", "faux");
  ok(await p.getByText("Email ou mot de passe incorrect.").isVisible(), "mauvais mot de passe : message clair");
  await shot(p, "03-connexion");
  await p.getByLabel("Mot de passe", { exact: true }).fill(MDP);
  await p.getByRole("dialog").getByRole("button", { name: "Se connecter" }).click();
  await p.waitForTimeout(1200);
  ok(await p.getByText("Compte en attente de validation dans Index").isVisible(), "compte non validé : « en attente »");
  ok(!(await p.getByRole("button", { name: "Nouveau fournisseur" }).count()), "compte non validé : pas de modification");
  await p.getByRole("button", { name: "Déconnexion" }).click();
  await p.waitForTimeout(600);

  // 4. Alice (validee) ajoute Sika avec un acces bureau et un acces perso
  await seConnecter(p, "alice@exemple.ch");
  ok(await p.getByText("alice@exemple.ch").isVisible(), "compte validé : email affiché");
  await p.getByRole("button", { name: "Nouveau fournisseur" }).click();
  await p.getByLabel("Nom *").fill("Sika");
  await p.getByLabel("Site", { exact: true }).fill("sika.ch");
  await p.locator("#b-id").fill("bureau@exemple.ch");
  await p.locator("#b-mdp").fill("Bureau-42!");
  await p.locator("#p-id").fill("alice.perso");
  await p.locator("#p-mdp").fill("Alice-perso-7");
  await shot(p, "04-formulaire");
  await p.getByRole("button", { name: "Ajouter", exact: true }).click();
  await p.waitForTimeout(1500);
  const sika = etat.access_fournisseurs.find((f) => f.nom === "Sika");
  ok(!!sika && sika.site === "https://sika.ch", "fournisseur créé, https:// ajouté au lien");
  const accSika = etat.access_acces.filter((a) => a.fournisseur_id === sika?.id);
  ok(accSika.some((a) => a.proprietaire === null && a.identifiant === "bureau@exemple.ch"), "accès bureau enregistré (sans propriétaire)");
  ok(accSika.some((a) => a.proprietaire === COMPTES["alice@exemple.ch"].id && a.identifiant === "alice.perso"), "accès perso enregistré au nom d'Alice");
  const ligne = p.locator("tr", { hasText: "Sika" });
  ok(await ligne.getByText("bureau@exemple.ch").isVisible() && await ligne.getByText("alice.perso").isVisible(), "Alice voit l'accès bureau et le sien");
  ok((await ligne.getByText("••••••••").count()) === 2, "mots de passe masqués par défaut");
  await ligne.getByRole("button", { name: /Copier le mot de passe perso/ }).click();
  ok((await p.evaluate(() => navigator.clipboard.readText())) === "Alice-perso-7", "bouton copier : mot de passe perso dans le presse-papier");
  await shot(p, "05-alice");

  // 5. Bob (autre poste) : voit le bureau, PAS le perso d'Alice ; ajoute le sien sur Schüco
  const p2 = await page();
  await p2.goto(URL0); await p2.waitForLoadState("networkidle");
  await seConnecter(p2, "bob@exemple.ch");
  const ligneB = p2.locator("tr", { hasText: "Sika" });
  ok(await ligneB.getByText("bureau@exemple.ch").isVisible(), "Bob voit l'accès du bureau");
  ok(!(await ligneB.getByText("alice.perso").count()), "Bob ne voit PAS l'accès perso d'Alice");
  await p2.getByRole("button", { name: "Modifier Schüco" }).click();
  await p2.locator("#p-id").fill("bob.schueco");
  await p2.locator("#p-mdp").fill("Bob-1");
  await p2.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await p2.waitForTimeout(1500);
  ok(await p2.locator("tr", { hasText: "Schüco" }).getByText("bob.schueco").isVisible(), "Bob ajoute son accès perso");
  await p.reload(); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1000);
  ok(!(await p.getByText("bob.schueco").count()), "Alice ne voit pas l'accès perso de Bob");
  await shot(p2, "06-bob");

  // 6. Deconnexion : plus aucun acces visible
  await p2.getByRole("button", { name: "Déconnexion" }).click();
  await p2.waitForTimeout(800);
  ok(!(await p2.getByText("bureau@exemple.ch").count()) && await p2.getByText("Connexion requise").first().isVisible(), "après déconnexion : accès masqués");

  // 7. Domaines, sauvegarde, a propos (Alice)
  await p.getByRole("button", { name: "Domaines" }).click();
  await shot(p, "07-domaines");
  await p.keyboard.press("Escape");
  await p.getByRole("button", { name: "Sauvegarde" }).click();
  const dl = p.waitForEvent("download");
  await p.getByRole("button", { name: "Télécharger" }).click();
  const brut = fs.readFileSync(await (await dl).path(), "utf8");
  ok(JSON.parse(brut).fournisseurs.length === 4, "sauvegarde téléchargée (4 fournisseurs)");
  ok(!/Bureau-42|Alice-perso|bureau@exemple|alice\.perso/.test(brut), "la sauvegarde ne contient aucun identifiant ni mot de passe");
  await p.keyboard.press("Escape");
  await p.getByRole("button", { name: /Conçu par/ }).click();
  ok(await p.getByText("Conçu et développé par Hugo N.").isVisible(), "fenêtre À propos");
  await p.keyboard.press("Escape");
  const copie = await p.evaluate(() => localStorage.getItem("access-copie-locale") || "");
  ok(copie.includes("Sika") && !/Bureau-42|Alice-perso/.test(copie), "copie locale hors ligne sans les mots de passe");

  // 8. Accessibilite, theme sombre, selecteur
  await p.waitForTimeout(800); // fin de l'animation de fermeture des fenetres
  const axe = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa"]).analyze();
  ok(axe.violations.length === 0, `accessibilité : ${axe.violations.length} problème(s)${axe.violations.map((v) => ` [${v.id}: ${v.nodes.length}]`).join("")}`);
  const p3 = await page({ dark: true });
  await p3.goto(URL0); await p3.waitForLoadState("networkidle");
  await shot(p3, "08-sombre");
  const axe2 = await new AxeBuilder({ page: p3 }).withTags(["wcag2a", "wcag2aa"]).analyze();
  ok(axe2.violations.length === 0, `accessibilité (sombre) : ${axe2.violations.length} problème(s)${axe2.violations.map((v) => ` [${v.id}: ${v.nodes.length}]`).join("")}`);
  await p3.getByRole("button", { name: "Changer d'application" }).click();
  ok((await p3.getByRole("menuitem").count()) === 7, "sélecteur : 7 applis");
} catch (e) {
  ok(false, `arret du check-up : ${e.message.split("\n")[0]}`);
}
await b.close();
fs.writeFileSync(`${out}/checkup.txt`, lignes.join("\n") + "\n");
