
-- 1. Add color column to domains
ALTER TABLE public.domains ADD COLUMN IF NOT EXISTS color text;

-- 2. Create supplier_secrets table for sensitive access passwords (admin-only)
CREATE TABLE IF NOT EXISTS public.supplier_secrets (
  supplier_id uuid PRIMARY KEY REFERENCES public.suppliers(id) ON DELETE CASCADE,
  access_password text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_secrets TO authenticated;
GRANT ALL ON public.supplier_secrets TO service_role;
-- NOTE: no GRANT to anon — guests must NEVER read access passwords.

ALTER TABLE public.supplier_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read secrets" ON public.supplier_secrets
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert secrets" ON public.supplier_secrets
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update secrets" ON public.supplier_secrets
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete secrets" ON public.supplier_secrets
  FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_supplier_secrets_updated
BEFORE UPDATE ON public.supplier_secrets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Tighten write policies on suppliers / domains / email_templates to authenticated users only
-- Keep SELECT public (read-only guest mode).

-- Suppliers
DROP POLICY IF EXISTS "Public insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Public update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Public delete suppliers" ON public.suppliers;
CREATE POLICY "Authenticated insert suppliers" ON public.suppliers
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update suppliers" ON public.suppliers
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete suppliers" ON public.suppliers
  FOR DELETE TO authenticated USING (true);

-- Domains
DROP POLICY IF EXISTS "Public insert domains" ON public.domains;
DROP POLICY IF EXISTS "Public update domains" ON public.domains;
DROP POLICY IF EXISTS "Public delete domains" ON public.domains;
CREATE POLICY "Authenticated insert domains" ON public.domains
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update domains" ON public.domains
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete domains" ON public.domains
  FOR DELETE TO authenticated USING (true);

-- Email templates
DROP POLICY IF EXISTS "Public insert email_templates" ON public.email_templates;
DROP POLICY IF EXISTS "Public update email_templates" ON public.email_templates;
DROP POLICY IF EXISTS "Public delete email_templates" ON public.email_templates;
CREATE POLICY "Authenticated insert email_templates" ON public.email_templates
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update email_templates" ON public.email_templates
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete email_templates" ON public.email_templates
  FOR DELETE TO authenticated USING (true);
