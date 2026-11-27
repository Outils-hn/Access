-- Access 2.40 : plusieurs personnes de contact par fournisseur (une par service : Bois, Isolation...).
-- A coller UNE FOIS dans Supabase > projet d'INDEX > SQL Editor > Run.
-- Relancer le script ne casse rien. Les anciens contacts (une personne par fournisseur) sont repris
-- automatiquement comme premiere personne de contact, sans service.

alter table public.access_fournisseurs add column if not exists contacts jsonb not null default '[]'::jsonb;

update public.access_fournisseurs
   set contacts = jsonb_build_array(jsonb_build_object(
         'service', '', 'nom', contact_nom, 'prenom', contact_prenom, 'telephone', contact_telephone, 'email', contact_email))
 where contacts = '[]'::jsonb
   and (contact_nom <> '' or contact_prenom <> '' or contact_telephone <> '' or contact_email <> '');

alter table public.access_fournisseurs drop constraint if exists access_contacts_ok;
alter table public.access_fournisseurs add constraint access_contacts_ok
  check (jsonb_typeof(contacts) = 'array' and jsonb_array_length(contacts) <= 20 and length(contacts::text) <= 8000);
