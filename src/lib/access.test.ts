import { describe, expect, it } from "vitest";
import { compterFiches, correspond, emailOk, hote, lienDemande, lienTel, normaliserUrl, sansAccents, telephoneOk, urlOk } from "./recherche";
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
  it("refuse une adresse qui n'est pas un site", () => {
    expect(urlOk("")).toBe(true);
    expect(urlOk("schueco.com")).toBe(true);
    expect(urlOk("https://www.schueco.com/ch/fr")).toBe(true);
    expect(urlOk("pas un site")).toBe(false);
    expect(urlOk("pasunsite")).toBe(false);
    expect(urlOk("ftp://a.ch")).toBe(false);
  });
});

const base: Annuaire = {
  domaines: [{ id: "d2", nom: "Acier", ordre: 2 }, { id: "d1", nom: "Menuiserie alu", ordre: 1 }],
  fournisseurs: [
    { id: "f1", nom: "Schüco", domaine_id: "d1", site: "", site_cao: "", notes: "", email: "", telephone: "", email_technique: "" },
    { id: "f2", nom: "Jansen", domaine_id: "d2", site: "", site_cao: "", notes: "", email: "", telephone: "", email_technique: "" },
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

describe("fiches Index", () => {
  it("compte les fiches d'un fournisseur, sans accents ni majuscules", () => {
    const f = ["Schüco International KG", "SCHUCO", "Jansen AG", "", "Flumroc"];
    expect(compterFiches("Schüco", f)).toBe(2);
    expect(compterFiches("Jansen", f)).toBe(1);
    expect(compterFiches("Sika", f)).toBe(0);
    expect(compterFiches("", f)).toBe(0);
  });
});

describe("contact", () => {
  it("valide email et telephone (vides acceptes)", () => {
    expect(emailOk("")).toBe(true);
    expect(emailOk("info@schueco.ch")).toBe(true);
    expect(emailOk("info@schueco")).toBe(false);
    expect(telephoneOk("+41 21 123 45 67")).toBe(true);
    expect(telephoneOk("021/123.45.67")).toBe(true);
    expect(telephoneOk("appeler Marc")).toBe(false);
  });
  it("liens tel: et mailto: avec objet", () => {
    expect(lienTel("+41 (0)21 123 45 67")).toBe("tel:+41211234567");
    expect(lienDemande(" info@a.ch ", "Schüco")).toBe("mailto:info@a.ch?subject=Demande%20d'information%20%E2%80%93%20Sch%C3%BCco");
  });
  it("la recherche trouve aussi l'email", () => {
    expect(correspond({ nom: "X", email: "info@flumroc.ch" }, "Isolation", "flumroc")).toBe(true);
  });
});
