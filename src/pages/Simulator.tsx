import React, { useState } from "react";
import { Card, Input } from "../components/ui";

function binom(n: number, k: number): number {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

type Zone = "safe" | "border" | "out";
type Group = { wins: number; points: number; expected: number; zone: Zone };

// Stima basata su uno Swiss "ideale": a ogni turno ci si accoppia con chi ha lo stesso record
// e metà del gruppo vince. Con N giocatori e R turni, i giocatori che chiudono con w vittorie
// sono circa N * C(R,w) / 2^R. Per ogni gruppo di record si guarda quanti giocatori stanno
// strettamente sopra (A) e quanti ce ne sono nel gruppo stesso (c):
//  - SICURA:     tutti quelli con record >= al tuo entrano nel taglio (A + c <= K)
//  - FUORI:      il taglio è già pieno prima di arrivare al tuo record (A >= K)
//  - BORDERLINE: il taglio cade dentro il tuo gruppo di record → decidono i tie-break
function simulate(N: number, R: number, K: number) {
  const cut = Math.min(K, N);
  const total = Math.pow(2, R);
  const groups: Group[] = [];
  let above = 0;
  for (let w = R; w >= 0; w--) {
    const c = (N * binom(R, w)) / total;
    const upTo = above + c;
    let zone: Zone;
    if (Math.ceil(upTo - 1e-9) <= cut) zone = "safe";
    else if (Math.floor(above + 1e-9) >= cut) zone = "out";
    else zone = "border";
    groups.push({ wins: w, points: 3 * w, expected: c, zone });
    above += c;
  }
  const safeGroups = groups.filter((g) => g.zone === "safe");
  const borderGroups = groups.filter((g) => g.zone === "border");
  const safeMin = safeGroups.length ? Math.min(...safeGroups.map((g) => g.points)) : null;
  const borderMin = borderGroups.length ? Math.min(...borderGroups.map((g) => g.points)) : safeMin;
  return { groups, safeMin, borderMin };
}

export default function Simulator() {
  const [participants, setParticipants] = useState(22);
  const [rounds, setRounds] = useState(5);
  const [cut, setCut] = useState<"TOP 4" | "TOP 8">("TOP 8");

  const K = cut === "TOP 4" ? 4 : 8;
  const valid = participants >= 2 && rounds >= 1 && rounds <= 12;
  const sim = valid ? simulate(participants, rounds, K) : null;

  const safeMin = sim?.safeMin ?? null;
  const borderMin = sim?.borderMin ?? null;
  const hasBorder = safeMin !== null && borderMin !== null && borderMin < safeMin;
  const outMax = borderMin !== null ? borderMin - 1 : null;

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

      {!sim ? (
        <Card className="text-sm" style={{ color: "var(--text-dim)" }}>Inserisci almeno 2 partecipanti e da 1 a 12 turni.</Card>
      ) : (
        <>
          <div className="grid gap-3">
            <Card style={{ background: "rgba(34,197,94,.12)", borderColor: "transparent" }}>
              <div className="font-semibold" style={{ color: "var(--green)" }}>🟢 QUALIFICAZIONE SICURA</div>
              <div className="text-xl font-extrabold">{safeMin !== null ? `≥ ${safeMin} punti` : "Nessun record garantito"}</div>
              <div className="text-xs" style={{ color: "var(--text-dim)" }}>Anche perdendo tutti i tie-break dovresti rientrare nel taglio</div>
            </Card>
            <Card style={{ background: "rgba(245,165,36,.12)", borderColor: "transparent" }}>
              <div className="font-semibold" style={{ color: "var(--amber)" }}>🟡 BORDERLINE</div>
              <div className="text-xl font-extrabold">
                {hasBorder ? `${borderMin} - ${(safeMin as number) - 1} punti` : "Nessuna fascia incerta"}
              </div>
              <div className="text-xs" style={{ color: "var(--text-dim)" }}>Il taglio cade dentro questo gruppo di record: decidono i tie-break</div>
            </Card>
            <Card style={{ background: "rgba(239,68,68,.12)", borderColor: "transparent" }}>
              <div className="font-semibold" style={{ color: "var(--red)" }}>🔴 FUORI</div>
              <div className="text-xl font-extrabold">{outMax !== null && outMax >= 0 ? `≤ ${outMax} punti` : "—"}</div>
              <div className="text-xs" style={{ color: "var(--text-dim)" }}>Il taglio si riempie prima di arrivare a questo record</div>
            </Card>
          </div>

          <Card className="mt-4">
            <div className="font-semibold mb-2 text-sm">Distribuzione attesa dei record</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ color: "var(--text-dim)" }}>
                  <th className="py-1">Record</th>
                  <th className="py-1 text-center">Punti</th>
                  <th className="py-1 text-center">Giocatori (circa)</th>
                  <th className="py-1 text-right">Taglio</th>
                </tr>
              </thead>
              <tbody>
                {sim.groups.map((g) => (
                  <tr key={g.wins} className="border-t" style={{ borderColor: "var(--card-border)" }}>
                    <td className="py-1.5">{g.wins}-{rounds - g.wins}</td>
                    <td className="py-1.5 text-center">{g.points}</td>
                    <td className="py-1.5 text-center">{g.expected.toFixed(1)}</td>
                    <td className="py-1.5 text-right">{g.zone === "safe" ? "🟢" : g.zone === "border" ? "🟡" : "🔴"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      <div className="text-[11px] mt-4 text-center" style={{ color: "var(--text-dim)" }}>
        Stima su uno Swiss ideale (accoppiamenti tra pari record, pareggi non considerati, 3 punti a vittoria):
        i pareggi e i tie-break reali possono spostare i confini di un gruppo. Calcolo per {cut.toLowerCase()} su {participants} giocatori e {rounds} turni.
      </div>
    </div>
  );
}
