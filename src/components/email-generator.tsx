import { useMemo, useState } from "react";
import { Copy, Mail, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Supplier } from "@/lib/suppliers-store";

type TemplateId = "devis" | "cao";

const TEMPLATES: Record<TemplateId, { label: string; subject: (c: Ctx) => string; body: (c: Ctx) => string }> = {
  devis: {
    label: "Demande de prix / Devis",
    subject: ({ chantierNum, chantierNom, taskNum }) =>
      `Demande de prix — Chantier ${chantierNum} ${chantierNom} — Tâche ${taskNum}`,
    body: ({ supplierName, contactName, chantierNum, chantierNom, taskNum }) =>
`Bonjour${contactName ? " " + contactName : ""},

Dans le cadre de notre chantier n° ${chantierNum} — ${chantierNom} (Tâche ${taskNum}), nous étudions actuellement les solutions ${supplierName} pour la partie façade.

Pourriez-vous nous transmettre :
  • un devis détaillé selon les éléments en pièce jointe,
  • les délais de fabrication et de livraison sur site,
  • les conditions commerciales applicables.

Restant à votre disposition pour tout complément technique,

Cordialement,`,
  },
  cao: {
    label: "Demande de fichiers CAO / BIM spécifiques",
    subject: ({ chantierNum, chantierNom, taskNum }) =>
      `Demande de fichiers CAO/BIM — Chantier ${chantierNum} ${chantierNom} — Tâche ${taskNum}`,
    body: ({ supplierName, contactName, chantierNum, chantierNom, taskNum }) =>
`Bonjour${contactName ? " " + contactName : ""},

Dans le cadre du chantier n° ${chantierNum} — ${chantierNom} (Tâche ${taskNum}), nous intégrons actuellement les produits ${supplierName} dans nos plans d'exécution façade.

Pourriez-vous nous fournir les ressources techniques suivantes :
  • familles Revit / objets BIM des références retenues,
  • blocs DWG 2D et 3D associés,
  • fiches techniques et carnets de détails à jour.

Merci par avance pour votre retour.

Cordialement,`,
  },
};

type Ctx = {
  supplierName: string;
  contactName?: string;
  chantierNum: string;
  chantierNom: string;
  taskNum: string;
};

export function EmailGenerator({ supplier, onClose }: { supplier: Supplier; onClose: () => void }) {
  const [chantierNum, setChantierNum] = useState("");
  const [chantierNom, setChantierNom] = useState("");
  const [taskNum, setTaskNum] = useState("");
  const [tpl, setTpl] = useState<TemplateId>("devis");
  const [copied, setCopied] = useState(false);

  const ctx: Ctx = {
    supplierName: supplier.name,
    contactName: supplier.contactName,
    chantierNum: chantierNum || "[N° chantier]",
    chantierNom: chantierNom || "[Nom chantier]",
    taskNum: taskNum || "[N° tâche]",
  };

  const subject = useMemo(() => TEMPLATES[tpl].subject(ctx), [tpl, ctx]);
  const body = useMemo(() => TEMPLATES[tpl].body(ctx), [tpl, ctx]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`Objet : ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const mailtoHref = `mailto:${supplier.contactEmail ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="chantierNum">N° de chantier</Label>
          <Input id="chantierNum" value={chantierNum} onChange={(e) => setChantierNum(e.target.value)} placeholder="2025-042" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="chantierNom">Nom du chantier</Label>
          <Input id="chantierNom" value={chantierNom} onChange={(e) => setChantierNom(e.target.value)} placeholder="Tour Horizon" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="taskNum">N° de tâche</Label>
          <Input id="taskNum" value={taskNum} onChange={(e) => setTaskNum(e.target.value)} placeholder="T-12" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Modèle de mail</Label>
        <Select value={tpl} onValueChange={(v) => setTpl(v as TemplateId)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(TEMPLATES) as TemplateId[]).map((k) => (
              <SelectItem key={k} value={k}>{TEMPLATES[k].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Destinataire</Label>
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
          {supplier.contactName && <span className="font-medium">{supplier.contactName} · </span>}
          <span className="text-muted-foreground">{supplier.contactEmail ?? "Aucun email renseigné"}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="subject">Objet</Label>
        <Input id="subject" value={subject} readOnly />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="body">Corps du mail</Label>
        <Textarea id="body" value={body} readOnly rows={14} className="font-mono text-xs leading-relaxed" />
      </div>

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose}>Fermer</Button>
        <Button variant="outline" onClick={handleCopy} className="gap-2">
          {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copié" : "Copier"}
        </Button>
        <Button asChild disabled={!supplier.contactEmail} className="gap-2">
          <a href={mailtoHref}>
            <Mail className="h-4 w-4" /> Ouvrir dans Outlook
          </a>
        </Button>
      </div>
    </div>
  );
}
