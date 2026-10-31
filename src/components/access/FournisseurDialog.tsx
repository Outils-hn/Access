import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAcces, useActions, useAnnuaire, type Fournisseur } from "@/lib/donnees";
import { emailOk, normaliserUrl, telephoneOk } from "@/lib/recherche";

type Props = { open: boolean; onOpenChange: (o: boolean) => void; initial: Fournisseur | null; domaineParDefaut?: string };
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

export function FournisseurDialog({ open, onOpenChange, initial, domaineParDefaut }: Props) {
  const { domaines } = useAnnuaire();
  const acces = useAcces();
  const { enregistrerFournisseur, enregistrerAcces } = useActions();
  const [nom, setNom] = useState("");
  const [domaine, setDomaine] = useState("");
  const [site, setSite] = useState("");
  const [cao, setCao] = useState("");
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [emailTech, setEmailTech] = useState("");
  const [bureau, setBureau] = useState<Champs>({ identifiant: "", mdp: "" });
  const [perso, setPerso] = useState<Champs>({ identifiant: "", mdp: "" });
  const [busy, setBusy] = useState(false);

  // Remis a zero seulement a l'ouverture : un rechargement des donnees ne doit pas effacer la saisie
  const courant = useRef({ premier: "", acces });
  courant.current = { premier: domaines[0]?.id ?? "", acces };
  useEffect(() => {
    if (!open) return;
    const { premier, acces: a } = courant.current;
    setNom(initial?.nom ?? ""); setDomaine(initial?.domaine_id ?? domaineParDefaut ?? premier);
    setSite(initial?.site ?? ""); setCao(initial?.site_cao ?? ""); setNotes(initial?.notes ?? "");
    setEmail(initial?.email ?? ""); setTelephone(initial?.telephone ?? ""); setEmailTech(initial?.email_technique ?? "");
    const b = initial ? a.bureau(initial.id) : null, p = initial ? a.perso(initial.id) : null;
    setBureau({ identifiant: b?.identifiant ?? "", mdp: b?.mot_de_passe ?? "" });
    setPerso({ identifiant: p?.identifiant ?? "", mdp: p?.mot_de_passe ?? "" });
  }, [open, initial, domaineParDefaut]);

  const contactFaux = !emailOk(email) || !emailOk(emailTech) ? "Email invalide : nom@domaine.ch."
    : !telephoneOk(telephone) ? "Téléphone : chiffres, espaces et + seulement." : "";

  const enregistrer = async () => {
    setBusy(true);
    try {
      const id = await enregistrerFournisseur({ id: initial?.id, nom: nom.trim(), domaine_id: domaine, site: normaliserUrl(site), site_cao: normaliserUrl(cao), notes: notes.trim(),
        email: email.trim(), telephone: telephone.trim(), email_technique: emailTech.trim() });
      if (!id) return;
      const okB = await enregistrerAcces(id, false, bureau.identifiant, bureau.mdp, initial ? acces.bureau(initial.id) : null);
      const okP = await enregistrerAcces(id, true, perso.identifiant, perso.mdp, initial ? acces.perso(initial.id) : null);
      if (okB && okP) onOpenChange(false);
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial ? `Modifier ${initial.nom}` : "Nouveau fournisseur"}</DialogTitle>
          <DialogDescription className="sr-only">Nom, domaine, liens et accès du fournisseur</DialogDescription>
        </DialogHeader>
        <form id="form-fournisseur" className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (nom.trim() && domaine && !contactFaux) enregistrer(); }}>
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
              <Input id="f-site" placeholder="schueco.com" value={site} onChange={(e) => setSite(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-cao">Site CAO</Label>
              <Input id="f-cao" placeholder="facultatif" value={cao} onChange={(e) => setCao(e.target.value)} />
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
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="f-tech">Email du service technique <span className="font-normal text-muted-foreground">(facultatif)</span></Label>
                <Input id="f-tech" type="email" placeholder="technique@fournisseur.ch" value={emailTech} aria-invalid={!emailOk(emailTech) || undefined} onChange={(e) => setEmailTech(e.target.value)} />
              </div>
            </div>
            {contactFaux ? <p role="alert" className="text-xs text-destructive">{contactFaux}</p>
              : <p className="text-xs text-muted-foreground">Coordonnées publiques du fournisseur, visibles par tous (pas de contact nominatif).</p>}
          </fieldset>
          <BlocAcces id="b" titre="Accès du bureau" aide="Visible par tous les comptes validés." v={bureau} set={setBureau} />
          <BlocAcces id="p" titre="Mon accès perso" aide="Visible par vous seul. Laisser vide si vous utilisez celui du bureau." v={perso} set={setPerso} />
          <div className="space-y-1.5">
            <Label htmlFor="f-notes">Notes</Label>
            <Textarea id="f-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button type="submit" form="form-fournisseur" disabled={busy || !nom.trim() || !domaine || !!contactFaux}>{initial ? "Enregistrer" : "Ajouter"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
