import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Card, Badge } from "../components/ui";
import { seasonForDate } from "../lib/cp";

const CAT_BADGE: any = {
  "League Challenge": "b-lc",
  "League Cup": "b-lcup",
  "Regional Championship": "b-reg",
  "International Championship": "b-int",
};
const EVENT_TYPES = ["League Challenge", "League Cup", "Regional Championship", "International Championship"];

type Row = { event_type: string; placement_bracket: string; bracket_order: number; kicker: number; cp: number; is_official: boolean };

export default function CpTables() {
  const [season, setSeason] = useState(() => seasonForDate(new Date().toISOString().slice(0, 10)));
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    supabase
      .from("cp_table")
      .select("*")
      .eq("season", season)
      .order("bracket_order", { ascending: true })
      .then(({ data }) => setRows((data as Row[]) || []));
  }, [season]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold">Tabelle CP &amp; Requisiti</h2>
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-dim)" }}>
          <button onClick={() => setSeason((s) => s - 1)} className="opacity-70 hover:opacity-100">◀</button>
          <span className="font-semibold" style={{ color: "var(--text)" }}>{season}</span>
          <button onClick={() => setSeason((s) => s + 1)} className="opacity-70 hover:opacity-100">▶</button>
        </div>
      </div>
      <div className="mb-3" />

      <div className="grid gap-3">
          {EVENT_TYPES.map((evt) => {
            const evtRows = rows.filter((r) => r.event_type === evt);
            if (evtRows.length === 0) return null;
            const isOfficial = evtRows.every((r) => r.is_official);
            return (
              <Card key={evt}>
                <div className="flex items-center justify-between mb-2">
                  <Badge cls={CAT_BADGE[evt]}>{evt}</Badge>
                  {!isOfficial && <span className="text-[11px] font-semibold" style={{ color: "var(--amber)" }}>provvisorio</span>}
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left" style={{ color: "var(--text-dim)" }}>
                      <th className="py-1">Piazzamento</th>
                      <th className="py-1 text-center">Kicker (n. giocatori)</th>
                      <th className="py-1 text-right">CP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evtRows.map((r) => (
                      <tr key={r.placement_bracket} className="border-t" style={{ borderColor: "var(--card-border)" }}>
                        <td className="py-1.5">{r.placement_bracket}</td>
                        <td className="py-1.5 text-center">{r.kicker}</td>
                        <td className="py-1.5 text-right font-bold">{r.cp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            );
          })}
          <div className="text-[11px]" style={{ color: "var(--text-dim)" }}>
            Il Kicker indica il numero minimo di partecipanti richiesto perché la propria fascia di piazzamento
            assegni i CP indicati: se il torneo ne ha meno, quella fascia non assegna alcun CP (0) — non esiste
            nessuna fascia di ripiego. Valori dalla tabella cp_table — aggiornabili in Supabase senza toccare il frontend.
          </div>
      </div>

    </div>
  );
}
