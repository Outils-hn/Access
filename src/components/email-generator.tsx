import { useEffect, useMemo, useState } from "react";
import { Copy, Mail, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useEmailTemplates, type Supplier } from "@/lib/suppliers-store";

function applyVars(text: string, vars: Record<string, string>) {
  return text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

export function EmailGenerator({ supplier, onClose }: { supplier: Supplier; onClose: () => void }) {
  const { templates } = useEmailTemplates();
  const [chantierNum, setChantierNum] = useState("");
  const [chantierNom, setChantierNom] = useState("");
  const [taskNum, setTaskNum] = useState("");
  const [tplId, setTplId] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!tplId && templates.length > 0) setTplId(templates[0].id);
  }, [templates, tplId]);

  const tpl = templates.find((t) => t.id === tplId);

  const vars: Record<string, string> = {
    numero_chantier: chantierNum || "[N° chantier]",
    nom_chantier: chantierNom || "[Nom chantier]",
    numero_tache: taskNum || "[N° tâche]",
    nom_fournisseur: supplier.name,
    nom_contact: supplier.contactName ?? "",
  };

  const subject = useMemo(() => (tpl ? applyVars(tpl.subject, vars) : ""), [tpl, chantierNum, chantierNom, taskNum, supplier]);
  const body = useMemo(() => (tpl ? applyVars(tpl.body, vars) : ""), [tpl, chantierNum, chantierNom, taskNum, supplier]);

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
        <Select value={tplId} onValueChange={setTplId}>
          <SelectTrigger><SelectValue placeholder={templates.length ? "Choisir un modèle" : "Aucun modèle disponible"} /></SelectTrigger>
          <SelectContent>
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Variables disponibles : <code>{"{numero_chantier}"}</code>, <code>{"{nom_chantier}"}</code>, <code>{"{numero_tache}"}</code>, <code>{"{nom_fournisseur}"}</code>, <code>{"{nom_contact}"}</code>
        </p>
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
        <Button variant="outline" onClick={handleCopy} className="gap-2" disabled={!tpl}>
          {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copié" : "Copier"}
        </Button>
        <Button asChild disabled={!supplier.contactEmail || !tpl} className="gap-2">
          <a href={mailtoHref}>
            <Mail className="h-4 w-4" /> Ouvrir dans Outlook
          </a>
        </Button>
      </div>
    </div>
  );
}
