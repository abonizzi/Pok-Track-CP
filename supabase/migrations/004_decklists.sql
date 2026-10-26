-- ============================================================
-- Migrazione 004 — da eseguire UNA VOLTA nell'SQL Editor di Supabase.
-- Aggiunge le liste mazzo da 60 carte (Pokémon/Trainer/Energia),
-- con dati giocatore e stampa/PDF, integrate in PokéTrack.
-- ============================================================

create table if not exists public.decklists (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_name text not null default '',
  player_first_name text,
  player_last_name text,
  player_birth_year text,
  player_id text,
  pokemon jsonb not null default '[]'::jsonb,
  trainer jsonb not null default '[]'::jsonb,
  energy jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.decklists enable row level security;

drop policy if exists "Decklists: select own" on public.decklists;
create policy "Decklists: select own" on public.decklists
  for select using (auth.uid() = user_id);

drop policy if exists "Decklists: insert own" on public.decklists;
create policy "Decklists: insert own" on public.decklists
  for insert with check (auth.uid() = user_id);

drop policy if exists "Decklists: update own" on public.decklists;
create policy "Decklists: update own" on public.decklists
  for update using (auth.uid() = user_id);

drop policy if exists "Decklists: delete own" on public.decklists;
create policy "Decklists: delete own" on public.decklists
  for delete using (auth.uid() = user_id);

create index if not exists idx_decklists_user on public.decklists(user_id);
