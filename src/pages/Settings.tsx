import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { Card, Button, Input, toast } from "../components/ui";
import { useDeckCategories } from "../hooks/useDeckCategories";

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { session, profile, refreshProfile } = useAuth();
  const [fb, setFb] = useState({ email: session?.user?.email || "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const { decks, addDeck, removeDeck } = useDeckCategories();
  const [newDeck, setNewDeck] = useState("");

  async function changeTheme(t: "dark" | "light") {
    setTheme(t);
    if (session?.user?.id) {
      await supabase.from("profiles").update({ theme: t }).eq("id", session.user.id);
      refreshProfile();
    }
  }

  function installPWA() {
    const evt = (window as any).__deferredPrompt;
    if (evt) evt.prompt();
    else toast("Usa il menu del browser: 'Aggiungi a schermata Home'");
  }

  async function handleAddDeck() {
    const trimmed = newDeck.trim();
    if (!trimmed) return;
    const created = await addDeck(trimmed);
    setNewDeck("");
    if (created) toast(`Mazzo "${trimmed}" aggiunto`);
  }

  async function sendFeedback() {
    if (!fb.message.trim()) { toast("Scrivi un messaggio prima di inviare"); return; }
    setSending(true);
    // 1) salva il feedback nel database (protetto da RLS)
    const { error: insertError } = await supabase.from("feedback").insert({
      user_id: session?.user?.id || null,
      email: fb.email || null,
      subject: fb.subject || null,
      message: fb.message,
    });
    if (insertError) { toast(insertError.message); setSending(false); return; }

    // 2) invia l'email tramite la Edge Function (Resend) a form.segnalazioni@gmail.com
    const { error: fnError } = await supabase.functions.invoke("send-feedback", {
      body: { email: fb.email, subject: fb.subject, message: fb.message },
    });
    setSending(false);
    if (fnError) {
      toast("Feedback salvato, ma l'invio email non è riuscito");
    } else {
      toast("Feedback inviato, grazie! 🙏");
    }
    setFb({ email: session?.user?.email || "", subject: "", message: "" });
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Impostazioni</h2>
      <div className="grid gap-4 max-w-xl">
        <Card>
          <div className="font-semibold mb-3">Aspetto</div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm">Tema scuro</span>
            <span className={`toggle ${theme === "dark" ? "on" : ""}`} onClick={() => changeTheme("dark")}><span className="dot" /></span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm">Tema chiaro</span>
            <span className={`toggle ${theme === "light" ? "on" : ""}`} onClick={() => changeTheme("light")}><span className="dot" /></span>
          </div>
        </Card>

        <Card>
          <div className="font-semibold mb-2">Sincronizzazione</div>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full" style={{ background: "var(--green)" }} />
            Online · dati sincronizzati su Supabase
          </div>
        </Card>

        <Card>
          <div className="font-semibold mb-2">ℹ️ Come vengono calcolati i CP</div>
          <div className="text-sm grid gap-3" style={{ color: "var(--text-dim)" }}>
            <p>
              I <strong style={{ color: "var(--text)" }}>Championship Point (CP)</strong> derivano
              esclusivamente dal <strong style={{ color: "var(--text)" }}>piazzamento finale</strong> di
              un torneo. I punti W/L/T dei singoli round Swiss servono solo a stabilire quel
              piazzamento — non sono mai CP di per sé.
            </p>

            <p>
              Per ogni tipo di evento esiste una tabella ufficiale Play! Pokémon con delle fasce di
              piazzamento (es. 1°, 2°, 3°-4°...), ciascuna con un <strong style={{ color: "var(--text)" }}>
              Kicker</strong>: il numero minimo di partecipanti richiesto perché quella fascia assegni
              i CP indicati.
            </p>

            <div className="p-3 rounded-xl" style={{ background: "var(--bg)", border: "1px solid var(--card-border)" }}>
              <div className="font-semibold mb-1" style={{ color: "var(--text)" }}>Esempio</div>
              Arrivi <strong>3°</strong> in una League Cup da <strong>6 partecipanti</strong>.
              La fascia "3°-4°" richiede un Kicker di 8 partecipanti — non soddisfatto. Quella fascia non
              assegna CP: ricevi <strong style={{ color: "var(--red)" }}>0 CP</strong> per questo piazzamento,
              anche se sei sul podio. Non esiste nessuna fascia "di ripiego": sotto al Kicker, niente CP.
            </div>

            <p>
              Sono già caricati i valori <strong style={{ color: "var(--text)" }}>ufficiali 2027</strong> per
              League Challenge, League Cup e Regional Championship. L'International Championship è ancora
              <strong style={{ color: "var(--amber)" }}> provvisorio</strong>, in attesa dei dati ufficiali.
            </p>

            <p>
              A 200 CP si sblocca il traguardo stagionale della carta <strong style={{ color: "var(--text)" }}>Ace Trainer</strong>,
              segnalato nella barra della Dashboard.
            </p>

            <p className="text-[11px]">
              Nota: il valore <strong>BFL (Best Finish Limit)</strong> mostrato nella pagina Tabelle CP è
              anch'esso provvisorio e al momento <strong>non</strong> viene applicato nel calcolo del
              totale CP in Dashboard — se la regola ufficiale prevede un tetto ai risultati che contano
              in una stagione, il totale potrebbe non rifletterlo ancora.
            </p>

            <button onClick={() => navigate("/tabelle")} className="text-sm font-semibold text-left" style={{ color: "var(--blue)" }}>
              Vedi tutte le tabelle CP →
            </button>
          </div>
        </Card>

        <Card>
          <div className="font-semibold mb-2">Mazzi</div>
          <div className="text-sm mb-3" style={{ color: "var(--text-dim)" }}>
            Aggiungi qui i mazzi che usi o incontri più spesso: nei tornei potrai selezionarli invece di riscriverli ogni volta.
          </div>
          <div className="flex items-center gap-2 mb-3">
            <Input placeholder="Es. Charizard ex" value={newDeck} onChange={(e: any) => setNewDeck(e.target.value)} onKeyDown={(e: any) => { if (e.key === "Enter") handleAddDeck(); }} />
            <Button cta className="px-4 shrink-0" onClick={handleAddDeck}>+ Aggiungi</Button>
          </div>
          {decks.length === 0 ? (
            <div className="text-xs" style={{ color: "var(--text-dim)" }}>Nessun mazzo salvato ancora.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {decks.map((d) => (
                <span key={d.id} className="flex items-center gap-2 text-sm pill px-3 py-1.5" style={{ background: "var(--bg)", border: "1px solid var(--card-border)" }}>
                  {d.name}
                  <button onClick={() => removeDeck(d.id)} title="Rimuovi" style={{ color: "var(--red)" }}>×</button>
                </span>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="font-semibold mb-2">📱 Installazione App</div>
          <div className="text-sm mb-3" style={{ color: "var(--text-dim)" }}>Installa PokéTrack sulla schermata Home per un accesso rapido.</div>
          <Button cta className="w-full" onClick={installPWA}>Installa sulla schermata Home</Button>
        </Card>

        <Card>
          <div className="font-semibold mb-3">Feedback &amp; Suggerimenti</div>
          <div className="grid gap-2">
            <Input placeholder="La tua email" value={fb.email} onChange={(e: any) => setFb({ ...fb, email: e.target.value })} />
            <Input placeholder="Oggetto" value={fb.subject} onChange={(e: any) => setFb({ ...fb, subject: e.target.value })} />
            <textarea className="p-3" rows={3} placeholder="Scrivi qui il tuo messaggio..." value={fb.message} onChange={(e) => setFb({ ...fb, message: e.target.value })} />
            <Button className="text-white" style={{ background: "var(--blue)" } as any} disabled={sending} onClick={sendFeedback}>Invia</Button>
            <div className="text-[11px]" style={{ color: "var(--text-dim)" }}>Il messaggio viene salvato e inoltrato via email a form.segnalazioni@gmail.com tramite Resend.</div>
          </div>
        </Card>

        <Button onClick={() => supabase.auth.signOut()} className="text-sm underline text-center" style={{ color: "var(--text-dim)" } as any}>Esci dall'account</Button>
      </div>
    </div>
  );
}
