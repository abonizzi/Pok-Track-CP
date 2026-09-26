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
  const [tab, setTab] = useState<"cp" | "bfl">("cp");
  const [rows, setRows] = useState<Row[]>([]);
  const [bfl, setBfl] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("cp_table")
      .select("*")
      .eq("season", season)
      .order("bracket_order", { ascending: true })
      .then(({ data }) => setRows((data as Row[]) || []));
    supabase.from("bfl_table").select("*").eq("season", season).maybeSingle()
      .then(({ data }) => setBfl(data?.best_finish_limit ?? null));
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
      <div className="seg mb-4 mt-3">
        <button className={tab === "cp" ? "on" : ""} onClick={() => setTab("cp")}>CP per piazzamento</button>
        <button className={tab === "bfl" ? "on" : ""} onClick={() => setTab("bfl")}>BFL</button>
      </div>

      {tab === "cp" && (
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
            Il Kicker indica il numero minimo di partecipanti richiesto: se il torneo ne ha meno, si ricevono i CP
            della fascia migliore comunque raggiunta dai partecipanti effettivi. Valori dalla tabella cp_table —
            aggiornabili in Supabase senza toccare il frontend.
          </div>
        </div>
      )}

      {tab === "bfl" && (
        <Card>
          <div className="font-semibold mb-1">Best Finish Limit (BFL)</div>
          <div className="text-2xl font-extrabold mb-2">{bfl ?? "-"} CP</div>
          <div className="text-sm" style={{ color: "var(--text-dim)" }}>
            Limite massimo di piazzamento considerato per ottenere CP in un singolo evento (valore provvisorio, tabella bfl_table).
          </div>
        </Card>
      )}
    </div>
  );
}
