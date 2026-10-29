-- Access dans le projet Supabase d'INDEX (memes comptes que Index) : a coller UNE FOIS dans
-- Supabase > projet d'Index > SQL Editor > New query > Run. Relancer le script ne casse rien.
--
-- - « access_domaines » et « access_fournisseurs » : lecture libre (noms, liens, notes),
--   ajout / modification / suppression reserves aux comptes VALIDES dans Index.
-- - « access_acces » : identifiants des sites fournisseurs.
--     proprietaire vide  = acces du bureau, visible et modifiable par tous les comptes valides ;
--     proprietaire = moi = acces perso, visible et modifiable par moi seul.
--   Jamais lisible sans compte valide.

create table if not exists public.access_domaines (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique check (length(trim(nom)) between 1 and 60),
  ordre int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.access_fournisseurs (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (length(trim(nom)) between 1 and 120),
  domaine_id uuid not null references public.access_domaines(id) on delete restrict,
  site text not null default '' check (site = '' or (site ~* '^https?://' and length(site) <= 500)),
  site_cao text not null default '' check (site_cao = '' or (site_cao ~* '^https?://' and length(site_cao) <= 500)),
  notes text not null default '' check (length(notes) <= 2000),
  updated_at timestamptz not null default now()
);

create table if not exists public.access_acces (
  id uuid primary key default gen_random_uuid(),
  fournisseur_id uuid not null references public.access_fournisseurs(id) on delete cascade,
  proprietaire uuid references auth.users(id) on delete cascade,
  identifiant text not null default '' check (length(identifiant) <= 200),
  mot_de_passe text not null default '' check (length(mot_de_passe) <= 200),
  updated_at timestamptz not null default now()
);
-- Un seul acces bureau et un seul acces perso par personne, pour chaque fournisseur
create unique index if not exists access_acces_bureau on public.access_acces (fournisseur_id) where proprietaire is null;
create unique index if not exists access_acces_perso on public.access_acces (fournisseur_id, proprietaire) where proprietaire is not null;

alter table public.access_domaines enable row level security;
alter table public.access_fournisseurs enable row level security;
alter table public.access_acces enable row level security;

grant select on public.access_domaines, public.access_fournisseurs to anon;
grant select, insert, update, delete on public.access_domaines, public.access_fournisseurs, public.access_acces to authenticated;
revoke all on public.access_acces from anon;

do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' and tablename in ('access_domaines', 'access_fournisseurs', 'access_acces') loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Domaines et fournisseurs : lecture libre, modifications par les comptes valides
create policy "lecture domaines" on public.access_domaines for select to anon, authenticated using (true);
create policy "ecriture domaines" on public.access_domaines for all to authenticated using (public.is_approved()) with check (public.is_approved());
create policy "lecture fournisseurs" on public.access_fournisseurs for select to anon, authenticated using (true);
create policy "ecriture fournisseurs" on public.access_fournisseurs for all to authenticated using (public.is_approved()) with check (public.is_approved());

-- Acces : comptes valides seulement ; le bureau pour tous, le perso pour son proprietaire
create policy "lecture acces" on public.access_acces for select to authenticated
  using (public.is_approved() and (proprietaire is null or proprietaire = auth.uid()));
create policy "ajout acces" on public.access_acces for insert to authenticated
  with check (public.is_approved() and (proprietaire is null or proprietaire = auth.uid()));
create policy "modif acces" on public.access_acces for update to authenticated
  using (public.is_approved() and (proprietaire is null or proprietaire = auth.uid()))
  with check (public.is_approved() and (proprietaire is null or proprietaire = auth.uid()));
create policy "retrait acces" on public.access_acces for delete to authenticated
  using (public.is_approved() and (proprietaire is null or proprietaire = auth.uid()));
