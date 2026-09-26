import React, { useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { Card, Button, Input, toast } from "../components/ui";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { session, profile, refreshProfile } = useAuth();
  const [fb, setFb] = useState({ email: session?.user?.email || "", subject: "", message: "" });
  const [sending, setSending] = useState(false);

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
