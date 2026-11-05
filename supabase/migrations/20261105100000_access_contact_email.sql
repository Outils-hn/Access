-- Access 2.12 : email de la personne de contact.
alter table public.access_fournisseurs add column if not exists contact_email text not null default '';
