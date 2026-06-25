import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Supplier = {
  id: string;
  name: string;
  domain: string;
  website: string;
  cadWebsite?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
};

export type Domain = { id: string; name: string };

export type EmailTemplate = {
  id: string;
  title: string;
  subject: string;
  body: string;
};

type Row = {
  id: string;
  name: string;
  domain: string;
  website: string | null;
  cad_website: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
};

const fromRow = (r: Row): Supplier => ({
  id: r.id,
  name: r.name,
  domain: r.domain,
  website: r.website ?? "",
  cadWebsite: r.cad_website ?? "",
  contactName: r.contact_name ?? "",
  contactEmail: r.contact_email ?? "",
  contactPhone: r.contact_phone ?? "",
  notes: r.notes ?? "",
});

const toRowPayload = (s: Supplier) => ({
  name: s.name,
  domain: s.domain,
  website: s.website ?? "",
  cad_website: s.cadWebsite ?? "",
  contact_name: s.contactName ?? "",
  contact_email: s.contactEmail ?? "",
  contact_phone: s.contactPhone ?? "",
  notes: s.notes ?? "",
});

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("name", { ascending: true });
    if (error) {
      console.error("Erreur chargement fournisseurs:", error);
      setLoading(false);
      return;
    }
    setSuppliers((data as Row[]).map(fromRow));
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const upsert = useCallback(async (s: Supplier) => {
    const payload = toRowPayload(s);
    if (s.id) {
      const { error } = await supabase
        .from("suppliers")
        .update(payload)
        .eq("id", s.id);
      if (error) { console.error("Erreur mise à jour fournisseur:", error); return; }
    } else {
      const { error } = await supabase.from("suppliers").insert(payload);
      if (error) { console.error("Erreur ajout fournisseur:", error); return; }
    }
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) { console.error("Erreur suppression fournisseur:", error); return; }
    await refresh();
  }, [refresh]);

  return { suppliers, loading, upsert, remove, refresh };
}

/* ---------- DOMAINS ---------- */

export function useDomains() {
  const [domains, setDomains] = useState<Domain[]>([]);

  const refresh = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("domains")
      .select("*")
      .order("name", { ascending: true });
    if (error) { console.error("Erreur chargement domaines:", error); return; }
    setDomains((data ?? []) as Domain[]);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const add = useCallback(async (name: string): Promise<Domain | null> => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const { data, error } = await (supabase as any)
      .from("domains")
      .insert({ name: trimmed })
      .select()
      .single();
    if (error) { console.error("Erreur ajout domaine:", error); return null; }
    await refresh();
    return data as Domain;
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    const { error } = await (supabase as any).from("domains").delete().eq("id", id);
    if (error) { console.error("Erreur suppression domaine:", error); return; }
    await refresh();
  }, [refresh]);

  return { domains, add, remove, refresh };
}

/* ---------- EMAIL TEMPLATES ---------- */

export function useEmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);

  const refresh = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("email_templates")
      .select("*")
      .order("title", { ascending: true });
    if (error) { console.error("Erreur chargement modèles:", error); return; }
    setTemplates((data ?? []) as EmailTemplate[]);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const upsert = useCallback(async (t: Partial<EmailTemplate> & { id?: string; title: string; subject: string; body: string }) => {
    if (t.id) {
      const { error } = await (supabase as any)
        .from("email_templates")
        .update({ title: t.title, subject: t.subject, body: t.body })
        .eq("id", t.id);
      if (error) { console.error("Erreur mise à jour modèle:", error); return; }
    } else {
      const { error } = await (supabase as any)
        .from("email_templates")
        .insert({ title: t.title, subject: t.subject, body: t.body });
      if (error) { console.error("Erreur ajout modèle:", error); return; }
    }
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    const { error } = await (supabase as any).from("email_templates").delete().eq("id", id);
    if (error) { console.error("Erreur suppression modèle:", error); return; }
    await refresh();
  }, [refresh]);

  return { templates, upsert, remove, refresh };
}

/* ---------- DOMAIN COLORS (consistent badges) ---------- */

const DOMAIN_PALETTE = [
  "bg-sky-500/15 text-sky-300 border-sky-500/40",
  "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  "bg-amber-500/15 text-amber-300 border-amber-500/40",
  "bg-violet-500/15 text-violet-300 border-violet-500/40",
  "bg-rose-500/15 text-rose-300 border-rose-500/40",
  "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
  "bg-orange-500/15 text-orange-300 border-orange-500/40",
  "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40",
  "bg-lime-500/15 text-lime-300 border-lime-500/40",
  "bg-indigo-500/15 text-indigo-300 border-indigo-500/40",
];

export function domainColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return DOMAIN_PALETTE[h % DOMAIN_PALETTE.length];
}
