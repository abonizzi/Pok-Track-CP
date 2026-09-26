import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { estimateCP } from "../lib/cp";
import { Card, Badge, Button, Input, toast } from "../components/ui";

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
    <div
      style={{
        width: size, height: size, minWidth: size, borderRadius: "50%",
        background: hashColor(name), display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 800, fontSize: Math.round(size * 0.36),
      }}
    >
      {initials(name)}
    </div>
  );
}

export default function TournamentDetail() {
  const { id } = useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [t, setT] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [deckNames, setDeckNames] = useState<string[]>([]);
  const [opponent, setOpponent] = useState("");
  const [games, setGames] = useState<(string | null)[]>([null, null, null]);
  const [saving, setSaving] = useState(false);
  const [editingMatch, setEditingMatch] = useState<any>(null); // null = sto aggiungendo un round nuovo
  const [deletingTournament, setDeletingTournament] = useState(false);

  async function load() {
    const { data: tour } = await supabase.from("tournaments").select("*").eq("id", id).maybeSingle();
    setT(tour);
    const { data: ms } = await supabase.from("matches").select("*").eq("tournament_id", id).order("round", { ascending: true });
    setMatches(ms || []);
    const { data: decks } = await supabase.from("tournaments").select("deck").eq("user_id", session?.user?.id);
    const { data: opps } = await supabase.from("matches").select("opponent_archetype").eq("user_id", session?.user?.id);
    const names = new Set<string>();
    (decks || []).forEach((d: any) => d.deck && names.add(d.deck));
    (opps || []).forEach((o: any) => o.opponent_archetype && names.add(o.opponent_archetype));
    setDeckNames([...names]);
  }

  useEffect(() => { if (id && session?.user?.id) load(); }, [id, session]);

  if (!t) return <div className="text-sm" style={{ color: "var(--text-dim)" }}>Caricamento torneo...</div>;

  const roundsPlayed = matches.length;
  const nextRound = roundsPlayed + 1;
  const round = editingMatch ? editingMatch.round : nextRound;
  const roundsLimit = t.rounds ? Number(t.rounds) : null;
  const canAddRound = editingMatch || !roundsLimit || roundsPlayed < roundsLimit;

  const g = games;
  const g3locked = (g[0] === "W" && g[1] === "W") || (g[0] === "L" && g[1] === "L");
  const g3active = g[0] && g[1] && g[0] !== g[1];
  let result: any = null;
  if (opponent && (g3locked || (g3active && g[2]))) {
    const wins = g.filter((x) => x === "W").length;
    const losses = g.filter((x) => x === "L").length;
    if (wins > losses) result = { type: "V", label: "VITTORIA", emoji: "🟢", pts: 3, bg: "rgba(34,197,94,.14)", col: "var(--green)" };
    else if (losses > wins) result = { type: "S", label: "SCONFITTA", emoji: "🔴", pts: 0, bg: "rgba(239,68,68,.14)", col: "var(--red)" };
    else result = { type: "P", label: "PAREGGIO", emoji: "🟡", pts: 1, bg: "rgba(245,165,36,.14)", col: "var(--amber)" };
    result.score = `${wins}-${losses}`;
  }

  function setGame(i: number, v: string) {
    setGames((prev) => {
      const copy = [...prev];
      copy[i] = copy[i] === v ? null : v;
      if (i < 2) copy[2] = null;
      return copy;
    });
  }

  async function updateDeck(val: string) {
    setT((prev: any) => ({ ...prev, deck: val }));
    await supabase.from("tournaments").update({ deck: val }).eq("id", t.id);
  }

  async function updatePlacement(val: string) {
    const placement = Number(val) || null;
    const cp = placement ? (await estimateCP(t.event_type, Number(t.participants), placement, t.season)) || 0 : 0;
    setT((prev: any) => ({ ...prev, placement, cp_earned: cp }));
    await supabase.from("tournaments").update({ placement, cp_earned: cp }).eq("id", t.id);
    toast(placement ? `Piazzamento salvato · +${cp} CP` : "Piazzamento rimosso");
  }

  async function updateSeason(val: string) {
    const season = Number(val);
    const cp = t.placement ? (await estimateCP(t.event_type, Number(t.participants), Number(t.placement), season)) || 0 : t.cp_earned;
    setT((prev: any) => ({ ...prev, season, cp_earned: cp }));
    await supabase.from("tournaments").update({ season, cp_earned: cp }).eq("id", t.id);
    toast(`Stagione aggiornata a ${season}${t.placement ? ` · +${cp} CP` : ""}`);
  }

  function resetForm() {
    setEditingMatch(null);
    setOpponent("");
    setGames([null, null, null]);
  }

  async function startEdit(m: any) {
    const { data: gs } = await supabase.from("games").select("*").eq("match_id", m.id).order("game_number", { ascending: true });
    const arr: (string | null)[] = [null, null, null];
    (gs || []).forEach((gRow: any) => { arr[gRow.game_number - 1] = gRow.result; });
    setEditingMatch(m);
    setOpponent(m.opponent_archetype);
    setGames(arr);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  async function deleteMatch(matchId: string) {
    if (!window.confirm("Eliminare questo round? L'azione non è reversibile.")) return;
    const { error } = await supabase.from("matches").delete().eq("id", matchId);
    if (error) { toast(error.message); return; }
    if (editingMatch?.id === matchId) resetForm();
    toast("Round eliminato");
    load();
  }

  async function saveRound() {
    if (!result || !opponent || !session?.user?.id) return;
    setSaving(true);
    const wins = g.filter((x) => x === "W").length;
    const losses = g.filter((x) => x === "L").length;

    if (editingMatch) {
      // aggiorno un round già esistente
      const { error } = await supabase
        .from("matches")
        .update({ opponent_archetype: opponent, result: result.type, score: result.score, points: result.pts })
        .eq("id", editingMatch.id);
      if (error) { toast(error.message); setSaving(false); return; }
      await supabase.from("games").delete().eq("match_id", editingMatch.id);
      const gameRows = g
        .map((r, i) => (r ? { match_id: editingMatch.id, user_id: session.user.id, game_number: i + 1, result: r } : null))
        .filter(Boolean);
      if (gameRows.length) await supabase.from("games").insert(gameRows as any);
      toast("Round aggiornato ✅");
    } else {
      // creo un round nuovo
      const { data: match, error } = await supabase
        .from("matches")
        .insert({
          user_id: session.user.id,
          tournament_id: t.id,
          round: nextRound,
          opponent_archetype: opponent,
          result: result.type,
          score: result.score,
          points: result.pts,
        })
        .select()
        .single();
      if (error) { toast(error.message); setSaving(false); return; }
      const gameRows = g
        .map((r, i) => (r ? { match_id: match.id, user_id: session.user.id, game_number: i + 1, result: r } : null))
        .filter(Boolean);
      if (gameRows.length) await supabase.from("games").insert(gameRows as any);
      toast("Round salvato ✅");
    }

    setSaving(false);
    resetForm();
    load();
  }

  async function deleteTournament() {
    if (!window.confirm(`Eliminare il torneo "${t.name}" e tutti i suoi round? L'azione non è reversibile.`)) return;
    setDeletingTournament(true);
    // elimino prima i match collegati (i game si cancellano da soli a cascata), poi il torneo
    await supabase.from("matches").delete().eq("tournament_id", t.id);
    const { error } = await supabase.from("tournaments").delete().eq("id", t.id);
    setDeletingTournament(false);
    if (error) { toast(error.message); return; }
    toast("Torneo eliminato");
    navigate("/tornei");
  }

  return (
    <div>
      <button onClick={() => navigate("/tornei")} className="text-sm mb-4" style={{ color: "var(--text-dim)" }}>← Torna ai tornei</button>

      <Card className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge cls={CAT_BADGE[t.event_type]}>{t.event_type}</Badge>
            <div className="font-bold text-lg mt-1">{t.name}</div>
            <div className="text-xs" style={{ color: "var(--text-dim)" }}>{t.event_date}{t.location ? " · " + t.location : ""}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-extrabold" style={{ color: "var(--blue)" }}>+{t.cp_earned || 0} CP</div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: "1px solid var(--card-border)" }}>
          <DeckBadge name={t.deck || "?"} size={40} />
          <div className="flex-1">
            <label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Mazzo usato</label>
            <Input list="deck-suggestions" placeholder="Es. Charizard ex" defaultValue={t.deck || ""} onBlur={(e: any) => updateDeck(e.target.value)} className="mt-1 p-2 text-sm" />
          </div>
        </div>

        <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--card-border)" }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>
                Piazzamento finale {!t.placement && "(non ancora inserito)"}
              </label>
              <Input type="number" placeholder="Es. 5" defaultValue={t.placement || ""} onBlur={(e: any) => updatePlacement(e.target.value)} className="mt-1 p-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Stagione</label>
              <select value={t.season} onChange={(e: any) => updateSeason(e.target.value)} className="w-full mt-1 p-2 text-sm">
                {[2025, 2026, 2027, 2028].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--card-border)" }}>
          <button
            onClick={deleteTournament}
            disabled={deletingTournament}
            className="text-sm font-semibold"
            style={{ color: "var(--red)" }}
          >
            🗑️ Elimina torneo
          </button>
        </div>
      </Card>

      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold">Matchup giocati</h3>
        <span className="text-xs" style={{ color: "var(--text-dim)" }}>Round {Math.min(nextRound, roundsLimit || nextRound)}{roundsLimit ? " / " + roundsLimit : ""}</span>
      </div>
      <div className="text-[11px] mb-2" style={{ color: "var(--text-dim)" }}>
        I punti dei round servono solo a determinare il piazzamento finale del torneo — i Championship Point si ottengono esclusivamente dal piazzamento, sopra.
      </div>

      {matches.length === 0 ? (
        <div className="text-sm mb-3" style={{ color: "var(--text-dim)" }}>Nessun round registrato per questo torneo.</div>
      ) : (
        matches.map((m) => {
          const col = m.result === "V" ? "var(--green)" : m.result === "S" ? "var(--red)" : "var(--amber)";
          const dot = m.result === "V" ? "🟢" : m.result === "S" ? "🔴" : "🟡";
          const isEditing = editingMatch?.id === m.id;
          return (
            <Card key={m.id} className="mb-2" style={{ borderLeft: `4px solid ${col}`, background: isEditing ? "rgba(79,166,232,.10)" : undefined }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DeckBadge name={m.opponent_archetype} size={28} />
                  <span className="text-sm font-semibold">R{m.round}</span>
                  <span className="text-sm" style={{ color: "var(--text-dim)" }}>{m.opponent_archetype}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span>{dot} {m.score}</span><span className="font-bold" style={{ color: col }}>+{m.points}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2 pt-2" style={{ borderTop: "1px solid var(--card-border)" }}>
                <button onClick={() => startEdit(m)} className="text-xs font-semibold" style={{ color: "var(--blue)" }}>✏️ Modifica</button>
                <button onClick={() => deleteMatch(m.id)} className="text-xs font-semibold" style={{ color: "var(--red)" }}>🗑️ Elimina</button>
              </div>
            </Card>
          );
        })
      )}

      {canAddRound ? (
        <>
          <Card className="mb-3 mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>
                {editingMatch ? `Modifica mazzo avversario · Round ${round}` : `Mazzo avversario · Round ${round}`}
              </div>
              {editingMatch && (
                <button onClick={resetForm} className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Annulla modifica</button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <DeckBadge name={opponent || "?"} size={36} />
              <Input list="deck-suggestions" placeholder="Scrivi il mazzo avversario" value={opponent} onChange={(e: any) => setOpponent(e.target.value)} className="flex-1" />
            </div>
          </Card>

          {[0, 1, 2].map((i) => {
            const disabled = i === 2 && g3locked;
            return (
              <Card key={i} className={`mb-3 ${disabled ? "opacity-60" : ""}`}>
                <div className="text-sm font-semibold mb-2">GAME {i + 1}</div>
                <div className="grid grid-cols-3 gap-2">
                  {["W", "L", "T"].map((v) => (
                    <button key={v} disabled={disabled} onClick={() => setGame(i, v)}
                      className={`wlt-btn ${g[i] === v ? (v === "W" ? "sel-w" : v === "L" ? "sel-l" : "sel-t") : ""}`}>
                      {v}
                    </button>
                  ))}
                </div>
                {disabled && <div className="text-xs mt-2" style={{ color: "var(--text-dim)" }}>Match già deciso</div>}
              </Card>
            );
          })}

          {result ? (
            <>
              <Card className="mb-4" style={{ background: result.bg, borderColor: "transparent" }}>
                <div className="font-extrabold text-lg mb-1" style={{ color: result.col }}>{result.emoji} {result.label}</div>
                <div className="text-sm" style={{ color: "var(--text-dim)" }}>{opponent}</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xl font-bold">{result.score}</span>
                  <span className="font-bold" style={{ color: result.col }}>+{result.pts} punti</span>
                </div>
              </Card>
              <Button cta className="py-3 mb-8 w-full" disabled={saving} onClick={saveRound}>
                {editingMatch ? "Aggiorna Round" : "Salva Round"}
              </Button>
            </>
          ) : (
            <div className="text-[11px] mb-8" style={{ color: "var(--text-dim)" }}>Scrivi il mazzo avversario e completa i game per {editingMatch ? "aggiornare" : "registrare"} il round.</div>
          )}
        </>
      ) : (
        <Card className="text-sm mt-3 mb-8" style={{ color: "var(--text-dim)" }}>Tutti i round previsti ({roundsLimit}) sono stati registrati.</Card>
      )}

      <datalist id="deck-suggestions">
        {deckNames.map((n) => <option key={n} value={n} />)}
      </datalist>
    </div>
  );
}
