import { describe, expect, it } from "vitest";
import { correspond, hote, normaliserUrl, sansAccents } from "./recherche";
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

const base: Annuaire = {
  domaines: [{ id: "d2", nom: "Acier", ordre: 2 }, { id: "d1", nom: "Menuiserie alu", ordre: 1 }],
  fournisseurs: [
    { id: "f1", nom: "Schüco", domaine_id: "d1", site: "", site_cao: "", notes: "" },
    { id: "f2", nom: "Jansen", domaine_id: "d2", site: "", site_cao: "", notes: "" },
  ],
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
  });
  it("dans une base vide : cree domaines (ordre du fichier) et fournisseurs", () => {
    const p = planifier(exporter(base), { domaines: [], fournisseurs: [] });
    expect(p.domainesACreer).toEqual([{ nom: "Acier", ordre: 2 }, { nom: "Menuiserie alu", ordre: 1 }]);
    expect(p.aAjouter).toHaveLength(2);
  });
  it("ne contient jamais d'acces", () => {
    expect(JSON.stringify(exporter(base))).not.toMatch(/mot_de_passe|identifiant/);
  });
});
