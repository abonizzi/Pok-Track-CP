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
