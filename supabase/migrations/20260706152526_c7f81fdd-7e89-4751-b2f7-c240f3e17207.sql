
-- Recreate suppliers_public with security_invoker OFF so it can be read by anon
-- without granting anon direct SELECT on the base suppliers table (which contains contact PII).
DROP VIEW IF EXISTS public.suppliers_public;

CREATE VIEW public.suppliers_public
WITH (security_invoker = off) AS
SELECT id, name, domain, website, cad_website, notes, created_at, updated_at
FROM public.suppliers;

GRANT SELECT ON public.suppliers_public TO anon, authenticated;
