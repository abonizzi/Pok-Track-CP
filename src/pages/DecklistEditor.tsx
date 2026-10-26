import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Card, Button, Input, toast } from "../components/ui";
import { useDeckCategories } from "../hooks/useDeckCategories";
import DeckSelect from "../components/DeckSelect";
import { emptyPkmn, emptyCard, totalCards, renderPrintHTML, PkmnCard, SimpleCard } from "../lib/decklist";

export default function DecklistEditor() {
  const { id } = useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const { decks, addDeck } = useDeckCategories();

  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [deckName, setDeckName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [pokemon, setPokemon] = useState<PkmnCard[]>([emptyPkmn()]);
  const [trainer, setTrainer] = useState<SimpleCard[]>([emptyCard()]);
  const [energy, setEnergy] = useState<SimpleCard[]>([emptyCard()]);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    supabase.from("decklists").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (data) {
        setDeckName(data.deck_name || "");
        setFirstName(data.player_first_name || "");
        setLastName(data.player_last_name || "");
        setBirthYear(data.player_birth_year || "");
        setPlayerId(data.player_id || "");
        setPokemon(data.pokemon?.length ? data.pokemon : [emptyPkmn()]);
        setTrainer(data.trainer?.length ? data.trainer : [emptyCard()]);
        setEnergy(data.energy?.length ? data.energy : [emptyCard()]);
      }
      setLoading(false);
    });
  }, [id]);

  const total = totalCards({ pokemon, trainer, energy });
  const barColor = total === 60 ? "var(--green)" : total > 60 ? "var(--red)" : "var(--yellow)";
  const countColor = total === 60 ? "var(--green)" : total > 60 ? "var(--red)" : "var(--text)";
  const pct = Math.min(100, Math.round((total / 60) * 100));

  function stepQty(list: any[], setList: any, idx: number, delta: number) {
    const copy = [...list];
    copy[idx] = { ...copy[idx], qty: Math.max(0, (Number(copy[idx].qty) || 0) + delta) };
    setList(copy);
  }
  function updateField(list: any[], setList: any, idx: number, field: string, val: string) {
    const copy = [...list];
    copy[idx] = { ...copy[idx], [field]: val };
    setList(copy);
  }
  function addRow(list: any[], setList: any, empty: () => any) { setList([...list, empty()]); }
  function removeRow(list: any[], setList: any, idx: number, empty: () => any) {
    const copy = list.filter((_, i) => i !== idx);
    setList(copy.length ? copy : [empty()]);
  }

  async function save() {
    if (!deckName.trim()) { toast("Dai un nome al mazzo prima di salvare"); return; }
    if (!session?.user?.id) return;
    setSaving(true);
    const payload = {
      user_id: session.user.id,
      deck_name: deckName.trim(),
      player_first_name: firstName || null,
      player_last_name: lastName || null,
      player_birth_year: birthYear || null,
      player_id: playerId || null,
      pokemon, trainer, energy,
      updated_at: new Date().toISOString(),
    };
    if (id) {
      const { error } = await supabase.from("decklists").update(payload).eq("id", id);
      setSaving(false);
      if (error) { toast(error.message); return; }
      toast("Lista mazzo aggiornata ✅");
    } else {
      const { data, error } = await supabase.from("decklists").insert(payload).select().single();
      setSaving(false);
      if (error) { toast(error.message); return; }
      toast("Lista mazzo salvata ✅");
      navigate(`/mazzi/${data.id}`, { replace: true });
    }
  }

  function printNow() {
    renderPrintHTML({ deck_name: deckName, player_first_name: firstName, player_last_name: lastName, player_birth_year: birthYear, player_id: playerId, pokemon, trainer, energy });
    setTimeout(() => window.print(), 80);
  }

  if (loading) return <div className="text-sm" style={{ color: "var(--text-dim)" }}>Caricamento...</div>;

  return (
    <div className="max-w-xl mx-auto">
      <button onClick={() => navigate("/mazzi")} className="text-sm mb-4 no-print" style={{ color: "var(--text-dim)" }}>← Torna alle liste mazzo</button>

      <div className="grid gap-4">
        <Card>
          <div className="font-semibold mb-3">🙍 Dati giocatore</div>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Nome" value={firstName} onChange={(e: any) => setFirstName(e.target.value)} />
            <Input placeholder="Cognome" value={lastName} onChange={(e: any) => setLastName(e.target.value)} />
            <Input placeholder="Anno di nascita" value={birthYear} onChange={(e: any) => setBirthYear(e.target.value)} />
            <Input placeholder="Player ID" value={playerId} onChange={(e: any) => setPlayerId(e.target.value)} />
          </div>
        </Card>

        <Card>
          <div className="font-semibold mb-3">🏷️ Nome mazzo</div>
          <DeckSelect value={deckName} onChange={setDeckName} decks={decks} onAddNew={addDeck} placeholder="Seleziona o crea il nome del mazzo" />
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">📊 Totale carte</div>
            <div className="font-extrabold" style={{ color: countColor }}>{total} / 60</div>
          </div>
          <div className="progress-track h-3"><div className="progress-fill" style={{ width: `${pct}%`, background: barColor }} /></div>
        </Card>

        <Card>
          <div className="font-semibold mb-2" style={{ color: "var(--yellow)" }}>⚡ Pokémon</div>
          {pokemon.map((c, i) => (
            <div key={i} className="grid gap-2 py-2" style={{ borderTop: i > 0 ? "1px solid var(--card-border)" : "none" }}>
              <div className="flex items-center gap-2">
                <button onClick={() => stepQty(pokemon, setPokemon, i, -1)} className="stepper-btn">−</button>
                <input type="number" min={0} value={c.qty} onChange={(e: any) => updateField(pokemon, setPokemon, i, "qty", e.target.value)} className="p-2 text-center" style={{ width: 52 }} />
                <button onClick={() => stepQty(pokemon, setPokemon, i, 1)} className="stepper-btn">+</button>
                <Input placeholder="Nome Pokémon" value={c.name} onChange={(e: any) => updateField(pokemon, setPokemon, i, "name", e.target.value)} className="flex-1" />
                <button onClick={() => removeRow(pokemon, setPokemon, i, emptyPkmn)} className="text-xl font-bold px-2" style={{ color: "var(--red)" }}>×</button>
              </div>
              <div className="flex items-center gap-2 pl-11">
                <Input placeholder="ESP" maxLength={4} value={c.exp} onChange={(e: any) => updateField(pokemon, setPokemon, i, "exp", e.target.value.toUpperCase())} style={{ width: 70 }} />
                <Input placeholder="Numero (es. 100/154)" value={c.num} onChange={(e: any) => updateField(pokemon, setPokemon, i, "num", e.target.value)} className="flex-1" />
              </div>
            </div>
          ))}
          <button onClick={() => addRow(pokemon, setPokemon, emptyPkmn)} className="w-full mt-2 py-2.5 rounded-xl text-sm" style={{ border: "1px solid var(--card-border)" }}>+ Aggiungi Pokémon</button>
        </Card>

        <Card>
          <div className="font-semibold mb-2" style={{ color: "var(--sky)" }}>🎴 Trainer</div>
          {trainer.map((c, i) => (
            <div key={i} className="flex items-center gap-2 py-2" style={{ borderTop: i > 0 ? "1px solid var(--card-border)" : "none" }}>
              <button onClick={() => stepQty(trainer, setTrainer, i, -1)} className="stepper-btn">−</button>
              <input type="number" min={0} value={c.qty} onChange={(e: any) => updateField(trainer, setTrainer, i, "qty", e.target.value)} className="p-2 text-center" style={{ width: 52 }} />
              <button onClick={() => stepQty(trainer, setTrainer, i, 1)} className="stepper-btn">+</button>
              <Input placeholder="Nome carta" value={c.name} onChange={(e: any) => updateField(trainer, setTrainer, i, "name", e.target.value)} className="flex-1" />
              <button onClick={() => removeRow(trainer, setTrainer, i, emptyCard)} className="text-xl font-bold px-2" style={{ color: "var(--red)" }}>×</button>
            </div>
          ))}
          <button onClick={() => addRow(trainer, setTrainer, emptyCard)} className="w-full mt-2 py-2.5 rounded-xl text-sm" style={{ border: "1px solid var(--card-border)" }}>+ Aggiungi Trainer</button>
        </Card>

        <Card>
          <div className="font-semibold mb-2" style={{ color: "var(--purple, #B07CFF)" }}>🔮 Energia</div>
          {energy.map((c, i) => (
            <div key={i} className="flex items-center gap-2 py-2" style={{ borderTop: i > 0 ? "1px solid var(--card-border)" : "none" }}>
              <button onClick={() => stepQty(energy, setEnergy, i, -1)} className="stepper-btn">−</button>
              <input type="number" min={0} value={c.qty} onChange={(e: any) => updateField(energy, setEnergy, i, "qty", e.target.value)} className="p-2 text-center" style={{ width: 52 }} />
              <button onClick={() => stepQty(energy, setEnergy, i, 1)} className="stepper-btn">+</button>
              <Input placeholder="Nome carta" value={c.name} onChange={(e: any) => updateField(energy, setEnergy, i, "name", e.target.value)} className="flex-1" />
              <button onClick={() => removeRow(energy, setEnergy, i, emptyCard)} className="text-xl font-bold px-2" style={{ color: "var(--red)" }}>×</button>
            </div>
          ))}
          <button onClick={() => addRow(energy, setEnergy, emptyCard)} className="w-full mt-2 py-2.5 rounded-xl text-sm" style={{ border: "1px solid var(--card-border)" }}>+ Aggiungi Energia</button>
        </Card>

        <div className="flex gap-3 no-print">
          <Button cta className="flex-1 py-3" disabled={saving} onClick={save}>💾 {id ? "Aggiorna mazzo" : "Salva mazzo"}</Button>
          <button onClick={printNow} className="px-4 rounded-xl font-semibold" style={{ border: "1px solid var(--card-border)" }}>🖨️ Stampa</button>
        </div>
      </div>

      <div id="print-area" className="no-print" />
    </div>
  );
}
