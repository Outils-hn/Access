// Check-up Access dans un vrai navigateur, avec une base Supabase SIMULEE (aucune donnee reelle).
// Ecrit out/checkup.txt (lignes OK / ECHEC) et des captures d'ecran.
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";

const out = process.argv[2] || "out";
const URL0 = "http://127.0.0.1:8080";
const SB = "https://kkxqgdljkvuapryqydcx.supabase.co";
const PIN = "1234";
const PHRASE = "tuile lampe gravier hibou";
const lignes = [];
const ok = (cond, msg) => { lignes.push(`${cond ? "OK" : "ECHEC"} ${msg}`); console.log(`${cond ? "OK" : "ECHEC"} ${msg}`); };

// ---- Base simulee (etat partage entre les pages) ----
const etat = { domaines: [], fournisseurs: [], coffre: null, rpc: [] };
let n = 0;
const uid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
function seed() {
  const d1 = uid(), d2 = uid(), d3 = uid();
  etat.domaines = [{ id: d1, nom: "Menuiserie alu", ordre: 1 }, { id: d2, nom: "Acier", ordre: 2 }, { id: d3, nom: "Isolation", ordre: 3 }];
  etat.fournisseurs = [
    { id: uid(), nom: "Schüco", domaine_id: d1, site: "https://www.schueco.com/ch/fr", site_cao: "https://cad.schueco.com", notes: "Délais 6 semaines", acces: null },
    { id: uid(), nom: "Jansen", domaine_id: d2, site: "https://www.jansen.com", site_cao: "", notes: "", acces: null },
    { id: uid(), nom: "Flumroc", domaine_id: d3, site: "https://www.flumroc.ch", site_cao: "", notes: "Fiches techniques sur le site", acces: null },
  ];
}
function rpc(fn, a) {
  etat.rpc.push({ fn, a });
  if (fn === "verify_pin") return { ok: a.p_pin === PIN, error: a.p_pin === PIN ? undefined : "PIN incorrect." };
  if (a.p_pin !== PIN) return { ok: false, error: "PIN incorrect." };
  if (fn === "access_init_coffre") { if (etat.coffre) return { ok: false, error: "Le coffre existe déjà." }; etat.coffre = { sel: a.p_sel, temoin: a.p_temoin }; return { ok: true }; }
  if (fn === "access_save_domaine") {
    const p = a.p;
    if (p.id) { Object.assign(etat.domaines.find((d) => d.id === p.id), { nom: p.nom, ...(p.ordre ? { ordre: p.ordre } : {}) }); return { ok: true, id: p.id }; }
    const id = uid(); etat.domaines.push({ id, nom: p.nom, ordre: etat.domaines.length + 1 }); return { ok: true, id };
  }
  if (fn === "access_save_fournisseur") {
    const p = { ...a.p };
    if (p.id) { Object.assign(etat.fournisseurs.find((f) => f.id === p.id), p); return { ok: true, id: p.id }; }
    p.id = uid(); etat.fournisseurs.push(p); return { ok: true, id: p.id };
  }
  if (fn === "access_delete_fournisseur") { etat.fournisseurs = etat.fournisseurs.filter((f) => f.id !== a.p_id); return { ok: true }; }
  return { ok: false, error: "fonction inconnue " + fn };
}
async function brancher(ctx) {
  await ctx.route(`${SB}/**`, async (r) => {
    const u = new URL(r.request().url());
    const json = (b) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
    if (u.pathname.startsWith("/rest/v1/rpc/")) return json(rpc(u.pathname.split("/").pop(), JSON.parse(r.request().postData() || "{}")));
    if (u.pathname.endsWith("/access_domaines")) return json(etat.domaines);
    if (u.pathname.endsWith("/access_fournisseurs")) return json(etat.fournisseurs);
    if (u.pathname.endsWith("/access_coffre")) return json(etat.coffre ? [etat.coffre] : []);
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
  p.on("console", (m) => m.type() === "error" && !/406|Failed to load resource/.test(m.text()) && lignes.push(`NOTE console : ${m.text().slice(0, 160)}`));
  return p;
}
const shot = async (p, nom) => { await p.waitForTimeout(500); await p.screenshot({ path: `${out}/${nom}.png`, fullPage: true }); };

try {
  // 1. Base vide
  let p = await page();
  await p.goto(URL0); await p.waitForLoadState("networkidle");
  ok(await p.getByText("L'annuaire est vide").isVisible(), "base vide : message d'accueil");
  ok((await p.getAttribute("html", "lang")) === "fr", "langue de la page = fr");
  ok(/Access/.test(await p.title()), `titre : ${await p.title()}`);
  await shot(p, "01-vide");

  // 2. Liste groupee par domaine
  seed();
  await p.reload(); await p.waitForLoadState("networkidle");
  ok((await p.locator("section h2").allTextContents()).map((t) => t.split(" ·")[0]).join("|") === "Menuiserie alu|Acier|Isolation", "fournisseurs groupés par domaine, dans l'ordre");
  await shot(p, "02-liste");
  const rech = p.getByLabel("Rechercher");
  await rech.fill("schuco");
  ok((await p.locator("tbody tr").count()) === 1, "recherche « schuco » trouve Schüco (sans tréma)");
  await rech.fill("delais");
  ok((await p.locator("tbody tr").count()) === 1, "recherche dans les notes, sans accent");
  await rech.press("Escape");
  ok((await p.locator("tbody tr").count()) === 3, "Échap vide la recherche");
  await p.getByRole("button", { name: /^Acier/ }).click();
  ok((await p.locator("tbody tr").count()) === 1, "filtre par puce de domaine");
  await p.getByRole("button", { name: /^Tous/ }).click();
  await p.keyboard.press("/");
  ok(await rech.evaluate((e) => e === document.activeElement), "« / » place le curseur dans la recherche");
  await p.locator("body").click({ position: { x: 5, y: 600 } });

  // 3. Nouveau fournisseur + creation du coffre + PIN
  await p.getByRole("button", { name: "Nouveau fournisseur" }).click();
  await p.getByLabel("Nom *").fill("Sika");
  await p.getByLabel("Site", { exact: true }).fill("sika.ch");
  await p.getByRole("button", { name: "Déverrouiller pour ajouter" }).click();
  ok(await p.getByRole("heading", { name: "Créer le coffre des accès" }).isVisible(), "sans coffre : proposition de le créer");
  await p.getByLabel("Nouvelle phrase secrète").fill("court");
  await p.getByLabel("Confirmer la phrase").fill("court");
  ok(await p.getByRole("button", { name: "Créer le coffre" }).isDisabled(), "phrase trop courte refusée");
  await p.getByLabel("Nouvelle phrase secrète").fill(PHRASE);
  await p.getByLabel("Confirmer la phrase").fill(PHRASE);
  await shot(p, "03-creer-coffre");
  await p.getByRole("button", { name: "Créer le coffre" }).click();
  await p.getByLabel("Code PIN", { exact: true }).fill(PIN);
  await p.getByRole("button", { name: "Déverrouiller", exact: true }).click();
  await p.getByLabel("Identifiant").waitFor({ timeout: 15000 });
  ok(!!etat.coffre, "coffre créé dans la base");
  await p.getByLabel("Identifiant").fill("bureau@exemple.ch");
  await p.getByLabel("Mot de passe", { exact: true }).fill("Motdepasse-42!");
  await shot(p, "04-formulaire");
  await p.getByRole("button", { name: "Ajouter", exact: true }).click();
  await p.getByRole("dialog").waitFor({ state: "detached", timeout: 10000 }).catch(() => {});
  const save = etat.rpc.filter((x) => x.fn === "access_save_fournisseur").pop();
  ok(!!save, "fournisseur envoyé à la base");
  ok(save && !JSON.stringify(save.a).includes("Motdepasse-42") && !JSON.stringify(save.a).includes("bureau@exemple"), "la base ne reçoit NI l'identifiant NI le mot de passe en clair");
  ok(save?.a.p.site === "https://sika.ch", "https:// ajouté au lien collé sans");
  ok(!JSON.stringify(etat).includes(PHRASE), "la phrase secrète n'est jamais envoyée");
  await p.waitForTimeout(800);
  const ligne = p.locator("tr", { hasText: "Sika" });
  ok(await ligne.getByText("bureau@exemple.ch").isVisible(), "identifiant déchiffré et affiché");
  ok(await ligne.getByText("••••••••").isVisible(), "mot de passe masqué par défaut");
  await ligne.getByRole("button", { name: /Copier le mot de passe/ }).click();
  ok((await p.evaluate(() => navigator.clipboard.readText())) === "Motdepasse-42!", "bouton copier : mot de passe dans le presse-papier");
  await shot(p, "05-acces-visibles");
  await p.getByRole("button", { name: "Masquer" }).click();
  ok(await ligne.getByText("Accès enregistré").isVisible(), "« Masquer » referme le coffre");
  await shot(p, "06-acces-masques");

  // 4. Un collegue sur un autre ordinateur (nouvelle session)
  const p2 = await page();
  await p2.goto(URL0); await p2.waitForLoadState("networkidle");
  ok(await p2.getByText("Lecture seule").isVisible(), "nouvelle session : lecture seule");
  await p2.getByRole("button", { name: "Afficher les accès" }).click();
  await p2.getByLabel("Phrase secrète").fill("mauvaise phrase secrete");
  await p2.getByRole("button", { name: "Afficher", exact: true }).click();
  await p2.waitForTimeout(1500);
  ok(await p2.getByText("Phrase secrète incorrecte.").isVisible(), "mauvaise phrase refusée");
  await p2.getByLabel("Phrase secrète").fill(PHRASE);
  await p2.getByRole("button", { name: "Afficher", exact: true }).click();
  await p2.getByText("bureau@exemple.ch").waitFor({ timeout: 15000 }).catch(() => {});
  ok(await p2.getByText("bureau@exemple.ch").isVisible(), "bonne phrase : accès déchiffré sur un autre poste");

  // 5. Domaines, sauvegarde, a propos
  await p2.getByRole("button", { name: "Domaines" }).click();
  await shot(p2, "07-domaines");
  await p2.keyboard.press("Escape");
  await p2.getByRole("button", { name: "Sauvegarde" }).click();
  const dl = p2.waitForEvent("download");
  await p2.getByRole("button", { name: "Télécharger" }).click();
  const fichier = JSON.parse(fs.readFileSync(await (await dl).path(), "utf8"));
  ok(fichier.app === "access" && fichier.fournisseurs.length === 4, "sauvegarde téléchargée (4 fournisseurs)");
  ok(!JSON.stringify(fichier).includes("Motdepasse-42"), "la sauvegarde ne contient pas les mots de passe en clair");
  await p2.keyboard.press("Escape");
  await p2.getByRole("button", { name: /Conçu par/ }).click();
  ok(await p2.getByText("Conçu et développé par Hugo N.").isVisible(), "fenêtre À propos");
  await p2.keyboard.press("Escape");

  // 6. Accessibilite et theme sombre
  const axe = await new AxeBuilder({ page: p2 }).withTags(["wcag2a", "wcag2aa"]).analyze();
  ok(axe.violations.length === 0, `accessibilité : ${axe.violations.length} problème(s)${axe.violations.map((v) => ` [${v.id}: ${v.nodes.length}]`).join("")}`);
  const p3 = await page({ dark: true });
  await p3.goto(URL0); await p3.waitForLoadState("networkidle");
  await shot(p3, "08-sombre");
  const axe2 = await new AxeBuilder({ page: p3 }).withTags(["wcag2a", "wcag2aa"]).analyze();
  ok(axe2.violations.length === 0, `accessibilité (sombre) : ${axe2.violations.length} problème(s)${axe2.violations.map((v) => ` [${v.id}: ${v.nodes.length}]`).join("")}`);

  // 7. Selecteur d'applis
  await p3.getByRole("button", { name: "Changer d'application" }).click();
  ok((await p3.getByRole("menuitem").count()) === 7, "sélecteur : 7 applis");
  await shot(p3, "09-selecteur");
} catch (e) {
  ok(false, `arret du check-up : ${e.message.split("\n")[0]}`);
}
await b.close();
fs.writeFileSync(`${out}/checkup.txt`, lignes.join("\n") + "\n");
