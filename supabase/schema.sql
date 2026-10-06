-- =====================================================================
-- Aspyre Studio — Espace client
-- Schéma Supabase : à exécuter une seule fois dans
-- Supabase > SQL Editor > New query > coller ce fichier > Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Profils (un par utilisateur Supabase Auth)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  company     text,
  role        text not null default 'client' check (role in ('client', 'admin')),
  created_at  timestamptz not null default now()
);

-- Création automatique du profil quand un utilisateur est invité / créé.
-- Le nom et l'entreprise viennent des métadonnées envoyées avec l'invitation.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, company)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'company'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Petit utilitaire : l'utilisateur connecté est-il administrateur ?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- 2. Briefs (le questionnaire rempli par le client)
-- ---------------------------------------------------------------------
create table if not exists public.briefs (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.profiles (id) on delete cascade,
  title         text not null default 'Mon site internet',
  status        text not null default 'brouillon'
                check (status in ('brouillon', 'envoye', 'en_cours', 'termine')),
  data          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  submitted_at  timestamptz
);

create index if not exists briefs_client_id_idx on public.briefs (client_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists briefs_touch_updated_at on public.briefs;
create trigger briefs_touch_updated_at
  before update on public.briefs
  for each row execute function public.touch_updated_at();

-- Un client ne peut pas passer lui-même son brief en « en cours » / « terminé »,
-- ni modifier un brief dont le projet a démarré.
create or replace function public.guard_client_brief_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.client_id <> old.client_id then
    raise exception 'client_id ne peut pas être modifié';
  end if;
  if old.status not in ('brouillon', 'envoye') then
    raise exception 'Ce brief est verrouillé : le projet est en cours.';
  end if;
  if new.status not in ('brouillon', 'envoye') then
    raise exception 'Statut non autorisé';
  end if;
  return new;
end;
$$;

drop trigger if exists briefs_guard_client_update on public.briefs;
create trigger briefs_guard_client_update
  before update on public.briefs
  for each row execute function public.guard_client_brief_update();

-- Notes internes : table séparée, invisible pour les clients.
create table if not exists public.brief_notes (
  brief_id    uuid primary key references public.briefs (id) on delete cascade,
  notes       text not null default '',
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. Sécurité (Row Level Security)
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.briefs   enable row level security;
alter table public.brief_notes enable row level security;

drop policy if exists "brief_notes: admin" on public.brief_notes;
create policy "brief_notes: admin" on public.brief_notes
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "profiles: lecture" on public.profiles;
create policy "profiles: lecture" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles: admin modifie" on public.profiles;
create policy "profiles: admin modifie" on public.profiles
  for update using (public.is_admin());

drop policy if exists "briefs: lecture" on public.briefs;
create policy "briefs: lecture" on public.briefs
  for select using (client_id = auth.uid() or public.is_admin());

drop policy if exists "briefs: création" on public.briefs;
create policy "briefs: création" on public.briefs
  for insert with check (
    (client_id = auth.uid() and status = 'brouillon') or public.is_admin()
  );

drop policy if exists "briefs: modification" on public.briefs;
create policy "briefs: modification" on public.briefs
  for update using (client_id = auth.uid() or public.is_admin())
  with check (client_id = auth.uid() or public.is_admin());

drop policy if exists "briefs: suppression admin" on public.briefs;
create policy "briefs: suppression admin" on public.briefs
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------
-- 4. Stockage des fichiers (logos, photos, textes…)
--    Bucket privé ; chaque client range ses fichiers dans <son id>/...
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('brief-files', 'brief-files', false, 52428800) -- 50 Mo par fichier
on conflict (id) do nothing;

drop policy if exists "brief-files: lecture" on storage.objects;
create policy "brief-files: lecture" on storage.objects
  for select using (
    bucket_id = 'brief-files'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists "brief-files: envoi" on storage.objects;
create policy "brief-files: envoi" on storage.objects
  for insert with check (
    bucket_id = 'brief-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "brief-files: suppression" on storage.objects;
create policy "brief-files: suppression" on storage.objects
  for delete using (
    bucket_id = 'brief-files'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- ---------------------------------------------------------------------
-- 5. Te donner les droits administrateur
--    Après avoir créé ton propre compte (Authentication > Users > Add user),
--    remplace l'e-mail ci-dessous puis exécute cette ligne :
-- ---------------------------------------------------------------------
-- update public.profiles set role = 'admin' where email = 'ton-email@exemple.com';
