-- =====================================================================
-- Aspyre Studio — Ajout : Domaine & licences, accès chiffrés, suivi projet
-- À exécuter APRÈS schema.sql, dans Supabase > SQL Editor > Run
-- (peut être relancé sans risque)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Suivi du projet sur le brief
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
-- 2. Domaine & licences (avancement des achats du client)
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
-- 3. Accès transmis par le client (identifiants chiffrés)
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
-- 4. Messages du suivi de projet (client <-> toi)
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
