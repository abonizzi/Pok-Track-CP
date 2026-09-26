import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Card, StatCard, Button } from "../components/ui";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { profile, session } = useAuth();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const season = profile?.season || 2027;

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from("tournaments")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("season", season)
      .then(({ data }) => { setTournaments(data || []); setLoading(false); });
  }, [session, season]);

  if (loading) {
    return (
      <div className="grid gap-4">
        <div className="h-28 rounded-2xl animate-pulse" style={{ background: "var(--card)" }} />
        <div className="h-40 rounded-2xl animate-pulse" style={{ background: "var(--card)" }} />
      </div>
    );
  }

  const cp = tournaments.reduce((s, t) => s + (t.cp_earned || 0), 0);
  const milestone = 200;
  const scale = Math.max(milestone, Math.ceil((cp + 1) / 100) * 100);
  const pct = Math.min(100, Math.round((cp / scale) * 100));
  const markerPct = Math.min(100, Math.round((milestone / scale) * 100));
  const cost = tournaments.reduce((s, t) => s + Number(t.entry_cost || 0), 0);
  const costPerCp = cp > 0 ? cost / cp : 0;
  const lc = tournaments.filter((t) => t.event_type === "League Challenge" && t.placement === 1).length;
  const lcup = tournaments.filter((t) => t.event_type === "League Cup" && t.placement === 1).length;
  const regs = tournaments.filter((t) => t.event_type === "Regional Championship");
  const ints = tournaments.filter((t) => t.event_type === "International Championship");

  return (
    <div className="grid gap-5">
      <div className="card p-6" style={{ background: "linear-gradient(135deg,var(--sidebar),#132550)" }}>
        <div className="flex items-center justify-between text-white/70 text-sm font-semibold tracking-wide mb-2">
          <span>🏅 CHAMPIONSHIP POINTS</span>
          <span>{season}</span>
        </div>
        <div className="text-white text-3xl font-extrabold mb-3">{cp} CP</div>
        <div className="progress-track h-3" style={{ position: "relative" }}>
          <div className="progress-fill" style={{ width: `${pct}%` }} />
          {cp < scale && (
            <div style={{ position: "absolute", top: -3, bottom: -3, left: `${markerPct}%`, width: 2, background: "#fff", opacity: 0.75 }} />
          )}
        </div>
        <div className="flex items-center justify-between text-white/60 text-xs mt-1">
          <span>Punteggio in continuo aggiornamento</span>
          <span>{cp >= milestone ? "🏅 Ace Trainer sbloccato (200 CP)" : `🎖️ Ace Trainer tra ${milestone - cp} CP`}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon="🏆" label="Tornei Totali" value={tournaments.length} />
        <StatCard icon="🥇" label="League Challenge Vinte" value={lc} sub="1° posto" />
        <StatCard icon="🏆" label="League Cup Vinte" value={lcup} sub="1° posto" />
        <StatCard icon="🌎" label="Regionali Giocati" value={regs.length} />
        <StatCard icon="🌐" label="Internazionali Giocati" value={ints.length} />
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x" style={{ borderColor: "var(--card-border)" }}>
          <div className="pb-3 sm:pb-0 sm:pr-4"><div className="text-xs" style={{ color: "var(--text-dim)" }}>Iscrizioni totali</div><div className="text-xl font-bold">€ {cost.toFixed(2)}</div></div>
          <div className="pt-3 sm:pt-0 sm:px-4"><div className="text-xs" style={{ color: "var(--text-dim)" }}>CP accumulati</div><div className="text-xl font-bold">{cp} CP</div></div>
          <div className="pt-3 sm:pt-0 sm:pl-4"><div className="text-xs" style={{ color: "var(--text-dim)" }}>Costo medio per CP</div><div className="text-xl font-bold">€ {costPerCp.toFixed(2)} / CP</div></div>
        </div>
      </Card>

      <Button cta className="text-base py-4" onClick={() => navigate("/tornei/nuovo")}>+ REGISTRA TORNEO</Button>
    </div>
  );
}
