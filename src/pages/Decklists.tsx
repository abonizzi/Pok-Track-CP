import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Card, Button, EmptyState, toast } from "../components/ui";
import { totalCards, renderPrintHTML } from "../lib/decklist";

export default function Decklists() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from("decklists")
      .select("*")
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [session]);

  async function deleteDeck(id: string) {
    if (!window.confirm("Eliminare questa lista mazzo? L'azione non è reversibile.")) return;
    const { error } = await supabase.from("decklists").delete().eq("id", id);
    if (error) { toast(error.message); return; }
    toast("Lista mazzo eliminata");
    load();
  }

  function printDeck(d: any) {
    renderPrintHTML(d);
    setTimeout(() => window.print(), 80);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Liste Mazzo</h2>
        <Button cta className="text-sm" onClick={() => navigate("/mazzi/nuovo")}>+ Nuova lista</Button>
      </div>

      {loading ? (
        <div className="text-sm" style={{ color: "var(--text-dim)" }}>Caricamento...</div>
      ) : rows.length === 0 ? (
        <EmptyState icon="🃏" title="Nessuna lista mazzo salvata" sub="Crea la tua prima lista da 60 carte, pronta per la stampa in torneo." />
      ) : (
        <div className="grid gap-3">
          {rows.map((d) => {
            const total = totalCards(d);
            const color = total === 60 ? "var(--green)" : total > 60 ? "var(--red)" : "var(--amber)";
            return (
              <Card key={d.id} className="flex items-center justify-between gap-3">
                <button className="text-left flex-1 min-w-0" onClick={() => navigate(`/mazzi/${d.id}`)}>
                  <div className="font-semibold truncate">{d.deck_name || "Mazzo senza nome"}</div>
                  <div className="text-xs" style={{ color: "var(--text-dim)" }}>
                    <span style={{ color }}>{total} / 60 carte</span> · aggiornato {new Date(d.updated_at).toLocaleDateString("it-IT")}
                  </div>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => printDeck(d)} className="text-sm px-2 py-1 rounded-lg" style={{ border: "1px solid var(--card-border)" }} title="Stampa / PDF">🖨️</button>
                  <button onClick={() => deleteDeck(d.id)} className="text-sm px-2 py-1 rounded-lg" style={{ border: "1px solid var(--card-border)", color: "var(--red)" }} title="Elimina">🗑️</button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div id="print-area" className="no-print" />
    </div>
  );
}
