import { useState, useEffect } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useDomains, type Supplier } from "@/lib/suppliers-store";

type Props = {
  initial?: Supplier | null;
  onSubmit: (s: Supplier) => void;
  onCancel: () => void;
};

const empty: Supplier = {
  id: "",
  name: "",
  domain: "",
  website: "",
  cadWebsite: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  notes: "",
};

export function SupplierForm({ initial, onSubmit, onCancel }: Props) {
  const { domains, add } = useDomains();
  const [form, setForm] = useState<Supplier>(empty);
  const [newDomainOpen, setNewDomainOpen] = useState(false);
  const [newDomain, setNewDomain] = useState("");

  useEffect(() => {
    setForm(initial ?? empty);
  }, [initial]);

  // Preselect first domain when none set and list loaded
  useEffect(() => {
    if (!form.domain && domains.length > 0) {
      setForm((f) => ({ ...f, domain: domains[0].name }));
    }
  }, [domains, form.domain]);

  const set = <K extends keyof Supplier>(k: K, v: Supplier[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.domain) return;
    onSubmit(form);
  };

  const createDomain = async () => {
    const created = await add(newDomain);
    if (created) {
      set("domain", created.name);
      setNewDomain("");
      setNewDomainOpen(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nom du fournisseur *</Label>
          <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="domain">Domaine *</Label>
          <div className="flex gap-2">
            <Select value={form.domain} onValueChange={(v) => set("domain", v)}>
              <SelectTrigger id="domain" className="flex-1"><SelectValue placeholder="Choisir un domaine" /></SelectTrigger>
              <SelectContent>
                {domains.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="button" size="icon" variant="outline" onClick={() => setNewDomainOpen(true)} title="Ajouter un domaine">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Site web principal</Label>
          <Input id="website" type="url" placeholder="https://..." value={form.website} onChange={(e) => set("website", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cad">Site CAO / BIM</Label>
          <Input id="cad" type="url" placeholder="https://..." value={form.cadWebsite ?? ""} onChange={(e) => set("cadWebsite", e.target.value)} />
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Contact</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="cn">Nom</Label>
            <Input id="cn" value={form.contactName ?? ""} onChange={(e) => set("contactName", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ce">Email</Label>
            <Input id="ce" type="email" value={form.contactEmail ?? ""} onChange={(e) => set("contactEmail", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cp">Téléphone</Label>
            <Input id="cp" value={form.contactPhone ?? ""} onChange={(e) => set("contactPhone", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes / Remarques</Label>
        <Textarea id="notes" rows={4} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Annuler</Button>
        <Button type="submit">{initial ? "Enregistrer" : "Ajouter"}</Button>
      </div>

      <Dialog open={newDomainOpen} onOpenChange={setNewDomainOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau domaine</DialogTitle>
            <DialogDescription>Ajoutez un domaine à la liste de référence.</DialogDescription>
          </DialogHeader>
          <Input
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="Ex: Garde-corps"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); createDomain(); } }}
            autoFocus
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setNewDomainOpen(false)}>Annuler</Button>
            <Button type="button" onClick={createDomain} disabled={!newDomain.trim()}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
