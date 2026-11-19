-- =====================================================================
-- Aspyre Studio — Espace client
-- Schéma Supabase complet : Supabase > SQL Editor > New query >
-- coller tout ce fichier > Run. Peut être relancé sans risque.
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

-- Création automatique du profil quand un client est invité (ou quand ton
-- compte admin est créé par la page /installation). Toute autre inscription
-- n'obtient pas de profil, donc aucun accès à la plateforme.
-- Le nom et l'entreprise viennent des métadonnées envoyées avec l'invitation.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.invited_at is null
     and coalesce(new.raw_app_meta_data ->> 'aspyre_admin', '') <> 'true' then
    return new;
  end if;
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
    and exists (select 1 from public.profiles where id = auth.uid())
  );

drop policy if exists "brief-files: suppression" on storage.objects;
create policy "brief-files: suppression" on storage.objects
  for delete using (
    bucket_id = 'brief-files'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- ---------------------------------------------------------------------
-- 5. Suivi du projet sur le brief
-- ---------------------------------------------------------------------
alter table public.briefs add column if not exists project_step int not null default 0
  check (project_step between 0 and 5);
alter table public.briefs add column if not exists maquette_url text;

-- Le client ne peut pas modifier l'étape du projet ni le lien de maquette.
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
  if new.project_step is distinct from old.project_step
     or new.maquette_url is distinct from old.maquette_url then
    raise exception 'Réservé à l''administrateur';
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

-- Le brief appartient-il à l'utilisateur connecté (ou est-il admin) ?
create or replace function public.can_access_brief(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
      or exists (select 1 from public.briefs where id = target and client_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- 6. Domaine & licences (avancement des achats du client)
-- ---------------------------------------------------------------------
create table if not exists public.project_setup (
  brief_id    uuid primary key references public.briefs (id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.project_setup enable row level security;

drop policy if exists "project_setup: accès" on public.project_setup;
create policy "project_setup: accès" on public.project_setup
  for all using (public.can_access_brief(brief_id))
  with check (public.can_access_brief(brief_id));

-- ---------------------------------------------------------------------
-- 7. Accès transmis par le client (identifiants chiffrés)
--    Le contenu est chiffré par l'application (AES-256-GCM) avant d'arriver
--    ici, et la colonne chiffrée n'est lisible par personne via l'API :
--    seul le serveur, après vérification que tu es admin, peut la déchiffrer.
-- ---------------------------------------------------------------------
create table if not exists public.project_credentials (
  id          uuid primary key default gen_random_uuid(),
  brief_id    uuid not null references public.briefs (id) on delete cascade,
  service     text not null,
  ciphertext  text not null,
  created_by  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);

alter table public.project_credentials enable row level security;

revoke all on public.project_credentials from anon, authenticated;
grant select (id, brief_id, service, created_at) on public.project_credentials to authenticated;
grant insert (brief_id, service, ciphertext) on public.project_credentials to authenticated;
grant delete on public.project_credentials to authenticated;

drop policy if exists "project_credentials: lecture" on public.project_credentials;
create policy "project_credentials: lecture" on public.project_credentials
  for select using (public.can_access_brief(brief_id));

drop policy if exists "project_credentials: envoi" on public.project_credentials;
create policy "project_credentials: envoi" on public.project_credentials
  for insert with check (public.can_access_brief(brief_id));

drop policy if exists "project_credentials: suppression" on public.project_credentials;
create policy "project_credentials: suppression" on public.project_credentials
  for delete using (public.can_access_brief(brief_id));

-- ---------------------------------------------------------------------
-- 8. Messages du suivi de projet (client <-> toi)
-- ---------------------------------------------------------------------
create table if not exists public.project_messages (
  id          uuid primary key default gen_random_uuid(),
  brief_id    uuid not null references public.briefs (id) on delete cascade,
  author_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind        text not null default 'message'
              check (kind in ('message', 'validation', 'modifications')),
  body        text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists project_messages_brief_idx on public.project_messages (brief_id, created_at);

alter table public.project_messages enable row level security;

drop policy if exists "project_messages: lecture" on public.project_messages;
create policy "project_messages: lecture" on public.project_messages
  for select using (public.can_access_brief(brief_id));

drop policy if exists "project_messages: envoi" on public.project_messages;
create policy "project_messages: envoi" on public.project_messages
  for insert with check (public.can_access_brief(brief_id) and author_id = auth.uid());

-- ---------------------------------------------------------------------
-- 9. Conversations avec l'assistante IA
create table if not exists public.assistant_conversations (
  brief_id       uuid primary key references public.briefs (id) on delete cascade,
  messages       jsonb not null default '[]'::jsonb,
  user_messages  int not null default 0,
  context_hash   text,
  updated_at     timestamptz not null default now()
);

-- Accessible uniquement par le serveur (clé secrète), jamais directement
-- depuis le navigateur : RLS activée sans aucune règle d'accès.
alter table public.assistant_conversations enable row level security;
