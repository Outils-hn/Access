import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, Pencil, Tags, Mail, Save, X, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

import {
  useDomains, useEmailTemplates, domainBadgeClass, DOMAIN_COLOR_PRESETS,
  type Domain, type EmailTemplate,
} from "@/lib/suppliers-store";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/configuration")({
  head: () => ({
    meta: [
      { title: "Configuration — Annuaire fournisseurs" },
      { name: "description", content: "Gérez les domaines et les modèles de mails utilisés par l'annuaire." },
    ],
  }),
  component: ConfigurationPage,
});

function ConfigurationPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/auth" });
  }, [loading, isAdmin, navigate]);

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <p className="text-sm text-muted-foreground">Connexion requise…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-6">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Configuration</h1>
            <p className="text-xs text-muted-foreground">Domaines et modèles de mails</p>
          </div>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/"><ArrowLeft className="h-4 w-4" /> Retour à l'annuaire</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-8">
        <Tabs defaultValue="domains">
          <TabsList>
            <TabsTrigger value="domains" className="gap-2"><Tags className="h-4 w-4" /> Domaines</TabsTrigger>
            <TabsTrigger value="templates" className="gap-2"><Mail className="h-4 w-4" /> Modèles d'emails</TabsTrigger>
          </TabsList>
          <TabsContent value="domains" className="mt-6"><DomainsManager /></TabsContent>
          <TabsContent value="templates" className="mt-6"><TemplatesManager /></TabsContent>
        </Tabs>
      </section>
    </main>
  );
}

function DomainsManager() {
  const { domains, add, update, remove } = useDomains();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("sky");
  const [toDelete, setToDelete] = useState<Domain | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await add(name, color);
    setName("");
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex-1 min-w-[200px] space-y-1.5">
          <Label htmlFor="dom-name">Nouveau domaine</Label>
          <Input id="dom-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Garde-corps" />
        </div>
        <div className="space-y-1.5">
          <Label>Couleur</Label>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <Button type="submit" className="gap-2" disabled={!name.trim()}>
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </form>

      <div className="space-y-2 rounded-xl border border-border bg-card p-4">
        {domains.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Aucun domaine défini.</p>
        ) : (
          domains.map((d) => (
            <DomainRow key={d.id} domain={d}
              onUpdate={(patch) => update(d.id, patch)}
              onDelete={() => setToDelete(d)} />
          ))
        )}
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce domaine ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les fournisseurs liés conserveront le nom du domaine, mais il ne sera plus proposé dans les listes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (toDelete) remove(toDelete.id); setToDelete(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DomainRow({ domain, onUpdate, onDelete }: {
  domain: Domain;
  onUpdate: (patch: Partial<Pick<Domain, "name" | "color">>) => void | Promise<void>;
  onDelete: () => void;
}) {
  const [name, setName] = useState(domain.name);
  const [color, setColor] = useState<string>(domain.color ?? "sky");
  const dirty = name !== domain.name || color !== (domain.color ?? "sky");

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/20 p-3">
      <Badge variant="outline"
             className={`border ${domainBadgeClass({ name, color })} px-3 py-1 text-xs font-semibold`}>
        {name || "—"}
      </Badge>
      <Input value={name} onChange={(e) => setName(e.target.value)} className="w-48" />
      <ColorPicker value={color} onChange={setColor} />
      <div className="ml-auto flex gap-1">
        {dirty && (
          <Button size="sm" variant="default" className="gap-1"
                  onClick={() => onUpdate({ name: name.trim(), color })}>
            <Check className="h-4 w-4" /> Enregistrer
          </Button>
        )}
        <Button size="icon" variant="ghost" onClick={onDelete}
                className="text-destructive hover:text-destructive" aria-label="Supprimer">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {DOMAIN_COLOR_PRESETS.map((p) => {
        const selected = p.value === value;
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            title={p.name}
            aria-label={p.name}
            className={`h-7 w-7 rounded-full border-2 transition-transform ${p.className} ${
              selected ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110" : "opacity-80 hover:opacity-100"
            }`}
          />
        );
      })}
    </div>
  );
}

function TemplatesManager() {
  const { templates, upsert, remove } = useEmailTemplates();
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<EmailTemplate | null>(null);

  const startNew = () => { setEditing(null); setOpen(true); };
  const startEdit = (t: EmailTemplate) => { setEditing(t); setOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Variables : <code>{"{numero_chantier}"}</code>, <code>{"{nom_chantier}"}</code>, <code>{"{numero_tache}"}</code>, <code>{"{nom_fournisseur}"}</code>, <code>{"{nom_contact}"}</code>.
        </p>
        <Button onClick={startNew} className="gap-2"><Plus className="h-4 w-4" /> Nouveau modèle</Button>
      </div>

      <div className="space-y-3">
        {templates.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Aucun modèle défini.
          </p>
        ) : templates.map((t) => (
          <div key={t.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-foreground">{t.title}</h3>
                <p className="mt-1 truncate text-xs text-muted-foreground">{t.subject}</p>
                <pre className="mt-2 max-h-32 overflow-hidden whitespace-pre-wrap text-xs text-muted-foreground/90">{t.body}</pre>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="icon" variant="ghost" onClick={() => startEdit(t)} aria-label="Modifier">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setToDelete(t)} aria-label="Supprimer"
                        className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <TemplateEditorBody
            key={editing?.id ?? "new"}
            initial={editing}
            onSave={async (t) => { await upsert(t); setOpen(false); }}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce modèle ?</AlertDialogTitle>
            <AlertDialogDescription>« {toDelete?.title} » sera retiré.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (toDelete) remove(toDelete.id); setToDelete(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TemplateEditorBody({ initial, onSave, onCancel }: {
  initial: EmailTemplate | null;
  onSave: (t: { id?: string; title: string; subject: string; body: string }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [body, setBody] = useState(initial?.body ?? "");

  return (
    <>
      <DialogHeader>
        <DialogTitle>{initial ? "Modifier le modèle" : "Nouveau modèle"}</DialogTitle>
        <DialogDescription>
          Variables : <code>{"{numero_chantier}"}</code>, <code>{"{nom_chantier}"}</code>, <code>{"{numero_tache}"}</code>, <code>{"{nom_fournisseur}"}</code>, <code>{"{nom_contact}"}</code>
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="t-title">Titre</Label>
          <Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-subject">Objet</Label>
          <Input id="t-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-body">Corps du mail</Label>
          <Textarea id="t-body" rows={12} value={body} onChange={(e) => setBody(e.target.value)} className="font-mono text-xs" />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel} className="gap-2"><X className="h-4 w-4" /> Annuler</Button>
        <Button type="button" disabled={!title.trim()}
                onClick={() => onSave({ id: initial?.id, title: title.trim(), subject, body })} className="gap-2">
          <Save className="h-4 w-4" /> Enregistrer
        </Button>
      </DialogFooter>
    </>
  );
}
