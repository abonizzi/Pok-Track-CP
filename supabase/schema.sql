-- ============================================================
-- PokéTrack — Schema Supabase (Postgres) con Row Level Security
-- Esegui questo file nell'SQL editor del tuo progetto Supabase.
-- ============================================================

-- Estensioni utili
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- PROFILI UTENTE (collegati a auth.users)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  season int not null default extract(year from now())::int,
  theme text not null default 'dark' check (theme in ('dark','light')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles: select own" on public.profiles
  for select using (auth.uid() = id);
create policy "Profiles: insert own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Profiles: update own" on public.profiles
  for update using (auth.uid() = id);

-- Crea automaticamente il profilo alla registrazione
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Nota: i mazzi (propri e avversari) si scrivono liberamente nei campi `deck` di
-- `tournaments` e `opponent_archetype` di `matches` — niente più elenco fisso di
-- archetipi da mantenere/aggiornare a ogni rotazione di metagame.

-- ------------------------------------------------------------
-- TABELLE CP UFFICIALI (globali, sola lettura)
-- Il "kicker" è il numero minimo di partecipanti richiesto perché quella
-- fascia di piazzamento assegni i CP indicati (meccanica ufficiale Play! Pokémon):
-- se il torneo ha meno partecipanti, si ricevono i CP della fascia migliore
-- (bracket con indice più basso) il cui kicker è comunque soddisfatto.
-- bracket_order serve solo per individuare la "fascia migliore soddisfatta" via query.
-- Aggiornabile da un amministratore senza toccare il frontend.
-- ------------------------------------------------------------
create table if not exists public.cp_table (
  id uuid primary key default uuid_generate_v4(),
  event_type text not null check (event_type in ('League Challenge','League Cup','Regional Championship','International Championship')),
  placement_bracket text not null, -- es. '1','2','3-4','5-8','9-16','17-32','33-64','65-128'...
  bracket_order int not null,      -- 0 = 1° posto, crescente verso fasce peggiori
  kicker int not null default 0,   -- partecipanti minimi richiesti per questa fascia
  cp int not null,
  season int not null default extract(year from now())::int,
  is_official boolean not null default true
);

create table if not exists public.bfl_table (
  id uuid primary key default uuid_generate_v4(),
  season int not null default extract(year from now())::int,
  best_finish_limit int not null
);

alter table public.cp_table enable row level security;
alter table public.bfl_table enable row level security;

create policy "CP table: read all authenticated" on public.cp_table
  for select using (auth.role() = 'authenticated');
create policy "BFL table: read all authenticated" on public.bfl_table
  for select using (auth.role() = 'authenticated');

-- League Challenge e League Cup: valori UFFICIALI Play! Pokémon 2027
insert into public.cp_table (event_type, placement_bracket, bracket_order, kicker, cp, season, is_official) values
  ('League Challenge','1',0,0,15,2027,true),
  ('League Challenge','2',1,4,12,2027,true),
  ('League Challenge','3-4',2,8,10,2027,true),
  ('League Challenge','5-8',3,14,8,2027,true),
  ('League Challenge','9-16',4,25,6,2027,true),
  ('League Challenge','17-32',5,48,4,2027,true),

  ('League Cup','1',0,0,50,2027,true),
  ('League Cup','2',1,4,40,2027,true),
  ('League Cup','3-4',2,8,32,2027,true),
  ('League Cup','5-8',3,17,25,2027,true),
  ('League Cup','9-16',4,48,20,2027,true),
  ('League Cup','17-32',5,80,16,2027,true),
  ('League Cup','33-64',6,128,13,2027,true),

  -- Regional Championship: valori UFFICIALI 2027 (Campionati Regionali e Speciali)
  ('Regional Championship','1',0,0,350,2027,true),
  ('Regional Championship','2',1,4,325,2027,true),
  ('Regional Championship','3-4',2,8,300,2027,true),
  ('Regional Championship','5-8',3,17,280,2027,true),
  ('Regional Championship','9-16',4,33,200,2027,true),
  ('Regional Championship','17-32',5,65,160,2027,true),
  ('Regional Championship','33-64',6,129,120,2027,true),
  ('Regional Championship','65-128',7,257,80,2027,true),
  ('Regional Championship','129-256',8,513,60,2027,true),
  ('Regional Championship','257-512',9,1025,45,2027,true),
  ('Regional Championship','513-1024',10,2049,22,2027,true),

  -- International Championship: valori PROVVISORI, in attesa dei dati ufficiali 2027
  ('International Championship','1',0,0,50,2027,false),
  ('International Championship','2',1,4,40,2027,false),
  ('International Championship','3-4',2,8,30,2027,false),
  ('International Championship','5-8',3,16,20,2027,false),
  ('International Championship','9-16',4,32,15,2027,false),
  ('International Championship','17-32',5,64,8,2027,false),
  ('International Championship','33-64',6,128,4,2027,false)
on conflict do nothing;

insert into public.bfl_table (season, best_finish_limit) values (2027, 15)
on conflict do nothing;

-- ------------------------------------------------------------
-- TORNEI (dati privati dell'utente)
-- ------------------------------------------------------------
create table if not exists public.tournaments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('League Challenge','League Cup','Regional Championship','International Championship')),
  name text not null,
  deck text, -- mazzo usato, scritto liberamente dall'utente (niente elenco fisso di archetipi)
  event_date date not null,
  location text,
  entry_cost numeric(10,2) default 0,
  participants int,
  rounds int,
  placement int,
  cp_earned int default 0,
  season int not null default extract(year from now())::int,
  created_at timestamptz not null default now()
);

alter table public.tournaments enable row level security;

create policy "Tournaments: select own" on public.tournaments
  for select using (auth.uid() = user_id);
create policy "Tournaments: insert own" on public.tournaments
  for insert with check (auth.uid() = user_id);
create policy "Tournaments: update own" on public.tournaments
  for update using (auth.uid() = user_id);
create policy "Tournaments: delete own" on public.tournaments
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- MATCH (round Bo3, dati privati dell'utente)
-- ------------------------------------------------------------
create table if not exists public.matches (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tournament_id uuid references public.tournaments(id) on delete set null,
  round int not null,
  opponent_archetype text not null,
  opponent_type text,
  result text not null check (result in ('V','S','P')),
  score text,
  points int not null default 0,
  match_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.matches enable row level security;

create policy "Matches: select own" on public.matches
  for select using (auth.uid() = user_id);
create policy "Matches: insert own" on public.matches
  for insert with check (auth.uid() = user_id);
create policy "Matches: update own" on public.matches
  for update using (auth.uid() = user_id);
create policy "Matches: delete own" on public.matches
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- GAME (i singoli game di un match Bo3)
-- ------------------------------------------------------------
create table if not exists public.games (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  game_number int not null check (game_number in (1,2,3)),
  result text check (result in ('W','L','T'))
);

alter table public.games enable row level security;

create policy "Games: select own" on public.games
  for select using (auth.uid() = user_id);
create policy "Games: insert own" on public.games
  for insert with check (auth.uid() = user_id);
create policy "Games: update own" on public.games
  for update using (auth.uid() = user_id);
create policy "Games: delete own" on public.games
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- FEEDBACK (inserimento libero, lettura solo propria + service role per invio email)
-- ------------------------------------------------------------
create table if not exists public.feedback (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  subject text,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

create policy "Feedback: insert own" on public.feedback
  for insert with check (auth.uid() = user_id or user_id is null);
create policy "Feedback: select own" on public.feedback
  for select using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Indici utili
-- ------------------------------------------------------------
create index if not exists idx_tournaments_user on public.tournaments(user_id);
create index if not exists idx_matches_user on public.matches(user_id);
create index if not exists idx_matches_tournament on public.matches(tournament_id);
create index if not exists idx_games_match on public.games(match_id);
