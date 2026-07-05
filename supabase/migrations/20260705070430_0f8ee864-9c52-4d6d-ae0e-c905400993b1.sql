
-- Revoke public read on suppliers table (contains emails/phones)
DROP POLICY IF EXISTS "Public read suppliers" ON public.suppliers;
REVOKE SELECT ON public.suppliers FROM anon;
CREATE POLICY "Authenticated read suppliers"
  ON public.suppliers FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Public-safe view without contact fields
CREATE OR REPLACE VIEW public.suppliers_public
WITH (security_invoker = on) AS
  SELECT id, name, domain, website, cad_website, notes, created_at, updated_at
  FROM public.suppliers;

GRANT SELECT ON public.suppliers_public TO anon, authenticated;
