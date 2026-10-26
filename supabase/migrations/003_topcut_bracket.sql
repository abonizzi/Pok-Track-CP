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
