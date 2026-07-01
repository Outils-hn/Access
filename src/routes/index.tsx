import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ExternalLink,
  Box,
  Mail,
  Phone,
  Building2,
  MailPlus,
  Settings,
  LogIn,
  LogOut,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


import { useSuppliers, useDomains, useSupplierSecrets, domainBadgeClass, type Supplier } from "@/lib/suppliers-store";
import { SupplierForm } from "@/components/supplier-form";
import { EmailGenerator } from "@/components/email-generator";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Annuaire Fournisseurs — Façade" },
      { name: "description", content: "Gestion des fournisseurs pour dessinateur-projeteur en façade." },
      { property: "og:title", content: "Annuaire fournisseurs — Façade" },
      { property: "og:description", content: "Annuaire interne des fournisseurs façade." },
    ],
  }),
  component: Index,
});

function Index() {
  const { isAdmin, user, signOut } = useAuth();
  const { suppliers, upsert, remove } = useSuppliers();
  const { domains } = useDomains();
  const { secrets, refresh: refreshSecrets } = useSupplierSecrets();
  const [query, setQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [toDelete, setToDelete] = useState<Supplier | null>(null);
  const [mailFor, setMailFor] = useState<Supplier | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return suppliers.filter((s) => {
      if (domainFilter !== "all" && s.domain !== domainFilter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.domain.toLowerCase().includes(q) ||
        (s.contactName ?? "").toLowerCase().includes(q) ||
        (s.notes ?? "").toLowerCase().includes(q)
      );
    });
  }, [suppliers, query, domainFilter]);

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (s: Supplier) => {
    setEditing(s);
    setOpen(true);
  };

  

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Annuaire Fournisseurs</h1>
              <p className="text-xs text-muted-foreground">
                Bureau d'études — Façade {isAdmin ? "· Mode admin" : "· Mode invité (lecture seule)"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <Button asChild variant="outline" className="gap-2">
                  <Link to="/configuration">
                    <Settings className="h-4 w-4" /> Configuration
                  </Link>
                </Button>
                <Button onClick={openNew} className="gap-2">
                  <Plus className="h-4 w-4" /> Nouveau fournisseur
                </Button>
              </>
            )}
            {isAdmin ? (
              <Button variant="outline" className="gap-2" onClick={() => signOut()} title={user?.email ?? ""}>
                <LogOut className="h-4 w-4" /> Déconnexion
              </Button>
            ) : (
              <Button asChild variant="default" className="gap-2">
                <Link to="/auth">
                  <LogIn className="h-4 w-4" /> Connexion admin
                </Link>
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        {!isAdmin && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            Vous êtes en mode invité. Connectez-vous pour ajouter, modifier ou voir les mots de passe d'accès.
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, domaine, contact, note..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={domainFilter} onValueChange={setDomainFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filtrer par domaine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les domaines</SelectItem>
              {domains.map((d) => (
                <SelectItem key={d.id} value={d.name}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="ml-auto">
            {filtered.length} fournisseur{filtered.length > 1 ? "s" : ""}
          </Badge>
        </div>

        <div className="flex flex-col gap-3">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-border bg-card py-16 text-center text-muted-foreground shadow-sm">
              Aucun fournisseur trouvé.
            </div>
          ) : (
            filtered.map((s) => (
              <article
                key={s.id}
                className="group grid grid-cols-1 gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 lg:grid-cols-12 lg:items-center"
              >
                {/* Left: Name + Domain */}
                <div className="min-w-0 lg:col-span-3">
                  <h3 className="truncate text-base font-semibold tracking-tight text-foreground">
                    {s.name}
                  </h3>
                  <div className="mt-1.5">
                    <Badge
                      variant="outline"
                      className={`inline-flex whitespace-nowrap border ${domainBadgeClass(s.domain, domains)} px-2.5 py-0.5 text-xs font-semibold shadow-sm`}
                    >
                      {s.domain}
                    </Badge>
                  </div>
                </div>

                {/* Center col 1: Contact */}
                <div className="min-w-0 lg:col-span-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Contact
                  </div>
                  <div className="mt-1 space-y-0.5 text-sm">
                    {s.contactName && (
                      <div className="truncate font-medium text-foreground">{s.contactName}</div>
                    )}
                    {s.contactEmail && (
                      <a
                        href={`mailto:${s.contactEmail}`}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
                      >
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{s.contactEmail}</span>
                      </a>
                    )}
                    {s.contactPhone && (
                      <a
                        href={`tel:${s.contactPhone}`}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
                      >
                        <Phone className="h-3 w-3 shrink-0" />
                        <span className="truncate">{s.contactPhone}</span>
                      </a>
                    )}
                    {!s.contactName && !s.contactEmail && !s.contactPhone && (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </div>

                {/* Center col 2: Liens & Accès */}
                <div className="min-w-0 lg:col-span-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Liens &amp; Accès
                  </div>
                  <div className="mt-1 flex flex-col gap-1 text-sm">
                    {s.website && (
                      <a
                        href={s.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Site web</span>
                      </a>
                    )}
                    {s.cadWebsite && (
                      <a
                        href={s.cadWebsite}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <Box className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">CAO</span>
                      </a>
                    )}
                    {isAdmin && secrets[s.id] && (
                      <code className="mt-0.5 inline-block max-w-full truncate rounded bg-muted px-2 py-1 font-mono text-xs text-foreground">
                        {secrets[s.id]}
                      </code>
                    )}
                    {!s.website && !s.cadWebsite && !(isAdmin && secrets[s.id]) && (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </div>

                {/* Right: Notes + Actions */}
                <div className="flex min-w-0 items-start gap-3 lg:col-span-3 lg:justify-end">
                  <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                    {s.notes}
                  </p>
                  <div className="flex shrink-0 gap-1 opacity-80 transition-opacity group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setMailFor(s)}
                      aria-label="Générer un mail"
                      title="Générer un mail"
                    >
                      <MailPlus className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(s)} aria-label="Modifier">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setToDelete(s)}
                          aria-label="Supprimer"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {isAdmin && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Modifier le fournisseur" : "Nouveau fournisseur"}</DialogTitle>
              <DialogDescription>Renseignez les informations utiles à votre annuaire technique.</DialogDescription>
            </DialogHeader>
            <SupplierForm
              key={editing?.id ?? "new"}
              initial={editing}
              onSubmit={async (s, pwd) => {
                await upsert(s, pwd);
                await refreshSecrets();
                setOpen(false);
              }}
              onCancel={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {isAdmin && (
        <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce fournisseur ?</AlertDialogTitle>
              <AlertDialogDescription>
                {toDelete?.name} sera définitivement retiré de l'annuaire.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (toDelete) remove(toDelete.id);
                  setToDelete(null);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <Dialog open={!!mailFor} onOpenChange={(o) => !o && setMailFor(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Générer un mail — {mailFor?.name}</DialogTitle>
            <DialogDescription>
              Renseignez le contexte chantier, choisissez un modèle puis copiez ou ouvrez dans Outlook.
            </DialogDescription>
          </DialogHeader>
          {mailFor && <EmailGenerator supplier={mailFor} onClose={() => setMailFor(null)} />}
        </DialogContent>
      </Dialog>
    </main>
  );
}

