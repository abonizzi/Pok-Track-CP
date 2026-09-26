import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Card, Button, Input, Select, toast } from "../components/ui";
import { estimateCP, EVENT_TYPES, EventType } from "../lib/cp";
import { useNavigate } from "react-router-dom";

export default function NewTournament() {
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const season = profile?.season || 2027;

  const [form, setForm] = useState({
    event_type: EVENT_TYPES[0] as EventType,
    name: "",
    deck: "",
    event_date: "",
    location: "",
    entry_cost: "",
    participants: "",
    rounds: "",
    placement: "",
  });
  const [cpEstimate, setCpEstimate] = useState<number | null>(null);
  const [deckNames, setDeckNames] = useState<string[]>([]);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.from("tournaments").select("deck").eq("user_id", session.user.id).then(({ data }) => {
      const names = new Set<string>();
      (data || []).forEach((d: any) => d.deck && names.add(d.deck));
      setDeckNames([...names]);
    });
  }, [session]);

  useEffect(() => {
    const p = Number(form.participants), pl = Number(form.placement);
    if (p && pl) {
      estimateCP(form.event_type, p, pl, season).then(setCpEstimate);
    } else {
      setCpEstimate(null);
    }
  }, [form.event_type, form.participants, form.placement, season]);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function save() {
    if (!form.name || !form.event_date) { toast("Compila nome e data del torneo"); return; }
    if (!session?.user?.id) return;
    const { error } = await supabase.from("tournaments").insert({
      user_id: session.user.id,
      event_type: form.event_type,
      name: form.name,
      deck: form.deck || null,
      event_date: form.event_date,
      location: form.location || null,
      entry_cost: Number(form.entry_cost) || 0,
      participants: Number(form.participants) || null,
      rounds: Number(form.rounds) || null,
      placement: Number(form.placement) || null,
      cp_earned: cpEstimate || 0,
      season,
    });
    if (error) { toast(error.message); return; }
    toast("Torneo salvato ✅");
    navigate("/tornei");
  }

  return (
    <div className="max-w-xl mx-auto">
      <button onClick={() => navigate("/tornei")} className="text-sm mb-4" style={{ color: "var(--text-dim)" }}>← Torna ai tornei</button>
      <Card className="grid gap-4 p-5">
        <h2 className="text-xl font-bold">Nuovo Torneo</h2>

        <div>
          <label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Tipo evento</label>
          <Select value={form.event_type} onChange={(e: any) => set("event_type", e.target.value)}>
            {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Nome torneo</label>
          <Input placeholder="Es. Bologna League Challenge" value={form.name} onChange={(e: any) => set("name", e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Mazzo usato</label>
          <Input list="deck-suggestions" placeholder="Es. Charizard ex" value={form.deck} onChange={(e: any) => set("deck", e.target.value)} />
          <datalist id="deck-suggestions">
            {deckNames.map((n) => <option key={n} value={n} />)}
          </datalist>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Data</label><Input type="date" value={form.event_date} onChange={(e: any) => set("event_date", e.target.value)} /></div>
          <div><label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Città/Luogo</label><Input value={form.location} onChange={(e: any) => set("location", e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Iscrizione (€)</label><Input type="number" value={form.entry_cost} onChange={(e: any) => set("entry_cost", e.target.value)} /></div>
          <div><label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Partecipanti</label><Input type="number" value={form.participants} onChange={(e: any) => set("participants", e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Turni di gioco</label><Input type="number" value={form.rounds} onChange={(e: any) => set("rounds", e.target.value)} /></div>
          <div><label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Piazzamento finale <span style={{ fontWeight: 400 }}>(facoltativo)</span></label><Input type="number" placeholder="Lo aggiungo dopo" value={form.placement} onChange={(e: any) => set("placement", e.target.value)} /></div>
        </div>
        <div className="text-[11px] -mt-2" style={{ color: "var(--text-dim)" }}>Non conosci ancora il piazzamento? Lascia vuoto: potrai inserirlo in qualsiasi momento dalla pagina del torneo.</div>

        {cpEstimate !== null && (
          <div className="card p-4 flex items-center justify-between" style={{ background: "rgba(244,196,48,.12)", borderColor: "transparent" }}>
            <span className="font-semibold text-sm">🟡 CP STIMATI</span>
            <span className="text-xl font-extrabold" style={{ color: "var(--amber)" }}>+{cpEstimate} CP</span>
          </div>
        )}

        <Button cta className="py-3" onClick={save}>Salva Torneo</Button>
        <div className="text-[11px]" style={{ color: "var(--text-dim)" }}>
          Stima basata sulla tabella cp_table in Supabase (con la meccanica ufficiale del Kicker) — aggiornala con i valori ufficiali Play! Pokémon correnti.
        </div>
      </Card>
    </div>
  );
}
