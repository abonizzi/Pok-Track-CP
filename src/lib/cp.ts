// Logica di stima CP — legge la tabella globale cp_table da Supabase.
//
// Meccanica ufficiale del Kicker: ogni fascia di piazzamento richiede un numero
// minimo di partecipanti (kicker) per assegnare i CP indicati. Se il torneo ha
// MENO partecipanti del kicker richiesto dalla propria fascia, quella fascia
// non assegna alcun CP (0) — non esiste nessun ripiego su una fascia diversa.
// Es: arrivi 3° in una League Cup da 6 giocatori. La fascia "3°-4°" richiede un
// kicker di 8 partecipanti, non soddisfatto → 0 CP per questo piazzamento.
import { supabase } from "./supabase";

export type EventType =
  | "League Challenge"
  | "League Cup"
  | "Regional Championship"
  | "International Championship";

export const EVENT_TYPES: EventType[] = [
  "League Challenge",
  "League Cup",
  "Regional Championship",
  "International Championship",
];

// Calendario stagionale Play! Pokémon: da settembre a giugno appartiene alla
// stagione dell'anno successivo (es. settembre 2026 → giugno 2027 = "Stagione 2027").
// Luglio e agosto sono considerati parte della stagione appena conclusa.
export function seasonForDate(dateStr: string): number {
  if (!dateStr) return new Date().getFullYear();
  const d = new Date(dateStr + "T00:00:00");
  const month = d.getMonth() + 1; // 1-12
  const year = d.getFullYear();
  return month >= 9 ? year + 1 : year;
}

function bracketContains(bracket: string, placement: number): boolean {
  if (bracket.includes("-")) {
    const [lo, hi] = bracket.split("-").map(Number);
    return placement >= lo && placement <= hi;
  }
  return Number(bracket) === placement;
}

type CpRow = { placement_bracket: string; bracket_order: number; kicker: number; cp: number };

export async function estimateCP(
  eventType: EventType,
  participants: number,
  placement: number,
  season: number
): Promise<number | null> {
  if (!eventType || !participants || !placement) return null;

  const { data: rows } = await supabase
    .from("cp_table")
    .select("placement_bracket, bracket_order, kicker, cp")
    .eq("event_type", eventType)
    .eq("season", season)
    .order("bracket_order", { ascending: true });

  if (!rows || rows.length === 0) return null;
  const typedRows = rows as CpRow[];

  const myRow = typedRows.find((r) => bracketContains(r.placement_bracket, placement));
  if (!myRow) return 0; // piazzamento fuori dalle fasce che assegnano CP

  if (Number(participants) < myRow.kicker) return 0; // kicker della propria fascia non soddisfatto

  return myRow.cp;
}
