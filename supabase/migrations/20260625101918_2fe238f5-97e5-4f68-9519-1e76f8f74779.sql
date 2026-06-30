
-- DOMAINS
CREATE TABLE public.domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.domains TO anon, authenticated;
GRANT ALL ON public.domains TO service_role;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read domains" ON public.domains FOR SELECT USING (true);
CREATE POLICY "Public insert domains" ON public.domains FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update domains" ON public.domains FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete domains" ON public.domains FOR DELETE USING (true);

INSERT INTO public.domains (name) VALUES
  ('Aluminium'),('Vitrage'),('Ancrages'),('Panneaux'),
  ('Étanchéité'),('Isolation'),('Quincaillerie'),('Autre')
ON CONFLICT (name) DO NOTHING;

-- EMAIL TEMPLATES
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO anon, authenticated;
GRANT ALL ON public.email_templates TO service_role;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read email_templates" ON public.email_templates FOR SELECT USING (true);
CREATE POLICY "Public insert email_templates" ON public.email_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update email_templates" ON public.email_templates FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete email_templates" ON public.email_templates FOR DELETE USING (true);

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure suppliers also gets the update trigger (was missing)
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.email_templates (title, subject, body) VALUES
(
  'Demande de prix / Devis',
  'Demande de prix — Chantier {numero_chantier} {nom_chantier} — Tâche {numero_tache}',
  E'Bonjour,\n\nDans le cadre de notre chantier n° {numero_chantier} — {nom_chantier} (Tâche {numero_tache}), nous étudions actuellement les solutions {nom_fournisseur} pour la partie façade.\n\nPourriez-vous nous transmettre :\n  • un devis détaillé selon les éléments en pièce jointe,\n  • les délais de fabrication et de livraison sur site,\n  • les conditions commerciales applicables.\n\nRestant à votre disposition pour tout complément technique,\n\nCordialement,'
),
(
  'Demande de fichiers CAO spécifiques',
  'Demande de fichiers CAO/BIM — Chantier {numero_chantier} {nom_chantier} — Tâche {numero_tache}',
  E'Bonjour,\n\nDans le cadre du chantier n° {numero_chantier} — {nom_chantier} (Tâche {numero_tache}), nous intégrons actuellement les produits {nom_fournisseur} dans nos plans d''exécution façade.\n\nPourriez-vous nous fournir les ressources techniques suivantes :\n  • familles Revit / objets BIM des références retenues,\n  • blocs DWG 2D et 3D associés,\n  • fiches techniques et carnets de détails à jour.\n\nMerci par avance pour votre retour.\n\nCordialement,'
);
