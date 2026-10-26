-- ============================================================
-- MIGRAZIONI COMBINATE — da eseguire UNA VOLTA nell'SQL Editor di Supabase.
-- Contiene, in ordine, le migrazioni 002 + 003 + 004.
-- Se ne hai già eseguita qualcuna singolarmente in passato, puoi rilanciare
-- comunque questo file intero: ogni blocco usa "if not exists" / "drop policy
-- if exists" quindi è sicuro da eseguire più volte senza errori.
-- ============================================================


-- ============================================================
-- 002 — Mazzi salvati (Impostazioni), fase Swiss/Top Cut e Day 1/2
-- ============================================================
-- Migrazione 002 — da eseguire UNA VOLTA nell'SQL Editor di Supabase
-- sul progetto già esistente (non serve rifare schema.sql da zero).
-- Aggiunge: categorie mazzi, fase Swiss/Top Cut e Day 1/Day 2 sui round.
-- ============================================================

-- 1) Categorie mazzi (elenco personale, gestito da Impostazioni)
create table if not exists public.deck_categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.deck_categories enable row level security;

drop policy if exists "Deck categories: select own" on public.deck_categories;
create policy "Deck categories: select own" on public.deck_categories
  for select using (auth.uid() = user_id);

drop policy if exists "Deck categories: insert own" on public.deck_categories;
create policy "Deck categories: insert own" on public.deck_categories
  for insert with check (auth.uid() = user_id);

drop policy if exists "Deck categories: delete own" on public.deck_categories;
create policy "Deck categories: delete own" on public.deck_categories
  for delete using (auth.uid() = user_id);

-- 2) Fase (Swiss / Top Cut) e giorno (Day 1 / Day 2) sui round già esistenti
alter table public.matches
  add column if not exists phase text not null default 'swiss';
alter table public.matches
  add column if not exists day int not null default 1;

-- vincoli di validità (solo se non già presenti, per poter rilanciare lo script senza errori)
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'matches_phase_check') then
    alter table public.matches add constraint matches_phase_check check (phase in ('swiss','topcut'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'matches_day_check') then
    alter table public.matches add constraint matches_day_check check (day in (1,2));
  end if;
end $$;


-- ============================================================
-- 003 — Bracket Top Cut (Top 4 / Top 8)
-- ============================================================
-- Migrazione 003 — da eseguire UNA VOLTA nell'SQL Editor di Supabase.
-- Aggiunge: tipo di taglio Top Cut (Top 4 / Top 8) sul torneo, e lo
-- stage del bracket a eliminazione diretta sui round.
-- ============================================================

alter table public.tournaments
  add column if not exists cut_type text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'tournaments_cut_type_check') then
    alter table public.tournaments add constraint tournaments_cut_type_check check (cut_type in ('top4','top8') or cut_type is null);
  end if;
end $$;

alter table public.matches
  add column if not exists topcut_stage int;


-- ============================================================
-- 004 — Liste Mazzo (60 carte, stampa/PDF)
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
