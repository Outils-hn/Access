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
  "bg-sky-300 text-sky-950 border-sky-500/70",
  "bg-emerald-300 text-emerald-950 border-emerald-500/70",
  "bg-amber-300 text-amber-950 border-amber-500/70",
  "bg-violet-300 text-violet-950 border-violet-500/70",
  "bg-rose-300 text-rose-950 border-rose-500/70",
  "bg-cyan-300 text-cyan-950 border-cyan-500/70",
  "bg-orange-300 text-orange-950 border-orange-500/70",
  "bg-fuchsia-300 text-fuchsia-950 border-fuchsia-500/70",
  "bg-lime-300 text-lime-950 border-lime-500/70",
  "bg-indigo-300 text-indigo-950 border-indigo-500/70",
];

export function domainColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return DOMAIN_PALETTE[h % DOMAIN_PALETTE.length];
}
