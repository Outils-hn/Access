-- Access 2.11 : personne de contact (nom, prenom, telephone). L'ancienne colonne email_technique est conservee.
alter table public.access_fournisseurs
  add column if not exists contact_nom text not null default '',
  add column if not exists contact_prenom text not null default '',
  add column if not exists contact_telephone text not null default '';
