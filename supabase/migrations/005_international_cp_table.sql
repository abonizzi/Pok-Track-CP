-- ============================================================
-- Migrazione 005 — da eseguire UNA VOLTA nell'SQL Editor di Supabase.
-- Sostituisce i valori provvisori degli International Championship
-- con la tabella ufficiale 2027. Si può rilanciare senza creare duplicati.
-- ============================================================

delete from public.cp_table
where event_type = 'International Championship' and season = 2027;

insert into public.cp_table (event_type, placement_bracket, bracket_order, kicker, cp, season, is_official) values
  ('International Championship','1',0,0,500,2027,true),
  ('International Championship','2',1,4,480,2027,true),
  ('International Championship','3-4',2,8,420,2027,true),
  ('International Championship','5-8',3,17,380,2027,true),
  ('International Championship','9-16',4,33,300,2027,true),
  ('International Championship','17-32',5,65,240,2027,true),
  ('International Championship','33-64',6,129,180,2027,true),
  ('International Championship','65-128',7,257,140,2027,true),
  ('International Championship','129-256',8,513,100,2027,true),
  ('International Championship','257-512',9,1025,80,2027,true),
  ('International Championship','513-1024',10,2049,40,2027,true);
