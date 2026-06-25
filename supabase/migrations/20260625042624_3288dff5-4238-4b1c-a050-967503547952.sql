
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  website TEXT NOT NULL DEFAULT '',
  cad_website TEXT NOT NULL DEFAULT '',
  contact_name TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read suppliers" ON public.suppliers FOR SELECT USING (true);
CREATE POLICY "Public insert suppliers" ON public.suppliers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update suppliers" ON public.suppliers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete suppliers" ON public.suppliers FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.suppliers (name, domain, website, cad_website, contact_name, contact_email, contact_phone, notes) VALUES
('Schüco', 'Aluminium', 'https://www.schueco.com', 'https://www.schueco.com/fr/architectes/bim', 'Service technique', 'tech@schueco.fr', '+33 1 00 00 00 00', 'Profilés aluminium pour murs-rideaux et fenêtres.'),
('Saint-Gobain Glass', 'Vitrage', 'https://www.saint-gobain-glass.com', '', '', '', '', 'Vitrages isolants et de contrôle solaire.'),
('Hilti', 'Ancrages', 'https://www.hilti.fr', 'https://www.hilti.fr/content/hilti/E3/FR/fr/services/tools/bim-cad-library.html', 'Support BIM', 'bim@hilti.fr', '', 'Catalogue BIM complet, calculs de fixations dispo via Profis.');
