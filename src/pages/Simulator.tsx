import React, { useState } from "react";
import { Card, Input } from "../components/ui";

export default function Simulator() {
  const [participants, setParticipants] = useState(64);
  const [rounds, setRounds] = useState(6);
  const [cut, setCut] = useState<"TOP 4" | "TOP 8">("TOP 8");

  const safe = rounds * 3 - 3;
  const border = safe - 2;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">🧮 Simulatore Top Cut</h2>
      <Card className="mb-4 grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Partecipanti</label>
            <Input type="number" value={participants} onChange={(e: any) => setParticipants(Number(e.target.value))} />
          </div>
          <div>
            <label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Turni Svizzera</label>
            <Input type="number" value={rounds} onChange={(e: any) => setRounds(Number(e.target.value))} />
          </div>
        </div>
        <div className="seg">
          <button className={cut === "TOP 4" ? "on" : ""} onClick={() => setCut("TOP 4")}>TOP 4</button>
          <button className={cut === "TOP 8" ? "on" : ""} onClick={() => setCut("TOP 8")}>TOP 8</button>
        </div>
      </Card>

      <div className="grid gap-3">
        <Card style={{ background: "rgba(34,197,94,.12)", borderColor: "transparent" }}>
          <div className="font-semibold" style={{ color: "var(--green)" }}>🟢 QUALIFICAZIONE SICURA</div>
          <div className="text-xl font-extrabold">{safe} punti</div>
        </Card>
        <Card style={{ background: "rgba(245,165,36,.12)", borderColor: "transparent" }}>
          <div className="font-semibold" style={{ color: "var(--amber)" }}>🟡 BORDERLINE</div>
          <div className="text-xl font-extrabold">{border} - {safe - 1} punti</div>
          <div className="text-xs" style={{ color: "var(--text-dim)" }}>Soggetto ai tie-breaker</div>
        </Card>
        <Card style={{ background: "rgba(239,68,68,.12)", borderColor: "transparent" }}>
          <div className="font-semibold" style={{ color: "var(--red)" }}>🔴 MATEMATICAMENTE FUORI</div>
          <div className="text-xl font-extrabold">≤ {border - 1} punti</div>
        </Card>
      </div>
      <div className="text-[11px] mt-4 text-center" style={{ color: "var(--text-dim)" }}>
        Calcolo basato su 3 punti vittoria / 1 punto pareggio / 0 punti sconfitta. Stima indicativa per {cut.toLowerCase()} su {participants} giocatori.
      </div>
    </div>
  );
}
