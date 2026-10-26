// Utility condivise tra l'editor delle liste mazzo e la pagina di elenco:
// calcolo del totale carte e generazione dell'area di stampa/PDF.

export type PkmnCard = { qty: number | string; name: string; exp: string; num: string };
export type SimpleCard = { qty: number | string; name: string };

export function emptyPkmn(): PkmnCard { return { qty: 1, name: "", exp: "", num: "" }; }
export function emptyCard(): SimpleCard { return { qty: 1, name: "" }; }

export function totalCards(d: { pokemon?: any[]; trainer?: any[]; energy?: any[] }): number {
  const sum = (list?: any[]) => (list || []).reduce((s, c) => s + (Number(c.qty) || 0), 0);
  return sum(d.pokemon) + sum(d.trainer) + sum(d.energy);
}

function esc(s: any): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtList(list: any[], withExp: boolean): string {
  const rows = (list || []).filter((c) => c.name && Number(c.qty) > 0);
  if (rows.length === 0) return `<div style="color:#999">—</div>`;
  return rows
    .map(
      (c) => `<div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px dotted #ccc;">
        <span>${c.qty}× ${esc(c.name)}</span>
        ${withExp ? `<span style="color:#555">${esc(c.exp)} ${esc(c.num)}</span>` : ""}
      </div>`
    )
    .join("");
}

// Popola #print-area con il layout verticale A4 (Pokémon → Trainer → Energia) e lo stampa.
// La pagina che la usa deve avere un <div id="print-area" className="no-print" /> nel DOM
// e lo stylesheet globale deve includere le regole @media print (vedi index.css).
export function renderPrintHTML(d: {
  deck_name?: string; player_first_name?: string; player_last_name?: string;
  player_birth_year?: string; player_id?: string;
  pokemon?: any[]; trainer?: any[]; energy?: any[];
}) {
  const el = document.getElementById("print-area");
  if (!el) return;
  const total = totalCards(d);
  el.innerHTML = `
  <div class="print-text" style="font-family:Arial,Helvetica,sans-serif;color:#000;">
    <div style="border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline;">
      <div style="font-size:16px;font-weight:800;">${esc(d.deck_name) || "Mazzo senza nome"}</div>
      <div style="font-size:12px;">${total} / 60 carte</div>
    </div>
    <div style="border:1px solid #000;padding:6px 10px;margin-bottom:10px;font-size:11px;">
      <strong>Giocatore:</strong> ${esc(d.player_first_name)} ${esc(d.player_last_name)}
      &nbsp;·&nbsp; <strong>Anno:</strong> ${esc(d.player_birth_year)}
      &nbsp;·&nbsp; <strong>Player ID:</strong> ${esc(d.player_id)}
    </div>
    <div style="margin-bottom:8px;">
      <div style="font-weight:800;margin-bottom:3px;">⚡ Pokémon</div>
      ${fmtList(d.pokemon || [], true)}
    </div>
    <div style="margin-bottom:8px;">
      <div style="font-weight:800;margin-bottom:3px;">🎴 Trainer</div>
      ${fmtList(d.trainer || [], false)}
    </div>
    <div>
      <div style="font-weight:800;margin-bottom:3px;">🔮 Energia</div>
      ${fmtList(d.energy || [], false)}
    </div>
  </div>`;
}
