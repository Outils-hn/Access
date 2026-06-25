import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, ExternalLink, Box, Mail, Phone, Building2, MailPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { DOMAINS, useSuppliers, type Supplier } from "@/lib/suppliers-store";
import { SupplierForm } from "@/components/supplier-form";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Annuaire fournisseurs — Façade" },
      { name: "description", content: "Gestion des fournisseurs pour dessinateur-projeteur en façade." },
      { property: "og:title", content: "Annuaire fournisseurs — Façade" },
      { property: "og:description", content: "Annuaire interne des fournisseurs façade : aluminium, vitrage, ancrages, panneaux." },
    ],
  }),
  component: Index,
});

function Index() {
  const { suppliers, upsert, remove } = useSuppliers();
  const [query, setQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [toDelete, setToDelete] = useState<Supplier | null>(null);

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

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (s: Supplier) => { setEditing(s); setOpen(true); };

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/40 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Annuaire Fournisseurs</h1>
              <p className="text-xs text-muted-foreground">Bureau d'études — Façade</p>
            </div>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> Nouveau fournisseur
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
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
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrer par domaine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les domaines</SelectItem>
              {DOMAINS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="ml-auto">
            {filtered.length} fournisseur{filtered.length > 1 ? "s" : ""}
          </Badge>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Fournisseur</TableHead>
                <TableHead>Domaine</TableHead>
                <TableHead>Liens</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="max-w-[280px]">Notes</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
                    Aucun fournisseur trouvé.
                  </TableCell>
                </TableRow>
              ) : filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-primary/30 text-primary">{s.domain}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {s.website && (
                        <a href={s.website} target="_blank" rel="noreferrer"
                           className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                          <ExternalLink className="h-3.5 w-3.5" /> Site web
                        </a>
                      )}
                      {s.cadWebsite && (
                        <a href={s.cadWebsite} target="_blank" rel="noreferrer"
                           className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                          <Box className="h-3.5 w-3.5" /> CAO / BIM
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5 text-sm">
                      {s.contactName && <div>{s.contactName}</div>}
                      {s.contactEmail && (
                        <a href={`mailto:${s.contactEmail}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                          <Mail className="h-3 w-3" />{s.contactEmail}
                        </a>
                      )}
                      {s.contactPhone && (
                        <a href={`tel:${s.contactPhone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                          <Phone className="h-3 w-3" />{s.contactPhone}
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[280px]">
                    <p className="line-clamp-2 text-sm text-muted-foreground">{s.notes}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(s)} aria-label="Modifier">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setToDelete(s)} aria-label="Supprimer"
                              className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le fournisseur" : "Nouveau fournisseur"}</DialogTitle>
            <DialogDescription>
              Renseignez les informations utiles à votre annuaire technique.
            </DialogDescription>
          </DialogHeader>
          <SupplierForm
            initial={editing}
            onSubmit={(s) => { upsert(s); setOpen(false); }}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>

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
              onClick={() => { if (toDelete) remove(toDelete.id); setToDelete(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
