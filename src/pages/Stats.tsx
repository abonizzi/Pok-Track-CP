import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Card } from "../components/ui";

export default function Stats() {
  const { session } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.from("matches").select("*").eq("user_id", session.user.id).then(({ data }) => setMatches(data || []));
    supabase.from("tournaments").select("*").eq("user_id", session.user.id).then(({ data }) => setTournaments(data || []));
  }, [session]);

  const w = matches.filter((m) => m.result === "V").length;
  const l = matches.filter((m) => m.result === "S").length;
  const d = matches.filter((m) => m.result === "P").length;
  const total = w + l + d;
  const rate = total > 0 ? (w / total) * 100 : 0;
  const circumf = 2 * Math.PI * 52;
  const dash = total > 0 ? (rate / 100) * circumf : 0;

  const byOpp: Record<string, { w: number; total: number }> = {};
  matches.forEach((m) => {
    byOpp[m.opponent_archetype] = byOpp[m.opponent_archetype] || { w: 0, total: 0 };
    byOpp[m.opponent_archetype].total++;
    if (m.result === "V") byOpp[m.opponent_archetype].w++;
  });
  const mstats = Object.entries(byOpp).map(([name, v]) => ({ name, rate: Math.round((v.w / v.total) * 100) }));

  const cp = tournaments.reduce((s, t) => s + (t.cp_earned || 0), 0);
  const wins = tournaments.filter((t) => t.placement === 1).length;
  const topCut = tournaments.filter((t) => t.placement && t.placement <= 8).length;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Statistiche</h2>
      <Card className="mb-4">
        <div className="font-semibold mb-3">Win Rate</div>
        <div className="flex items-center gap-6">
          <svg width="130" height="130" viewBox="0 0 130 130">
            <circle cx="65" cy="65" r="52" fill="none" stroke="var(--card-border)" strokeWidth="14" />
            <circle cx="65" cy="65" r="52" fill="none" stroke="var(--green)" strokeWidth="14" strokeLinecap="round"
              strokeDasharray={`${dash} ${circumf}`} transform="rotate(-90 65 65)" />
            <text x="65" y="72" textAnchor="middle" fontSize="22" fontWeight="800" fill="var(--text)">{rate.toFixed(1)}%</text>
          </svg>
          <div className="grid gap-1 text-sm">
            <div><span className="font-bold" style={{ color: "var(--green)" }}>{w} V</span></div>
            <div><span className="font-bold" style={{ color: "var(--amber)" }}>{d} P</span></div>
            <div><span className="font-bold" style={{ color: "var(--red)" }}>{l} S</span></div>
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <div className="font-semibold mb-3">Matchup</div>
        {mstats.length === 0 ? (
          <div className="text-sm" style={{ color: "var(--text-dim)" }}>Nessun dato ancora disponibile.</div>
        ) : (
          mstats.map((m) => (
            <div key={m.name} className="mb-3">
              <div className="flex justify-between text-sm mb-1"><span>{m.name}</span><span className="font-semibold">{m.rate}%</span></div>
              <div className="progress-track h-2"><div className="progress-fill" style={{ width: `${m.rate}%` }} /></div>
            </div>
          ))
        )}
      </Card>

      <Card>
        <div className="font-semibold mb-3">Statistiche tornei</div>
        <div className="grid grid-cols-4 text-center gap-2">
          <div><div className="text-xl font-extrabold">{tournaments.length}</div><div className="text-xs" style={{ color: "var(--text-dim)" }}>giocati</div></div>
          <div><div className="text-xl font-extrabold">{wins}</div><div className="text-xs" style={{ color: "var(--text-dim)" }}>vittorie</div></div>
          <div><div className="text-xl font-extrabold">{topCut}</div><div className="text-xs" style={{ color: "var(--text-dim)" }}>Top Cut</div></div>
          <div><div className="text-xl font-extrabold">{cp}</div><div className="text-xs" style={{ color: "var(--text-dim)" }}>CP</div></div>
        </div>
      </Card>
    </div>
  );
}
