import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Card, EmptyState } from "../components/ui";

export default function History() {
  const { session } = useAuth();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.from("matches").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false })
      .then(({ data }) => setRows(data || []));
  }, [session]);

  const totalPts = rows.reduce((s, m) => s + (m.points || 0), 0);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Cronologia Match</h2>
      <div className="grid gap-2">
        {rows.length === 0 ? (
          <EmptyState icon="📜" title="Nessun match registrato" sub="Registra i tuoi round dalla sezione Matchup." />
        ) : (
          rows.map((m) => {
            const col = m.result === "V" ? "var(--green)" : m.result === "S" ? "var(--red)" : "var(--amber)";
            const dot = m.result === "V" ? "🟢" : m.result === "S" ? "🔴" : "🟡";
            return (
              <Card key={m.id} className="flex items-center justify-between" style={{ borderLeft: `4px solid ${col}` }}>
                <div className="flex items-center gap-2">
                  <span>{dot}</span><span className="text-sm font-semibold">R{m.round}</span>
                  <span className="text-sm" style={{ color: "var(--text-dim)" }}>{m.opponent_archetype}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span>{m.score}</span><span className="font-bold" style={{ color: col }}>+{m.points}</span>
                </div>
              </Card>
            );
          })
        )}
      </div>
      <Card className="mt-4 flex items-center justify-between">
        <span className="font-semibold">Totale Punti</span>
        <span className="text-xl font-extrabold">{totalPts} 🏅</span>
      </Card>
    </div>
  );
}
