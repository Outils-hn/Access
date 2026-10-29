import { describe, expect, it } from "vitest";
import { correspond, hote, normaliserUrl, sansAccents } from "./recherche";
import { chiffrerAcces, cleValide, creerTemoin, dechiffrerAcces, deriverCle, exporterCle, importerCle, nouveauSel } from "./coffre";
import { exporter, planifier } from "./sauvegarde";
import { grouper, type Annuaire } from "./donnees";

describe("recherche", () => {
  it("ignore accents et majuscules", () => {
    expect(sansAccents("Schüco Façade")).toBe("schuco facade");
    expect(correspond({ nom: "Schüco" }, "Menuiserie alu", "schuco")).toBe(true);
    expect(correspond({ nom: "Schüco" }, "Menuiserie alu", "SCHUCO alu")).toBe(true);
    expect(correspond({ nom: "Schüco" }, "Menuiserie alu", "jansen")).toBe(false);
  });
  it("cherche aussi dans le domaine, les notes et l'adresse du site", () => {
    expect(correspond({ nom: "X", notes: "Délais 6 semaines" }, "Acier", "delais")).toBe(true);
    expect(correspond({ nom: "X", site: "https://www.flumroc.ch/fr" }, "Isolation", "flumroc")).toBe(true);
  });
  it("raccourcit et complete les liens", () => {
    expect(hote("https://www.schueco.com/ch/fr")).toBe("schueco.com");
    expect(normaliserUrl("schueco.com")).toBe("https://schueco.com");
    expect(normaliserUrl(" http://a.ch ")).toBe("http://a.ch");
    expect(normaliserUrl("")).toBe("");
  });
});

describe("coffre", () => {
  it("chiffre, dechiffre et reconnait la bonne phrase", async () => {
    const sel = nouveauSel();
    const cle = await deriverCle("une phrase assez longue", sel, 1000);
    const temoin = await creerTemoin(cle);
    expect(await cleValide(cle, temoin)).toBe(true);
    const mauvaise = await deriverCle("une autre phrase longue", sel, 1000);
    expect(await cleValide(mauvaise, temoin)).toBe(false);
    const bloc = await chiffrerAcces(cle, { identifiant: " bureau@exemple.ch ", motDePasse: "s3cret!" });
    expect(bloc).not.toBeNull();
    expect(JSON.stringify(bloc)).not.toContain("s3cret");
    expect(await dechiffrerAcces(cle, bloc!)).toEqual({ identifiant: "bureau@exemple.ch", motDePasse: "s3cret!" });
    await expect(dechiffrerAcces(mauvaise, bloc!)).rejects.toThrow();
  });
  it("ne cree rien pour un acces vide, et la cle survit a l'export", async () => {
    const cle = await deriverCle("une phrase assez longue", nouveauSel(), 1000);
    expect(await chiffrerAcces(cle, { identifiant: " ", motDePasse: "" })).toBeNull();
    const bloc = await chiffrerAcces(cle, { identifiant: "a", motDePasse: "b" });
    const cle2 = await importerCle(await exporterCle(cle));
    expect((await dechiffrerAcces(cle2, bloc!)).motDePasse).toBe("b");
  });
});

const base: Annuaire = {
  domaines: [{ id: "d2", nom: "Acier", ordre: 2 }, { id: "d1", nom: "Menuiserie alu", ordre: 1 }],
  fournisseurs: [
    { id: "f1", nom: "Schüco", domaine_id: "d1", site: "", site_cao: "", notes: "", acces: { v: 1, i: "aaaaaaaa", c: "bbbbbbbb" } },
    { id: "f2", nom: "Jansen", domaine_id: "d2", site: "", site_cao: "", notes: "", acces: null },
  ],
  coffre: { sel: "SEL1SEL1SEL1SEL1", temoin: { v: 1, i: "aaaaaaaa", c: "cccccccc" } },
};

describe("annuaire", () => {
  it("groupe par domaine dans l'ordre choisi", () => {
    expect(grouper(base.domaines, base.fournisseurs).map((g) => [g.domaine.nom, g.fournisseurs.length])).toEqual([["Menuiserie alu", 1], ["Acier", 1]]);
  });
});

describe("sauvegarde", () => {
  it("refuse un fichier etranger", () => {
    expect(planifier({ app: "masse" }, base).erreur).toMatch(/pas une sauvegarde Access/);
  });
  it("reimporte sa propre sauvegarde sans doublon", () => {
    const p = planifier(JSON.parse(JSON.stringify(exporter(base))), base);
    expect(p.erreur).toBeUndefined();
    expect(p.aAjouter).toHaveLength(0);
    expect(p.aMettreAJour.map((x) => x.id).sort()).toEqual(["f1", "f2"]);
    expect(p.domainesACreer).toEqual([]);
    expect(p.accesIgnores).toBe(0);
  });
  it("dans une base vide : cree domaines, fournisseurs et coffre", () => {
    const p = planifier(exporter(base), { domaines: [], fournisseurs: [], coffre: null });
    expect(p.domainesACreer.sort()).toEqual(["Acier", "Menuiserie alu"]);
    expect(p.aAjouter).toHaveLength(2);
    expect(p.creerCoffre?.sel).toBe("SEL1SEL1SEL1SEL1");
  });
  it("ignore les acces venant d'un autre coffre", () => {
    const autre = { ...base, coffre: { sel: "AUTREAUTREAUTRE1", temoin: base.coffre!.temoin }, fournisseurs: [], domaines: [] };
    const p = planifier(exporter(base), autre);
    expect(p.accesIgnores).toBe(1);
    expect(p.aAjouter.every((x) => x.acces === null)).toBe(true);
  });
});
