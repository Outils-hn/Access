import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

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

export type Domain = { id: string; name: string; color: string | null };

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
      .select("id,name,domain,website,cad_website,contact_name,contact_email,contact_phone,notes")
      .order("name", { ascending: true });
    if (error) { console.error(error); setLoading(false); return; }
    setSuppliers((data as Row[]).map(fromRow));
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const upsert = useCallback(async (s: Supplier, accessPassword?: string | null) => {
    const payload = toRowPayload(s);
    let id = s.id;
    if (s.id) {
      const { error } = await supabase.from("suppliers").update(payload).eq("id", s.id);
      if (error) { console.error(error); return; }
    } else {
      const { data, error } = await supabase.from("suppliers").insert(payload).select("id").single();
      if (error) { console.error(error); return; }
      id = (data as { id: string }).id;
    }
    if (accessPassword !== undefined && id) {
      const { error } = await supabase
        .from("supplier_secrets")
        .upsert({ supplier_id: id, access_password: accessPassword ?? "" }, { onConflict: "supplier_id" });
      if (error) console.error("Erreur mot de passe:", error);
    }
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) { console.error(error); return; }
    await refresh();
  }, [refresh]);

  return { suppliers, loading, upsert, remove, refresh };
}

/* ---------- SUPPLIER SECRETS (admin only) ---------- */

export function useSupplierSecrets() {
  const { isAdmin } = useAuth();
  const [secrets, setSecrets] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    if (!isAdmin) { setSecrets({}); return; }
    const { data, error } = await supabase
      .from("supplier_secrets")
      .select("supplier_id,access_password");
    if (error) { console.error(error); return; }
    const map: Record<string, string> = {};
    for (const r of data ?? []) map[r.supplier_id] = r.access_password ?? "";
    setSecrets(map);
  }, [isAdmin]);

  useEffect(() => { refresh(); }, [refresh]);
  return { secrets, refresh };
}

export async function fetchSupplierSecret(supplierId: string): Promise<string> {
  const { data, error } = await supabase
    .from("supplier_secrets")
    .select("access_password")
    .eq("supplier_id", supplierId)
    .maybeSingle();
  if (error) { console.error(error); return ""; }
  return data?.access_password ?? "";
}

/* ---------- DOMAINS ---------- */

export function useDomains() {
  const [domains, setDomains] = useState<Domain[]>([]);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("domains")
      .select("id,name,color")
      .order("name", { ascending: true });
    if (error) { console.error(error); return; }
    setDomains((data ?? []) as Domain[]);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const add = useCallback(async (name: string, color?: string | null): Promise<Domain | null> => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const { data, error } = await supabase
      .from("domains")
      .insert({ name: trimmed, color: color ?? null })
      .select("id,name,color")
      .single();
    if (error) { console.error(error); return null; }
    await refresh();
    return data as Domain;
  }, [refresh]);

  const update = useCallback(async (id: string, patch: Partial<Pick<Domain, "name" | "color">>) => {
    const { error } = await supabase.from("domains").update(patch).eq("id", id);
    if (error) { console.error(error); return; }
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("domains").delete().eq("id", id);
    if (error) { console.error(error); return; }
    await refresh();
  }, [refresh]);

  return { domains, add, update, remove, refresh };
}

/* ---------- EMAIL TEMPLATES ---------- */

export function useEmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("email_templates")
      .select("id,title,subject,body")
      .order("title", { ascending: true });
    if (error) { console.error(error); return; }
    setTemplates((data ?? []) as EmailTemplate[]);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const upsert = useCallback(async (t: Partial<EmailTemplate> & { title: string; subject: string; body: string }) => {
    if (t.id) {
      const { error } = await supabase
        .from("email_templates")
        .update({ title: t.title, subject: t.subject, body: t.body })
        .eq("id", t.id);
      if (error) { console.error(error); return; }
    } else {
      const { error } = await supabase
        .from("email_templates")
        .insert({ title: t.title, subject: t.subject, body: t.body });
      if (error) { console.error(error); return; }
    }
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("email_templates").delete().eq("id", id);
    if (error) { console.error(error); return; }
    await refresh();
  }, [refresh]);

  return { templates, upsert, remove, refresh };
}

/* ---------- DOMAIN COLORS ---------- */

export const DOMAIN_COLOR_PRESETS: { name: string; value: string; className: string }[] = [
  { name: "Bleu",     value: "sky",      className: "bg-sky-300 text-sky-950 border-sky-500/70" },
  { name: "Vert",     value: "emerald",  className: "bg-emerald-300 text-emerald-950 border-emerald-500/70" },
  { name: "Jaune",    value: "amber",    className: "bg-amber-300 text-amber-950 border-amber-500/70" },
  { name: "Violet",   value: "violet",   className: "bg-violet-300 text-violet-950 border-violet-500/70" },
  { name: "Rose",     value: "rose",     className: "bg-rose-300 text-rose-950 border-rose-500/70" },
  { name: "Cyan",     value: "cyan",     className: "bg-cyan-300 text-cyan-950 border-cyan-500/70" },
  { name: "Orange",   value: "orange",   className: "bg-orange-300 text-orange-950 border-orange-500/70" },
  { name: "Fuchsia",  value: "fuchsia",  className: "bg-fuchsia-300 text-fuchsia-950 border-fuchsia-500/70" },
  { name: "Lime",     value: "lime",     className: "bg-lime-300 text-lime-950 border-lime-500/70" },
  { name: "Indigo",   value: "indigo",   className: "bg-indigo-300 text-indigo-950 border-indigo-500/70" },
  { name: "Gris",     value: "slate",    className: "bg-slate-300 text-slate-950 border-slate-500/70" },
  { name: "Rouge",    value: "red",      className: "bg-red-300 text-red-950 border-red-500/70" },
];

function fallbackForName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return DOMAIN_COLOR_PRESETS[h % DOMAIN_COLOR_PRESETS.length].className;
}

export function classFromColorValue(value: string | null | undefined): string | null {
  if (!value) return null;
  return DOMAIN_COLOR_PRESETS.find((p) => p.value === value)?.className ?? null;
}

/** Get tailwind classes for a domain badge. Uses configured color if set, else stable fallback. */
export function domainBadgeClass(domain: { name: string; color?: string | null } | string, allDomains?: Domain[]): string {
  if (typeof domain === "string") {
    const found = allDomains?.find((d) => d.name === domain);
    return classFromColorValue(found?.color ?? null) ?? fallbackForName(domain);
  }
  return classFromColorValue(domain.color ?? null) ?? fallbackForName(domain.name);
}

/** Back-compat alias used by older callers. */
export const domainColor = (name: string) => fallbackForName(name);
