import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DOMAINS, type Supplier } from "@/lib/suppliers-store";

type Props = {
  initial?: Supplier | null;
  onSubmit: (s: Supplier) => void;
  onCancel: () => void;
};

const empty: Supplier = {
  id: "",
  name: "",
  domain: "Aluminium",
  website: "",
  cadWebsite: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  notes: "",
};

export function SupplierForm({ initial, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<Supplier>(empty);

  useEffect(() => {
    setForm(initial ?? empty);
  }, [initial]);

  const set = <K extends keyof Supplier>(k: K, v: Supplier[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.domain) return;
    onSubmit({ ...form, id: form.id || crypto.randomUUID() });
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
          <Select value={form.domain} onValueChange={(v) => set("domain", v)}>
            <SelectTrigger id="domain"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DOMAINS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
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
    </form>
  );
}
