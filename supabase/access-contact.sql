-- Access : contact general des fournisseurs (email, telephone, email du service technique).
-- A coller UNE FOIS dans Supabase > projet d'INDEX > SQL Editor > Run (apres access-index.sql).
-- Relancer le script ne casse rien. Lisible par tout le monde comme le reste de la fiche fournisseur
-- (ce sont les coordonnees publiques du fournisseur, pas des contacts nominatifs).

alter table public.access_fournisseurs add column if not exists email text not null default '';
alter table public.access_fournisseurs add column if not exists telephone text not null default '';
alter table public.access_fournisseurs add column if not exists email_technique text not null default '';

alter table public.access_fournisseurs drop constraint if exists access_email_ok;
alter table public.access_fournisseurs add constraint access_email_ok
  check ((email = '' or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') and length(email) <= 120
     and (email_technique = '' or email_technique ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') and length(email_technique) <= 120);
alter table public.access_fournisseurs drop constraint if exists access_telephone_ok;
alter table public.access_fournisseurs add constraint access_telephone_ok
  check (telephone ~ '^[0-9+()./ -]*$' and length(telephone) <= 30);
