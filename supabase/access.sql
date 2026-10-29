-- Access dans le projet Supabase de MASSE : a coller UNE FOIS dans
-- Supabase > projet de Masse > SQL Editor > New query > Run. Relancer le script ne casse rien.
--
-- - Deux tables : « access_domaines » (les categories) et « access_fournisseurs ».
-- - Lecture libre ; ajout, modification et suppression proteges par le PIN de Masse
--   (meme code, memes 5 essais avant blocage : fonction public._check_pin).
-- - Les identifiants des sites fournisseurs sont CHIFFRES dans le navigateur avec une phrase
--   secrete (AES-GCM). La base ne recoit et ne stocke que du texte chiffre (colonne « acces »).
-- - « access_coffre » garde le sel de la phrase secrete et un temoin chiffre qui permet de
--   verifier la phrase sans jamais la stocker.

create table if not exists public.access_domaines (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  ordre int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.access_fournisseurs (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  domaine_id uuid not null references public.access_domaines(id) on delete restrict,
  site text not null default '',
  site_cao text not null default '',
  notes text not null default '',
  acces jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.access_coffre (
  id int primary key default 1 check (id = 1),
  sel text not null,
  temoin jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.access_domaines enable row level security;
alter table public.access_fournisseurs enable row level security;
alter table public.access_coffre enable row level security;
grant select on public.access_domaines, public.access_fournisseurs, public.access_coffre to anon, authenticated;
grant all on public.access_domaines, public.access_fournisseurs, public.access_coffre to service_role;
drop policy if exists "lecture domaines access" on public.access_domaines;
create policy "lecture domaines access" on public.access_domaines for select to anon, authenticated using (true);
drop policy if exists "lecture fournisseurs access" on public.access_fournisseurs;
create policy "lecture fournisseurs access" on public.access_fournisseurs for select to anon, authenticated using (true);
drop policy if exists "lecture coffre access" on public.access_coffre;
create policy "lecture coffre access" on public.access_coffre for select to anon, authenticated using (true);

-- Un bloc chiffre valide : {"v":1,"i":"<iv base64>","c":"<texte chiffre base64>"}, rien d'autre.
create or replace function public._access_chiffre_ok(p jsonb) returns boolean
language sql immutable as $$
  select p is null or (
    jsonb_typeof(p) = 'object'
    and (select count(*) from jsonb_object_keys(p)) = 3
    and p->>'v' = '1'
    and coalesce(p->>'i', '') ~ '^[A-Za-z0-9+/=]{8,64}$'
    and coalesce(p->>'c', '') ~ '^[A-Za-z0-9+/=]{8,4000}$'
  )
$$;

create or replace function public._access_url_ok(p text) returns boolean
language sql immutable as $$
  select coalesce(p, '') = '' or (p ~* '^https?://' and length(p) <= 500)
$$;

create or replace function public.access_save_fournisseur(p_pin text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e text; v_id uuid; v_acces jsonb := case when jsonb_typeof(p->'acces') = 'object' then p->'acces' else null end;
begin
  e := public._check_pin(p_pin);
  if e is not null then return jsonb_build_object('ok', false, 'error', e); end if;
  if coalesce(trim(p->>'nom'), '') = '' or length(p->>'nom') > 120 then return jsonb_build_object('ok', false, 'error', 'Le nom est obligatoire (120 caractères au plus).'); end if;
  if not exists (select 1 from access_domaines where id::text = p->>'domaine_id') then return jsonb_build_object('ok', false, 'error', 'Domaine introuvable.'); end if;
  if not public._access_url_ok(p->>'site') or not public._access_url_ok(p->>'site_cao') then return jsonb_build_object('ok', false, 'error', 'Les liens doivent commencer par https://'); end if;
  if length(coalesce(p->>'notes', '')) > 2000 then return jsonb_build_object('ok', false, 'error', 'Notes trop longues (2000 caractères au plus).'); end if;
  if not public._access_chiffre_ok(v_acces) then return jsonb_build_object('ok', false, 'error', 'Accès refusé : seul un accès chiffré peut être enregistré.'); end if;
  if coalesce(p->>'id', '') = '' then
    insert into access_fournisseurs (nom, domaine_id, site, site_cao, notes, acces)
    values (trim(p->>'nom'), (p->>'domaine_id')::uuid, coalesce(p->>'site', ''), coalesce(p->>'site_cao', ''), coalesce(p->>'notes', ''), v_acces)
    returning id into v_id;
  else
    update access_fournisseurs set nom = trim(p->>'nom'), domaine_id = (p->>'domaine_id')::uuid, site = coalesce(p->>'site', ''),
      site_cao = coalesce(p->>'site_cao', ''), notes = coalesce(p->>'notes', ''), acces = v_acces, updated_at = now()
    where id::text = p->>'id' returning id into v_id;
    if v_id is null then return jsonb_build_object('ok', false, 'error', 'Fournisseur introuvable (supprimé entre-temps ?).'); end if;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.access_delete_fournisseur(p_pin text, p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e text;
begin
  e := public._check_pin(p_pin);
  if e is not null then return jsonb_build_object('ok', false, 'error', e); end if;
  delete from access_fournisseurs where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.access_save_domaine(p_pin text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e text; v_id uuid; v_nom text := trim(coalesce(p->>'nom', ''));
begin
  e := public._check_pin(p_pin);
  if e is not null then return jsonb_build_object('ok', false, 'error', e); end if;
  if v_nom = '' or length(v_nom) > 60 then return jsonb_build_object('ok', false, 'error', 'Le nom du domaine est obligatoire (60 caractères au plus).'); end if;
  if exists (select 1 from access_domaines where lower(nom) = lower(v_nom) and id::text is distinct from p->>'id') then
    return jsonb_build_object('ok', false, 'error', 'Ce domaine existe déjà.');
  end if;
  if coalesce(p->>'id', '') = '' then
    insert into access_domaines (nom, ordre) values (v_nom, coalesce((p->>'ordre')::int, (select coalesce(max(ordre), 0) + 1 from access_domaines)))
    returning id into v_id;
  else
    update access_domaines set nom = v_nom, ordre = coalesce((p->>'ordre')::int, ordre), updated_at = now()
    where id::text = p->>'id' returning id into v_id;
    if v_id is null then return jsonb_build_object('ok', false, 'error', 'Domaine introuvable.'); end if;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.access_delete_domaine(p_pin text, p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e text; n int;
begin
  e := public._check_pin(p_pin);
  if e is not null then return jsonb_build_object('ok', false, 'error', e); end if;
  select count(*) into n from access_fournisseurs where domaine_id = p_id;
  if n > 0 then return jsonb_build_object('ok', false, 'error', format('Ce domaine contient encore %s fournisseur(s) : déplacez-les d''abord.', n)); end if;
  delete from access_domaines where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

-- Premiere creation du coffre (refusee s'il existe deja : utiliser access_rekey pour changer de phrase)
create or replace function public.access_init_coffre(p_pin text, p_sel text, p_temoin jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e text;
begin
  e := public._check_pin(p_pin);
  if e is not null then return jsonb_build_object('ok', false, 'error', e); end if;
  if exists (select 1 from access_coffre) then return jsonb_build_object('ok', false, 'error', 'Le coffre existe déjà.'); end if;
  if coalesce(p_sel, '') !~ '^[A-Za-z0-9+/=]{16,64}$' or p_temoin is null or not public._access_chiffre_ok(p_temoin) then
    return jsonb_build_object('ok', false, 'error', 'Coffre invalide.');
  end if;
  insert into access_coffre (id, sel, temoin) values (1, p_sel, p_temoin);
  return jsonb_build_object('ok', true);
end $$;

-- Changement de phrase secrete : nouveau sel, nouveau temoin et TOUS les acces rechiffres, en une fois.
create or replace function public.access_rekey(p_pin text, p_sel text, p_temoin jsonb, p_items jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e text; it jsonb; n_attendus int; n_recus int;
begin
  e := public._check_pin(p_pin);
  if e is not null then return jsonb_build_object('ok', false, 'error', e); end if;
  if coalesce(p_sel, '') !~ '^[A-Za-z0-9+/=]{16,64}$' or p_temoin is null or not public._access_chiffre_ok(p_temoin) or jsonb_typeof(p_items) <> 'array' then
    return jsonb_build_object('ok', false, 'error', 'Données invalides.');
  end if;
  -- Tous les acces existants doivent etre fournis, sinon certains resteraient illisibles
  select count(*) into n_attendus from access_fournisseurs where acces is not null;
  select count(distinct x->>'id') into n_recus from jsonb_array_elements(p_items) x
    where exists (select 1 from access_fournisseurs f where f.id::text = x->>'id' and f.acces is not null);
  if n_recus <> n_attendus then return jsonb_build_object('ok', false, 'error', 'Liste incomplète : rechargez la page et recommencez.'); end if;
  for it in select * from jsonb_array_elements(p_items) loop
    if not public._access_chiffre_ok(it->'acces') or it->'acces' is null then return jsonb_build_object('ok', false, 'error', 'Accès invalide.'); end if;
  end loop;
  for it in select * from jsonb_array_elements(p_items) loop
    update access_fournisseurs set acces = it->'acces', updated_at = now() where id::text = it->>'id';
  end loop;
  insert into access_coffre (id, sel, temoin) values (1, p_sel, p_temoin)
  on conflict (id) do update set sel = excluded.sel, temoin = excluded.temoin, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.access_save_fournisseur(text, jsonb), public.access_delete_fournisseur(text, uuid),
  public.access_save_domaine(text, jsonb), public.access_delete_domaine(text, uuid),
  public.access_init_coffre(text, text, jsonb), public.access_rekey(text, text, jsonb, jsonb) from public;
grant execute on function public.access_save_fournisseur(text, jsonb), public.access_delete_fournisseur(text, uuid),
  public.access_save_domaine(text, jsonb), public.access_delete_domaine(text, uuid),
  public.access_init_coffre(text, text, jsonb), public.access_rekey(text, text, jsonb, jsonb) to anon, authenticated;
