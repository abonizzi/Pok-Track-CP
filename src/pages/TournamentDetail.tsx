import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { estimateCP, EVENT_TYPES, EventType } from "../lib/cp";
import { Card, Badge, Button, Input, Select, toast } from "../components/ui";
import { useDeckCategories } from "../hooks/useDeckCategories";
import DeckSelect from "../components/DeckSelect";

const CAT_BADGE: any = {
  "League Challenge": "b-lc",
  "League Cup": "b-lcup",
  "Regional Championship": "b-reg",
  "International Championship": "b-int",
};
const MULTI_DAY_EVENTS = ["Regional Championship"];
const SEASON_OPTIONS = [2025, 2026, 2027, 2028];
const CUT_LABELS: Record<string, string[]> = {
  top8: ["Quarti di finale", "Semifinale", "Finale"],
  top4: ["Semifinale", "Finale"],
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
  if (name === "BYE") {
    return (
      <div style={{ height: size, minWidth: size, borderRadius: size / 2, background: "var(--card-border)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8px", color: "var(--text-dim)", fontWeight: 800, fontSize: Math.round(size * 0.34) }}>
        BYE
      </div>
    );
  }
  return (
    <div style={{ width: size, height: size, minWidth: size, borderRadius: "50%", background: hashColor(name), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: Math.round(size * 0.36) }}>
      {initials(name)}
    </div>
  );
}
function PhaseBadge({ phase }: { phase: string }) {
  const isTop = phase === "topcut";
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: isTop ? "rgba(244,196,48,.18)" : "rgba(79,166,232,.18)", color: isTop ? "var(--amber)" : "var(--blue)" }}>
      {isTop ? "TOP CUT" : "SWISS"}
    </span>
  );
}

// Form di inserimento/modifica di un round Bo3 (W/L/T), riutilizzato sia per i round
// Swiss sia per gli stage del Top Cut.
function RoundForm({
  title, opponent, setOpponent, decks, addDeck, games, setGame, isBye, setIsBye, allowBye, result, saving, onSave, onCancel, saveLabel,
}: any) {
  const g3locked = (games[0] === "W" && games[1] === "W") || (games[0] === "L" && games[1] === "L");
  return (
    <>
      <Card className="mb-3 mt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>{title}</div>
          {onCancel && <button onClick={onCancel} className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Annulla modifica</button>}
        </div>
        {allowBye && (
          <label className="flex items-center gap-2 text-sm mb-3" style={{ color: "var(--text-dim)" }}>
            <input type="checkbox" checked={isBye} onChange={(e) => setIsBye(e.target.checked)} />
            Turno di BYE
          </label>
        )}
        {!isBye && (
          <div>
            <div className="text-xs font-semibold mb-2" style={{ color: "var(--text-dim)" }}>Mazzo avversario</div>
            <DeckSelect value={opponent} onChange={setOpponent} decks={decks} onAddNew={addDeck} placeholder="Seleziona il mazzo avversario" />
          </div>
        )}
      </Card>

      {!isBye && [0, 1, 2].map((i: number) => {
        const disabled = i === 2 && g3locked;
        return (
          <Card key={i} className={`mb-3 ${disabled ? "opacity-60" : ""}`}>
            <div className="text-sm font-semibold mb-2">GAME {i + 1}</div>
            <div className="grid grid-cols-3 gap-2">
              {["W", "L", "T"].map((v) => (
                <button key={v} disabled={disabled} onClick={() => setGame(i, v)}
                  className={`wlt-btn ${games[i] === v ? (v === "W" ? "sel-w" : v === "L" ? "sel-l" : "sel-t") : ""}`}>
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
            <div className="text-sm" style={{ color: "var(--text-dim)" }}>{isBye ? "Turno di riposo" : opponent}</div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xl font-bold">{result.score}</span>
              <span className="font-bold" style={{ color: result.col }}>+{result.pts} punti</span>
            </div>
          </Card>
          <Button cta className="py-3 mb-8 w-full" disabled={saving} onClick={onSave}>{saveLabel}</Button>
        </>
      ) : (
        <div className="text-[11px] mb-8" style={{ color: "var(--text-dim)" }}>
          {isBye ? "Conferma il BYE per registrarlo." : "Seleziona il mazzo avversario e completa i game."}
        </div>
      )}
    </>
  );
}

export default function TournamentDetail() {
  const { id } = useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const { decks, addDeck } = useDeckCategories();
  const [t, setT] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingTournament, setDeletingTournament] = useState(false);

  // modalità modifica torneo
  const [editingTournament, setEditingTournament] = useState(false);
  const [tForm, setTForm] = useState<any>(null);

  // form round Swiss (nuovo o in modifica)
  const [swissOpponent, setSwissOpponent] = useState("");
  const [swissGames, setSwissGames] = useState<(string | null)[]>([null, null, null]);
  const [swissBye, setSwissBye] = useState(false);
  const [editingSwiss, setEditingSwiss] = useState<any>(null);

  // form round Top Cut (nuovo o in modifica)
  const [cutOpponent, setCutOpponent] = useState("");
  const [cutGames, setCutGames] = useState<(string | null)[]>([null, null, null]);
  const [editingCut, setEditingCut] = useState<any>(null);

  async function load() {
    const { data: tour } = await supabase.from("tournaments").select("*").eq("id", id).maybeSingle();
    setT(tour);
    const { data: ms } = await supabase.from("matches").select("*").eq("tournament_id", id).order("round", { ascending: true });
    setMatches(ms || []);
  }

  useEffect(() => { if (id && session?.user?.id) load(); }, [id, session]);

  if (!t) return <div className="text-sm" style={{ color: "var(--text-dim)" }}>Caricamento torneo...</div>;

  const isMultiDay = MULTI_DAY_EVENTS.includes(t.event_type);
  const swissMatches = matches.filter((m) => m.phase !== "topcut");
  const topcutMatches = matches.filter((m) => m.phase === "topcut").sort((a, b) => (a.topcut_stage || 0) - (b.topcut_stage || 0));

  const swissPlayed = swissMatches.length;
  const nextSwissRound = swissPlayed + 1;
  const roundsLimit = t.rounds ? Number(t.rounds) : null;
  const swissDone = roundsLimit ? swissPlayed >= roundsLimit : swissPlayed > 0 || !t.cut_type;
  const canAddSwiss = !!editingSwiss || !roundsLimit || swissPlayed < roundsLimit;

  const maxCutStages = t.cut_type === "top8" ? 3 : t.cut_type === "top4" ? 2 : 0;
  const cutStagesPlayed = topcutMatches.length;
  const lastCutMatch = topcutMatches[cutStagesPlayed - 1];
  const eliminated = cutStagesPlayed > 0 && lastCutMatch && lastCutMatch.result !== "V";
  const championWon = cutStagesPlayed === maxCutStages && maxCutStages > 0 && lastCutMatch && lastCutMatch.result === "V";
  const nextCutStage = editingCut ? editingCut.topcut_stage : cutStagesPlayed + 1;
  const canAddCut = !!t.cut_type && (!!editingCut || (cutStagesPlayed < maxCutStages && !eliminated && swissDone));
  const cutLabel = (stage: number) => (CUT_LABELS[t.cut_type] || [])[stage - 1] || `Turno Top Cut ${stage}`;

  function computeResult(games: (string | null)[], isBye: boolean) {
    if (isBye) return { type: "V", label: "VITTORIA (BYE)", emoji: "🎫", pts: 3, bg: "rgba(34,197,94,.14)", col: "var(--green)", score: "BYE" };
    const g3locked = (games[0] === "W" && games[1] === "W") || (games[0] === "L" && games[1] === "L");
    const g3active = games[0] && games[1] && games[0] !== games[1];
    if (!(g3locked || (g3active && games[2]))) return null;
    const wins = games.filter((x) => x === "W").length;
    const losses = games.filter((x) => x === "L").length;
    let r: any;
    if (wins > losses) r = { type: "V", label: "VITTORIA", emoji: "🟢", pts: 3, bg: "rgba(34,197,94,.14)", col: "var(--green)" };
    else if (losses > wins) r = { type: "S", label: "SCONFITTA", emoji: "🔴", pts: 0, bg: "rgba(239,68,68,.14)", col: "var(--red)" };
    else r = { type: "P", label: "PAREGGIO", emoji: "🟡", pts: 1, bg: "rgba(245,165,36,.14)", col: "var(--amber)" };
    r.score = `${wins}-${losses}`;
    return r;
  }

  const swissResult = swissOpponent || swissBye ? computeResult(swissGames, swissBye) : null;
  const cutResult = cutOpponent ? computeResult(cutGames, false) : null;

  function setSwissGame(i: number, v: string) {
    setSwissGames((prev) => { const c = [...prev]; c[i] = c[i] === v ? null : v; if (i < 2) c[2] = null; return c; });
  }
  function setCutGame(i: number, v: string) {
    setCutGames((prev) => { const c = [...prev]; c[i] = c[i] === v ? null : v; if (i < 2) c[2] = null; return c; });
  }
  function resetSwissForm() { setEditingSwiss(null); setSwissOpponent(""); setSwissGames([null, null, null]); setSwissBye(false); }
  function resetCutForm() { setEditingCut(null); setCutOpponent(""); setCutGames([null, null, null]); }

  // ---------- Modifica torneo (tutti i campi) ----------
  function startEditTournament() {
    setTForm({
      event_type: t.event_type, name: t.name, event_date: t.event_date, location: t.location || "",
      entry_cost: t.entry_cost ?? "", participants: t.participants ?? "", rounds: t.rounds ?? "",
      placement: t.placement ?? "", season: t.season, cut_type: t.cut_type || "",
    });
    setEditingTournament(true);
  }
  async function saveTournamentEdit() {
    const placement = Number(tForm.placement) || null;
    const participants = Number(tForm.participants) || null;
    const cp = placement && participants ? (await estimateCP(tForm.event_type, participants, placement, Number(tForm.season))) || 0 : 0;
    const payload = {
      event_type: tForm.event_type,
      name: tForm.name,
      event_date: tForm.event_date,
      location: tForm.location || null,
      entry_cost: Number(tForm.entry_cost) || 0,
      participants,
      rounds: Number(tForm.rounds) || null,
      placement,
      season: Number(tForm.season),
      cut_type: tForm.cut_type || null,
      cp_earned: cp,
    };
    const { error } = await supabase.from("tournaments").update(payload).eq("id", t.id);
    if (error) { toast(error.message); return; }
    setT((prev: any) => ({ ...prev, ...payload }));
    setEditingTournament(false);
    toast("Torneo aggiornato ✅");
  }

  async function updateDeck(val: string) {
    setT((prev: any) => ({ ...prev, deck: val }));
    await supabase.from("tournaments").update({ deck: val }).eq("id", t.id);
  }

  async function deleteTournament() {
    if (!window.confirm(`Eliminare il torneo "${t.name}" e tutti i suoi round? L'azione non è reversibile.`)) return;
    setDeletingTournament(true);
    await supabase.from("matches").delete().eq("tournament_id", t.id);
    const { error } = await supabase.from("tournaments").delete().eq("id", t.id);
    setDeletingTournament(false);
    if (error) { toast(error.message); return; }
    toast("Torneo eliminato");
    navigate("/tornei");
  }

  // ---------- Round Swiss ----------
  async function startEditSwiss(m: any) {
    if (m.opponent_archetype === "BYE") { setSwissBye(true); setSwissGames([null, null, null]); }
    else {
      setSwissBye(false);
      const { data: gs } = await supabase.from("games").select("*").eq("match_id", m.id).order("game_number", { ascending: true });
      const arr: (string | null)[] = [null, null, null];
      (gs || []).forEach((r: any) => { arr[r.game_number - 1] = r.result; });
      setSwissGames(arr);
    }
    setSwissOpponent(m.opponent_archetype);
    setEditingSwiss(m);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }
  async function saveSwissRound() {
    if (!swissResult || !session?.user?.id) return;
    if (!swissBye && !swissOpponent) return;
    setSaving(true);
    const opponentName = swissBye ? "BYE" : swissOpponent;
    if (editingSwiss) {
      const { error } = await supabase.from("matches").update({ opponent_archetype: opponentName, result: swissResult.type, score: swissResult.score, points: swissResult.pts }).eq("id", editingSwiss.id);
      if (error) { toast(error.message); setSaving(false); return; }
      await supabase.from("games").delete().eq("match_id", editingSwiss.id);
      if (!swissBye) {
        const rows = swissGames.map((r, i) => (r ? { match_id: editingSwiss.id, user_id: session.user.id, game_number: i + 1, result: r } : null)).filter(Boolean);
        if (rows.length) await supabase.from("games").insert(rows as any);
      }
      toast("Round aggiornato ✅");
    } else {
      const { data: match, error } = await supabase.from("matches").insert({
        user_id: session.user.id, tournament_id: t.id, round: swissPlayed + topcutMatches.length + 1,
        opponent_archetype: opponentName, result: swissResult.type, score: swissResult.score, points: swissResult.pts,
        phase: "swiss", day: isMultiDay ? 1 : 1,
      }).select().single();
      if (error) { toast(error.message); setSaving(false); return; }
      if (!swissBye) {
        const rows = swissGames.map((r, i) => (r ? { match_id: match.id, user_id: session.user.id, game_number: i + 1, result: r } : null)).filter(Boolean);
        if (rows.length) await supabase.from("games").insert(rows as any);
      }
      toast("Round salvato ✅");
    }
    setSaving(false);
    resetSwissForm();
    load();
  }

  // ---------- Round Top Cut ----------
  async function startEditCut(m: any) {
    const { data: gs } = await supabase.from("games").select("*").eq("match_id", m.id).order("game_number", { ascending: true });
    const arr: (string | null)[] = [null, null, null];
    (gs || []).forEach((r: any) => { arr[r.game_number - 1] = r.result; });
    setCutGames(arr);
    setCutOpponent(m.opponent_archetype);
    setEditingCut(m);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }
  async function saveCutRound() {
    if (!cutResult || !cutOpponent || !session?.user?.id) return;
    setSaving(true);
    if (editingCut) {
      const { error } = await supabase.from("matches").update({ opponent_archetype: cutOpponent, result: cutResult.type, score: cutResult.score, points: cutResult.pts }).eq("id", editingCut.id);
      if (error) { toast(error.message); setSaving(false); return; }
      await supabase.from("games").delete().eq("match_id", editingCut.id);
      const rows = cutGames.map((r, i) => (r ? { match_id: editingCut.id, user_id: session.user.id, game_number: i + 1, result: r } : null)).filter(Boolean);
      if (rows.length) await supabase.from("games").insert(rows as any);
      // se non è più una vittoria, i turni successivi del bracket non sono più validi
      if (cutResult.type !== "V") {
        const toDrop = topcutMatches.filter((m) => (m.topcut_stage || 0) > (editingCut.topcut_stage || 0));
        if (toDrop.length) {
          await supabase.from("matches").delete().in("id", toDrop.map((m) => m.id));
          toast(`Round aggiornato — ${toDrop.length} turno/i successivo/i del bracket rimossi (non più validi)`);
        } else {
          toast("Round aggiornato ✅");
        }
      } else {
        toast("Round aggiornato ✅");
      }
    } else {
      const { data: match, error } = await supabase.from("matches").insert({
        user_id: session.user.id, tournament_id: t.id, round: swissPlayed + topcutMatches.length + 1,
        opponent_archetype: cutOpponent, result: cutResult.type, score: cutResult.score, points: cutResult.pts,
        phase: "topcut", day: isMultiDay ? 2 : 1, topcut_stage: nextCutStage,
      }).select().single();
      if (error) { toast(error.message); setSaving(false); return; }
      const rows = cutGames.map((r, i) => (r ? { match_id: match.id, user_id: session.user.id, game_number: i + 1, result: r } : null)).filter(Boolean);
      if (rows.length) await supabase.from("games").insert(rows as any);
      toast(cutResult.type === "V" ? "Turno Top Cut vinto! ✅" : "Turno Top Cut registrato");
    }
    setSaving(false);
    resetCutForm();
    load();
  }

  // ---------- Elimina round (Swiss o Top Cut) ----------
  async function deleteMatch(m: any) {
    if (!window.confirm("Eliminare questo round? L'azione non è reversibile.")) return;
    const idsToDelete = [m.id];
    if (m.phase === "topcut") {
      const later = topcutMatches.filter((x) => (x.topcut_stage || 0) > (m.topcut_stage || 0));
      later.forEach((x) => idsToDelete.push(x.id));
    }
    const { error } = await supabase.from("matches").delete().in("id", idsToDelete);
    if (error) { toast(error.message); return; }
    if (editingSwiss?.id === m.id) resetSwissForm();
    if (editingCut?.id === m.id) resetCutForm();
    toast(idsToDelete.length > 1 ? `Round eliminato insieme a ${idsToDelete.length - 1} turno/i successivo/i del bracket` : "Round eliminato");
    load();
  }

  function matchRow(m: any) {
    const col = m.result === "V" ? "var(--green)" : m.result === "S" ? "var(--red)" : "var(--amber)";
    const dot = m.result === "V" ? "🟢" : m.result === "S" ? "🔴" : "🟡";
    const isTop = m.phase === "topcut";
    const isEditing = (isTop ? editingCut?.id : editingSwiss?.id) === m.id;
    const label = isTop ? cutLabel(m.topcut_stage || 1) : `R${m.round}`;
    return (
      <Card key={m.id} className="mb-2" style={{ borderLeft: `4px solid ${col}`, background: isEditing ? "rgba(79,166,232,.10)" : undefined }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <DeckBadge name={m.opponent_archetype} size={28} />
            <span className="text-sm font-semibold">{label}</span>
            <span className="text-sm" style={{ color: "var(--text-dim)" }}>{m.opponent_archetype === "BYE" ? "Turno di riposo" : m.opponent_archetype}</span>
            <PhaseBadge phase={m.phase || "swiss"} />
            {isMultiDay && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--card-border)", color: "var(--text-dim)" }}>DAY {m.day || 1}</span>}
          </div>
          <div className="flex items-center gap-3 text-sm shrink-0">
            <span>{dot} {m.score}</span><span className="font-bold" style={{ color: col }}>+{m.points}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2 pt-2" style={{ borderTop: "1px solid var(--card-border)" }}>
          <button onClick={() => (isTop ? startEditCut(m) : startEditSwiss(m))} className="text-xs font-semibold" style={{ color: "var(--blue)" }}>✏️ Modifica</button>
          <button onClick={() => deleteMatch(m)} className="text-xs font-semibold" style={{ color: "var(--red)" }}>🗑️ Elimina</button>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <button onClick={() => navigate("/tornei")} className="text-sm mb-4" style={{ color: "var(--text-dim)" }}>← Torna ai tornei</button>

      <Card className="mb-4">
        {!editingTournament ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge cls={CAT_BADGE[t.event_type]}>{t.event_type}</Badge>
                <div className="font-bold text-lg mt-1">{t.name}</div>
                <div className="text-xs" style={{ color: "var(--text-dim)" }}>
                  {t.event_date}{t.location ? " · " + t.location : ""} · {t.participants || "-"} partecipanti
                  {t.cut_type && ` · ${t.cut_type === "top8" ? "Top 8" : "Top 4"}`}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-extrabold" style={{ color: "var(--blue)" }}>+{t.cp_earned || 0} CP</div>
                <div className="text-xs" style={{ color: "var(--text-dim)" }}>{t.placement ? t.placement + "°" : "piazz. da inserire"} · Stagione {t.season}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: "1px solid var(--card-border)" }}>
              <DeckBadge name={t.deck || "?"} size={40} />
              <div className="flex-1">
                <label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Mazzo usato</label>
                <div className="mt-1">
                  <DeckSelect value={t.deck || ""} onChange={updateDeck} decks={decks} onAddNew={addDeck} placeholder="Seleziona il tuo mazzo" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: "1px solid var(--card-border)" }}>
              <button onClick={startEditTournament} className="text-sm font-semibold" style={{ color: "var(--blue)" }}>✏️ Modifica torneo</button>
              <button onClick={deleteTournament} disabled={deletingTournament} className="text-sm font-semibold" style={{ color: "var(--red)" }}>🗑️ Elimina torneo</button>
            </div>
          </>
        ) : (
          <div className="grid gap-3">
            <div className="font-bold">Modifica torneo</div>
            <div>
              <label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Tipo evento</label>
              <Select value={tForm.event_type} onChange={(e: any) => setTForm({ ...tForm, event_type: e.target.value })}>
                {EVENT_TYPES.map((et) => <option key={et}>{et}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Nome torneo</label>
              <Input value={tForm.name} onChange={(e: any) => setTForm({ ...tForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Data</label><Input type="date" value={tForm.event_date} onChange={(e: any) => setTForm({ ...tForm, event_date: e.target.value })} /></div>
              <div><label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Città/Luogo</label><Input value={tForm.location} onChange={(e: any) => setTForm({ ...tForm, location: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Iscrizione (€)</label><Input type="number" value={tForm.entry_cost} onChange={(e: any) => setTForm({ ...tForm, entry_cost: e.target.value })} /></div>
              <div><label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Partecipanti</label><Input type="number" value={tForm.participants} onChange={(e: any) => setTForm({ ...tForm, participants: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Turni Swiss</label><Input type="number" value={tForm.rounds} onChange={(e: any) => setTForm({ ...tForm, rounds: e.target.value })} /></div>
              <div><label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Piazzamento finale</label><Input type="number" value={tForm.placement} onChange={(e: any) => setTForm({ ...tForm, placement: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Stagione</label>
                <select className="w-full p-3" value={tForm.season} onChange={(e: any) => setTForm({ ...tForm, season: Number(e.target.value) })}>
                  {SEASON_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Top Cut</label>
                <select className="w-full p-3" value={tForm.cut_type} onChange={(e: any) => setTForm({ ...tForm, cut_type: e.target.value })}>
                  <option value="">Nessuno</option>
                  <option value="top4">Top 4</option>
                  <option value="top8">Top 8</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button cta className="flex-1" onClick={saveTournamentEdit}>Salva modifiche</Button>
              <Button onClick={() => setEditingTournament(false)} style={{ color: "var(--text-dim)" } as any}>Annulla</Button>
            </div>
          </div>
        )}
      </Card>

      {/* ---- Round Swiss ---- */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold">Round Swiss</h3>
        <span className="text-xs" style={{ color: "var(--text-dim)" }}>{swissPlayed}{roundsLimit ? " / " + roundsLimit : ""}</span>
      </div>
      <div className="text-[11px] mb-2" style={{ color: "var(--text-dim)" }}>
        I punti dei round servono solo a determinare il piazzamento finale del torneo — i Championship Point si ottengono esclusivamente dal piazzamento, sopra.
      </div>

      {swissMatches.length === 0 ? (
        <div className="text-sm mb-3" style={{ color: "var(--text-dim)" }}>Nessun round Swiss registrato.</div>
      ) : swissMatches.map(matchRow)}

      {canAddSwiss ? (
        <RoundForm
          title={editingSwiss ? `Modifica Round ${editingSwiss.round}` : `Round ${nextSwissRound}`}
          opponent={swissOpponent} setOpponent={setSwissOpponent}
          decks={decks} addDeck={addDeck}
          games={swissGames} setGame={setSwissGame}
          isBye={swissBye} setIsBye={setSwissBye} allowBye
          result={swissResult} saving={saving}
          onSave={saveSwissRound} onCancel={editingSwiss ? resetSwissForm : null}
          saveLabel={editingSwiss ? "Aggiorna Round" : "Salva Round"}
        />
      ) : (
        <Card className="text-sm mt-3 mb-6" style={{ color: "var(--text-dim)" }}>Tutti i round Swiss previsti ({roundsLimit}) sono stati registrati.</Card>
      )}

      {/* ---- Top Cut ---- */}
      {t.cut_type && (
        <>
          <div className="flex items-center justify-between mb-1 mt-6">
            <h3 className="font-bold">Top Cut — {t.cut_type === "top8" ? "Top 8" : "Top 4"}</h3>
            <span className="text-xs" style={{ color: "var(--text-dim)" }}>{cutStagesPlayed} / {maxCutStages}</span>
          </div>

          {!swissDone ? (
            <Card className="text-sm" style={{ color: "var(--text-dim)" }}>Completa prima i round Swiss ({swissPlayed}/{roundsLimit}) per sbloccare il Top Cut.</Card>
          ) : (
            <>
              {topcutMatches.length > 0 && topcutMatches.map(matchRow)}

              {eliminated && (
                <Card className="mt-2" style={{ background: "rgba(239,68,68,.12)", borderColor: "transparent" }}>
                  <div className="font-semibold" style={{ color: "var(--red)" }}>❌ Eliminato al Top Cut — {cutLabel(lastCutMatch.topcut_stage || cutStagesPlayed)}</div>
                </Card>
              )}
              {championWon && (
                <Card className="mt-2" style={{ background: "rgba(244,196,48,.15)", borderColor: "transparent" }}>
                  <div className="font-semibold" style={{ color: "var(--amber)" }}>🏆 Torneo vinto! Finale conclusa con una vittoria.</div>
                </Card>
              )}

              {canAddCut && (
                <RoundForm
                  title={editingCut ? `Modifica ${cutLabel(editingCut.topcut_stage)}` : `Prossimo turno: ${cutLabel(nextCutStage)}`}
                  opponent={cutOpponent} setOpponent={setCutOpponent}
                  decks={decks} addDeck={addDeck}
                  games={cutGames} setGame={setCutGame}
                  isBye={false} setIsBye={() => {}} allowBye={false}
                  result={cutResult} saving={saving}
                  onSave={saveCutRound} onCancel={editingCut ? resetCutForm : null}
                  saveLabel={editingCut ? "Aggiorna turno" : "Salva turno"}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
