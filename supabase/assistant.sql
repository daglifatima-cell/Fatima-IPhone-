-- =====================================================================
-- Aspyre Studio — Ajout : conversations avec l'assistante IA (Ava)
-- Si tu as déjà exécuté schema.sql avant cette mise à jour, exécute ce
-- fichier une fois : Supabase > SQL Editor > coller > Run.
-- (Déjà inclus dans schema.sql pour les nouvelles installations.)
-- =====================================================================

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
