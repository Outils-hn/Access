import { useEffect, useRef, useState } from "react";
import { ChevronDown, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCompte } from "@/lib/compte";
import { ChampSuggestions } from "@/components/access/ChampSuggestions";
import { contactRempli, contactVide, useAcces, useActions, useAnnuaire, type Contact, type Fournisseur } from "@/lib/donnees";
import { emailOk, normaliserUrl, telephoneOk, urlOk } from "@/lib/recherche";

type Props = { open: boolean; onOpenChange: (o: boolean) => void; initial: Fournisseur | null; domaineParDefaut?: string; nomParDefaut?: string };
type Champs = { identifiant: string; mdp: string };

function BlocAcces({ id, titre, aide, v, set }: { id: string; titre: string; aide: string; v: Champs; set: (c: Champs) => void }) {
  const [voir, setVoir] = useState(false);
  return (
    <fieldset className="space-y-2 rounded-lg border border-border p-3">
      <legend className="card-title px-1">{titre}</legend>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-id`}>Identifiant</Label>
          <Input id={`${id}-id`} autoComplete="off" className="font-mono" value={v.identifiant} onChange={(e) => set({ ...v, identifiant: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-mdp`}>Mot de passe</Label>
          <div className="relative">
            <Input id={`${id}-mdp`} type={voir ? "text" : "password"} autoComplete="new-password" className="pr-9 font-mono" value={v.mdp} onChange={(e) => set({ ...v, mdp: e.target.value })} />
            <button type="button" onClick={() => setVoir((x) => !x)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={voir ? "Masquer" : "Afficher"}>
              {voir ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{aide}</p>
    </fieldset>
  );
}

export function FournisseurDialog({ open, onOpenChange, initial, domaineParDefaut, nomParDefaut }: Props) {
  const annuaire = useAnnuaire();
  const { domaines } = annuaire;
  const acces = useAcces();
  const { concepteur } = useCompte();
  const { enregistrerFournisseur, enregistrerAcces } = useActions();
  const [nom, setNom] = useState("");
  const [domaine, setDomaine] = useState("");
  const [site, setSite] = useState("");
  const [cao, setCao] = useState("");
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [cOuvert, setCOuvert] = useState(false);
  const [bureau, setBureau] = useState<Champs>({ identifiant: "", mdp: "" });
  const [perso, setPerso] = useState<Champs>({ identifiant: "", mdp: "" });
  const [busy, setBusy] = useState(false);

  // Remis a zero seulement a l'ouverture : un rechargement des donnees ne doit pas effacer la saisie
  const courant = useRef({ premier: "", acces });
  courant.current = { premier: domaines[0]?.id ?? "", acces };
  useEffect(() => {
    if (!open) return;
    const { premier, acces: a } = courant.current;
    setNom(initial?.nom ?? nomParDefaut ?? ""); setDomaine(initial?.domaine_id ?? domaineParDefaut ?? premier);
    setSite(initial?.site ?? ""); setCao(initial?.site_cao ?? ""); setNotes(initial?.notes ?? "");
    setEmail(initial?.email ?? ""); setTelephone(initial?.telephone ?? ""); setContacts(initial?.contacts?.map((c) => ({ ...c })) ?? []);
    setCOuvert(!!initial?.contacts?.length);
    const b = initial ? a.bureau(initial.id) : null, p = initial ? a.perso(initial.id) : null;
    setBureau({ identifiant: b?.identifiant ?? "", mdp: b?.mot_de_passe ?? "" });
    setPerso({ identifiant: p?.identifiant ?? "", mdp: p?.mot_de_passe ?? "" });
  }, [open, initial, domaineParDefaut, nomParDefaut]);

  const siteFaux = !urlOk(site) ? "Adresse du site invalide : exemple schueco.com." : "";
  const caoFaux = !urlOk(cao) ? "Adresse du site CAO invalide : exemple schueco.com." : "";
  const contactFaux = !emailOk(email) || contacts.some((c) => !emailOk(c.email)) ? "Email invalide : nom@domaine.ch."
    : !telephoneOk(telephone) || contacts.some((c) => !telephoneOk(c.telephone)) ? "Téléphone : chiffres, espaces et + seulement." : "";
  // Propositions de service : les domaines et les services deja saisis chez les autres fournisseurs
  const services = [...new Set([...domaines.map((d) => d.nom), ...annuaire.fournisseurs.flatMap((f) => f.contacts.map((c) => c.service))].filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
  const changer = (i: number, champ: keyof Contact, v: string) => setContacts((l) => l.map((c, j) => (j === i ? { ...c, [champ]: v } : c)));

  const enregistrer = async () => {
    setBusy(true);
    try {
      const id = await enregistrerFournisseur({ id: initial?.id, nom: nom.trim(), domaine_id: domaine, site: normaliserUrl(site), site_cao: normaliserUrl(cao), notes: notes.trim(),
        email: email.trim(), telephone: telephone.trim(), email_technique: initial?.email_technique ?? "",
        contacts: contacts.map((c) => ({ service: c.service.trim(), nom: c.nom.trim(), prenom: c.prenom.trim(), telephone: c.telephone.trim(), email: c.email.trim() })).filter(contactRempli) });
      if (!id) return;
      // Identifiants : reserves au concepteur ; pour les autres comptes, rien n'est lu ni ecrit
      const okB = !concepteur || await enregistrerAcces(id, false, bureau.identifiant, bureau.mdp, initial ? acces.bureau(initial.id) : null);
      const okP = !concepteur || await enregistrerAcces(id, true, perso.identifiant, perso.mdp, initial ? acces.perso(initial.id) : null);
      if (okB && okP) onOpenChange(false);
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto"
        // Echap avec la liste de suggestions ouverte : ferme seulement la liste, pas la fenetre
        onEscapeKeyDown={(e) => { const el = document.activeElement; if (el?.getAttribute("role") === "combobox" && el.getAttribute("aria-expanded") === "true") e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>{initial ? `Modifier ${initial.nom}` : "Nouveau fournisseur"}</DialogTitle>
          <DialogDescription className="sr-only">Nom, domaine, liens et accès du fournisseur</DialogDescription>
        </DialogHeader>
        <form id="form-fournisseur" className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (nom.trim() && domaine && !contactFaux && !siteFaux && !caoFaux) enregistrer(); }}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="f-nom">Nom *</Label>
              <Input id="f-nom" value={nom} onChange={(e) => setNom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-domaine">Domaine *</Label>
              <Select value={domaine || undefined} onValueChange={setDomaine}>
                <SelectTrigger id="f-domaine"><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>{domaines.map((d) => <SelectItem key={d.id} value={d.id}>{d.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-site">Site</Label>
              <Input id="f-site" placeholder="schueco.com" value={site} aria-invalid={!!siteFaux || undefined} aria-describedby={siteFaux ? "f-site-err" : undefined} onChange={(e) => setSite(e.target.value)} />
              {siteFaux && <p id="f-site-err" role="alert" className="text-xs text-destructive">{siteFaux}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-cao">Site CAO</Label>
              <Input id="f-cao" placeholder="facultatif" value={cao} aria-invalid={!!caoFaux || undefined} aria-describedby={caoFaux ? "f-cao-err" : undefined} onChange={(e) => setCao(e.target.value)} />
              {caoFaux && <p id="f-cao-err" role="alert" className="text-xs text-destructive">{caoFaux}</p>}
            </div>
          </div>
          <fieldset className="space-y-2 rounded-lg border border-border p-3">
            <legend className="card-title px-1">Contact général</legend>
            <div className="grid grid-cols-[1fr_11rem] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="f-email">Email</Label>
                <Input id="f-email" type="email" placeholder="info@fournisseur.ch" value={email} aria-invalid={!emailOk(email) || undefined} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-tel">Téléphone</Label>
                <Input id="f-tel" type="tel" placeholder="+41 21 000 00 00" value={telephone} aria-invalid={!telephoneOk(telephone) || undefined} onChange={(e) => setTelephone(e.target.value)} />
              </div>
            </div>
            <details className="group rounded-md border border-border/70 px-3 py-2" open={cOuvert} onToggle={(e) => setCOuvert(e.currentTarget.open)}>
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
                <span>Personnes de contact <span className="font-normal text-muted-foreground">(facultatif)</span></span>
                <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-3 space-y-3">
                {contacts.map((c, i) => (
                  <div key={i} role="group" aria-label={`Personne de contact ${i + 1}`} className="space-y-3 rounded-md border border-border/70 p-3">
                    <div className="flex items-end gap-2">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <Label htmlFor={`c${i}-service`}>Service</Label>
                        <ChampSuggestions id={`c${i}-service`} suggestions={services} placeholder="Bois, Isolation…" valeur={c.service} onChange={(v) => changer(i, "service", v)} />
                      </div>
                      <Button type="button" variant="ghost" size="icon" aria-label={`Retirer la personne de contact ${i + 1}`} title="Retirer cette personne" onClick={() => setContacts((l) => l.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={`c${i}-nom`}>Nom</Label>
                        <Input id={`c${i}-nom`} maxLength={80} value={c.nom} onChange={(e) => changer(i, "nom", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`c${i}-prenom`}>Prénom</Label>
                        <Input id={`c${i}-prenom`} maxLength={80} value={c.prenom} onChange={(e) => changer(i, "prenom", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`c${i}-tel`}>Téléphone</Label>
                        <Input id={`c${i}-tel`} type="tel" value={c.telephone} aria-invalid={!telephoneOk(c.telephone) || undefined} onChange={(e) => changer(i, "telephone", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`c${i}-mail`}>Email</Label>
                        <Input id={`c${i}-mail`} type="email" placeholder="prenom.nom@fournisseur.ch" value={c.email} aria-invalid={!emailOk(c.email) || undefined} onChange={(e) => changer(i, "email", e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => { setContacts((l) => [...l, contactVide()]); }}><Plus className="size-4" /> Ajouter une personne</Button>
              </div>
            </details>
            {contactFaux ? <p role="alert" className="text-xs text-destructive">{contactFaux}</p>
              : <p className="text-xs text-muted-foreground">Coordonnées publiques du fournisseur, visibles par tous.</p>}
          </fieldset>
          {concepteur ? (<>
            <BlocAcces id="b" titre="Accès du bureau" aide="Visible par tous les comptes validés." v={bureau} set={setBureau} />
            <BlocAcces id="p" titre="Mon accès perso" aide="Visible par vous seul. Laisser vide si vous utilisez celui du bureau." v={perso} set={setPerso} />
          </>) : (
            <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">Pour des raisons de sécurité, vous voyez uniquement les accès partagés avec le bureau.</p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="f-notes">Notes</Label>
            <Textarea id="f-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button type="submit" form="form-fournisseur" disabled={busy || !nom.trim() || !domaine || !!contactFaux || !!siteFaux || !!caoFaux}>{initial ? "Enregistrer" : "Ajouter"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
