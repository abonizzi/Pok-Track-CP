import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Card, Badge, Button, EmptyState } from "../components/ui";
import { useNavigate } from "react-router-dom";

const CAT_BADGE: any = {
  "League Challenge": "b-lc",
  "League Cup": "b-lcup",
  "Regional Championship": "b-reg",
  "International Championship": "b-int",
};

function hashColor(str: string) {
  let h = 0;
  for (let i = 0; i < (str || "?").length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360},60%,42%)`;
}
function initials(str: string) {
  const s = (str || "?").trim();
  if (!s) return "?";
  return s.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}
function DeckBadge({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, minWidth: size, borderRadius: "50%", background: hashColor(name), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: Math.round(size * 0.36) }}>
      {initials(name)}
    </div>
  );
}

export default function Tournaments() {
  const { session, profile } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from("tournaments")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("season", profile?.season || 2027)
      .order("event_date", { ascending: false })
      .then(({ data }) => setRows(data || []));
  }, [session, profile]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Tornei</h2>
        <Button cta className="text-sm" onClick={() => navigate("/tornei/nuovo")}>+ Nuovo</Button>
      </div>
      <div className="grid gap-3">
        {rows.length === 0 ? (
          <EmptyState icon="🏆" title="Nessun torneo registrato" sub="Registra il tuo primo torneo per iniziare a tracciare i CP." />
        ) : (
          rows.map((t) => (
            <button key={t.id} onClick={() => navigate(`/tornei/${t.id}`)} className="card p-4 w-full text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <DeckBadge name={t.deck || "?"} size={36} />
                  <div>
                    <Badge cls={CAT_BADGE[t.event_type]}>{t.event_type}</Badge>
                    <div className="font-semibold mt-1">{t.name}</div>
                    <div className="text-xs" style={{ color: "var(--text-dim)" }}>
                      {t.event_date}{t.location ? " · " + t.location : ""} · {t.participants || "-"} partecipanti
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold" style={{ color: "var(--blue)" }}>+{t.cp_earned || 0} CP</div>
                  <div className="text-xs" style={{ color: "var(--text-dim)" }}>{t.placement ? t.placement + "°" : "-"} · € {Number(t.entry_cost || 0).toFixed(2)}</div>
                  {!t.placement && <div className="text-[11px] font-semibold mt-0.5" style={{ color: "var(--amber)" }}>🟡 Piazzamento da inserire</div>}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
