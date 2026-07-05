
-- Allow public read on suppliers, domains, email_templates
DROP POLICY IF EXISTS "Authenticated read suppliers" ON public.suppliers;
CREATE POLICY "Public read suppliers" ON public.suppliers FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.suppliers TO anon;

DROP POLICY IF EXISTS "Authenticated read domains" ON public.domains;
CREATE POLICY "Public read domains" ON public.domains FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.domains TO anon;

DROP POLICY IF EXISTS "Authenticated read email_templates" ON public.email_templates;
CREATE POLICY "Public read email_templates" ON public.email_templates FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.email_templates TO anon;

-- supplier_secrets remains strictly authenticated (no change to existing policy)
