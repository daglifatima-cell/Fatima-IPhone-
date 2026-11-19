-- =====================================================================
-- Aspyre Studio — Ajout : outil Vinted (annonces à republier / optimiser)
-- À exécuter une fois : Supabase > SQL Editor > coller > Run.
-- (Déjà inclus dans schema.sql pour les nouvelles installations.)
-- =====================================================================

create table if not exists public.vinted_listings (
  id               uuid primary key default gen_random_uuid(),
  title            text not null default '',
  description      text not null default '',
  brand            text not null default '',
  category         text not null default '',
  size             text not null default '',
  condition        text not null default '',
  color            text not null default '',
  price            numeric(10, 2),
  notes            text not null default '',
  published_at     date not null default current_date,
  republish_count  int not null default 0,
  sold_at          timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Réservé à l'administratrice.
alter table public.vinted_listings enable row level security;
drop policy if exists "vinted_listings: admin" on public.vinted_listings;
create policy "vinted_listings: admin" on public.vinted_listings
  for all using (public.is_admin()) with check (public.is_admin());
