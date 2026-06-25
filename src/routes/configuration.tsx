import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2, Pencil, Tags, Mail, Save, X } from "lucide-react";

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
  useDomains, useEmailTemplates, domainColor,
  type Domain, type EmailTemplate,
} from "@/lib/suppliers-store";

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
  const { domains, add, remove } = useDomains();
  const [name, setName] = useState("");
  const [toDelete, setToDelete] = useState<Domain | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await add(name);
    setName("");
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="flex gap-2 rounded-xl border border-border bg-card p-4">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nouveau domaine (ex: Garde-corps)" />
        <Button type="submit" className="gap-2" disabled={!name.trim()}>
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </form>

      <div className="rounded-xl border border-border bg-card p-4">
        {domains.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Aucun domaine défini.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {domains.map((d) => (
              <div key={d.id} className="group flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-1.5">
                <Badge variant="outline" className={`border ${domainColor(d.name)}`}>{d.name}</Badge>
                <button
                  type="button"
                  onClick={() => setToDelete(d)}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                  aria-label={`Supprimer ${d.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
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
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
          Utilisez les variables <code>{"{numero_chantier}"}</code>, <code>{"{nom_chantier}"}</code>, <code>{"{numero_tache}"}</code>, <code>{"{nom_fournisseur}"}</code>, <code>{"{nom_contact}"}</code>.
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

      <TemplateEditor
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        onSave={async (t) => { await upsert(t); setOpen(false); }}
      />

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
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TemplateEditor({
  open, onOpenChange, initial, onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: EmailTemplate | null;
  onSave: (t: { id?: string; title: string; subject: string; body: string }) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <TemplateEditorBody
          key={initial?.id ?? "new"}
          initial={initial}
          onSave={onSave}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function TemplateEditorBody({
  initial, onSave, onCancel,
}: {
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
        <Button type="button" variant="ghost" onClick={onCancel} className="gap-2">
          <X className="h-4 w-4" /> Annuler
        </Button>
        <Button
          type="button"
          disabled={!title.trim()}
          onClick={() => onSave({ id: initial?.id, title: title.trim(), subject, body })}
          className="gap-2"
        >
          <Save className="h-4 w-4" /> Enregistrer
        </Button>
      </DialogFooter>
    </>
  );
}
