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

export const DOMAINS = [
  "Aluminium",
  "Vitrage",
  "Ancrages",
  "Panneaux",
  "Étanchéité",
  "Isolation",
  "Quincaillerie",
  "Autre",
] as const;

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

const toRow = (s: Supplier) => ({
  id: s.id,
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

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("name", { ascending: true });
    if (error) {
      console.error("Erreur chargement fournisseurs:", error);
      return;
    }
    setSuppliers((data as Row[]).map(fromRow));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upsert = useCallback(async (s: Supplier) => {
    const row = toRow(s);
    const { error } = await supabase.from("suppliers").upsert(row);
    if (error) {
      console.error("Erreur sauvegarde fournisseur:", error);
      return;
    }
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) {
      console.error("Erreur suppression fournisseur:", error);
      return;
    }
    await refresh();
  }, [refresh]);

  return { suppliers, upsert, remove };
}
