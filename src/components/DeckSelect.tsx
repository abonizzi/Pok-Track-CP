import React, { useState } from "react";
import type { DeckCategory } from "../hooks/useDeckCategories";

// Select che mostra i mazzi salvati in Impostazioni, con un'opzione in fondo
// per aggiungerne uno nuovo al volo senza uscire dalla schermata corrente.
export default function DeckSelect({
  value,
  onChange,
  decks,
  onAddNew,
  placeholder = "Seleziona un mazzo",
  className = "",
}: {
  value: string;
  onChange: (name: string) => void;
  decks: DeckCategory[];
  onAddNew: (name: string) => Promise<DeckCategory | null>;
  placeholder?: string;
  className?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  async function confirmAdd() {
    const trimmed = newName.trim();
    setAdding(false);
    setNewName("");
    if (!trimmed) return;
    await onAddNew(trimmed);
    onChange(trimmed);
  }

  if (adding) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <input
          autoFocus
          className="flex-1 p-3"
          placeholder="Nome del nuovo mazzo"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") confirmAdd(); if (e.key === "Escape") { setAdding(false); setNewName(""); } }}
        />
        <button className="text-sm font-semibold px-3 py-2 rounded-xl" style={{ background: "var(--blue)", color: "#fff" }} onClick={confirmAdd}>OK</button>
        <button className="text-sm px-2" style={{ color: "var(--text-dim)" }} onClick={() => { setAdding(false); setNewName(""); }}>Annulla</button>
      </div>
    );
  }

  return (
    <select
      className={`w-full p-3 ${className}`}
      value={decks.some((d) => d.name === value) ? value : ""}
      onChange={(e) => {
        if (e.target.value === "__new__") setAdding(true);
        else onChange(e.target.value);
      }}
    >
      <option value="" disabled>{placeholder}</option>
      {value && !decks.some((d) => d.name === value) && <option value={value}>{value}</option>}
      {decks.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
      <option value="__new__">+ Aggiungi nuovo mazzo...</option>
    </select>
  );
}
