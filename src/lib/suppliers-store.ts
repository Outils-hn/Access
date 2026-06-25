import { useEffect, useState, useCallback } from "react";

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

const KEY = "fournisseurs.v1";

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

const SEED: Supplier[] = [
  {
    id: crypto.randomUUID(),
    name: "Schüco",
    domain: "Aluminium",
    website: "https://www.schueco.com",
    cadWebsite: "https://www.schueco.com/fr/architectes/bim",
    contactName: "Service technique",
    contactEmail: "tech@schueco.fr",
    contactPhone: "+33 1 00 00 00 00",
    notes: "Profilés aluminium pour murs-rideaux et fenêtres.",
  },
  {
    id: crypto.randomUUID(),
    name: "Saint-Gobain Glass",
    domain: "Vitrage",
    website: "https://www.saint-gobain-glass.com",
    cadWebsite: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    notes: "Vitrages isolants et de contrôle solaire.",
  },
  {
    id: crypto.randomUUID(),
    name: "Hilti",
    domain: "Ancrages",
    website: "https://www.hilti.fr",
    cadWebsite: "https://www.hilti.fr/content/hilti/E3/FR/fr/services/tools/bim-cad-library.html",
    contactName: "Support BIM",
    contactEmail: "bim@hilti.fr",
    contactPhone: "",
    notes: "Catalogue BIM complet, calculs de fixations dispo via Profis.",
  },
];

function load(): Supplier[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as Supplier[];
  } catch {
    return [];
  }
}

function save(list: Supplier[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    setSuppliers(load());
  }, []);

  const upsert = useCallback((s: Supplier) => {
    setSuppliers((prev) => {
      const exists = prev.some((p) => p.id === s.id);
      const next = exists ? prev.map((p) => (p.id === s.id ? s : p)) : [...prev, s];
      save(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setSuppliers((prev) => {
      const next = prev.filter((p) => p.id !== id);
      save(next);
      return next;
    });
  }, []);

  return { suppliers, upsert, remove };
}
