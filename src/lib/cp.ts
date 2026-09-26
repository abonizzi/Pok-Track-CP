// Logica di stima CP — legge la tabella globale cp_table da Supabase.
//
// Meccanica ufficiale del Kicker: ogni fascia di piazzamento richiede un numero
// minimo di partecipanti (kicker) per assegnare i CP indicati. Se il torneo ha
// meno partecipanti, si ricevono i CP della fascia con indice (bracket_order)
// più basso il cui kicker è comunque soddisfatto dal numero reale di partecipanti.
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

  // fascia più "premiante" (bracket_order più basso, cioè più CP) il cui kicker
  // è soddisfatto dal numero reale di partecipanti, tra tutte le fasce disponibili.
  let bestOrder = 0;
  for (const r of typedRows) {
    if (r.kicker <= participants && r.bracket_order > bestOrder) bestOrder = r.bracket_order;
  }

  const usedOrder = Math.min(myRow.bracket_order, bestOrder);
  const usedRow = typedRows.find((r) => r.bracket_order === usedOrder) || myRow;
  return usedRow.cp;
}
