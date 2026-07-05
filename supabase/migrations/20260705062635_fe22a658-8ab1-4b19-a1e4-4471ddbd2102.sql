
-- Restrict public SELECT to authenticated only
DROP POLICY IF EXISTS "Public read suppliers" ON public.suppliers;
CREATE POLICY "Authenticated read suppliers" ON public.suppliers
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public read domains" ON public.domains;
CREATE POLICY "Authenticated read domains" ON public.domains
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public read email_templates" ON public.email_templates;
CREATE POLICY "Authenticated read email_templates" ON public.email_templates
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

-- Tighten always-true INSERT/UPDATE/DELETE policies
-- suppliers
DROP POLICY IF EXISTS "Authenticated insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated delete suppliers" ON public.suppliers;
CREATE POLICY "Authenticated insert suppliers" ON public.suppliers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update suppliers" ON public.suppliers
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete suppliers" ON public.suppliers
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- domains
DROP POLICY IF EXISTS "Authenticated insert domains" ON public.domains;
DROP POLICY IF EXISTS "Authenticated update domains" ON public.domains;
DROP POLICY IF EXISTS "Authenticated delete domains" ON public.domains;
CREATE POLICY "Authenticated insert domains" ON public.domains
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update domains" ON public.domains
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete domains" ON public.domains
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- email_templates
DROP POLICY IF EXISTS "Authenticated insert email_templates" ON public.email_templates;
DROP POLICY IF EXISTS "Authenticated update email_templates" ON public.email_templates;
DROP POLICY IF EXISTS "Authenticated delete email_templates" ON public.email_templates;
CREATE POLICY "Authenticated insert email_templates" ON public.email_templates
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update email_templates" ON public.email_templates
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete email_templates" ON public.email_templates
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- supplier_secrets
DROP POLICY IF EXISTS "Authenticated read secrets" ON public.supplier_secrets;
DROP POLICY IF EXISTS "Authenticated insert secrets" ON public.supplier_secrets;
DROP POLICY IF EXISTS "Authenticated update secrets" ON public.supplier_secrets;
DROP POLICY IF EXISTS "Authenticated delete secrets" ON public.supplier_secrets;
CREATE POLICY "Authenticated read secrets" ON public.supplier_secrets
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated insert secrets" ON public.supplier_secrets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update secrets" ON public.supplier_secrets
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete secrets" ON public.supplier_secrets
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
