import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { Card, Button, Input, toast } from "../components/ui";

export default function Login() {
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast(error.message);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { toast("Le password non coincidono"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) toast(error.message);
    else toast("Registrazione avvenuta! Controlla la tua email per confermare.");
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setLoading(false);
    if (error) toast(error.message);
    else toast("Email di reset inviata, controlla la posta.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--sidebar)" }}>
      <Card className="w-full max-w-sm p-6">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-full border-2 mb-2" style={{ background: "radial-gradient(circle at 35% 30%, #fff 0 15%, var(--red) 16% 48%, #0B1530 49% 54%, #fff 55%)" }} />
          <div className="text-xl font-extrabold">PokéTrack</div>
          <div className="text-sm" style={{ color: "var(--text-dim)" }}>Il tuo percorso nel TCG Pokémon</div>
        </div>

        {mode !== "reset" && (
          <div className="seg mb-5">
            <button className={mode === "login" ? "on" : ""} onClick={() => setMode("login")}>Accedi</button>
            <button className={mode === "register" ? "on" : ""} onClick={() => setMode("register")}>Registrati</button>
          </div>
        )}

        {mode === "login" && (
          <form onSubmit={handleLogin} className="grid gap-3">
            <div>
              <label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Email</label>
              <Input type="email" required placeholder="Inserisci la tua email" value={email} onChange={(e: any) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Password</label>
              <Input type="password" required placeholder="Inserisci la tua password" value={password} onChange={(e: any) => setPassword(e.target.value)} />
            </div>
            <Button cta type="submit" disabled={loading} className="w-full mt-2">Accedi</Button>
            <button type="button" onClick={() => setMode("reset")} className="text-sm text-center underline" style={{ color: "var(--text-dim)" }}>
              Password dimenticata?
            </button>
          </form>
        )}

        {mode === "register" && (
          <form onSubmit={handleRegister} className="grid gap-3">
            <div>
              <label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Email</label>
              <Input type="email" required value={email} onChange={(e: any) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Password</label>
              <Input type="password" required value={password} onChange={(e: any) => setPassword(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Conferma password</label>
              <Input type="password" required value={confirm} onChange={(e: any) => setConfirm(e.target.value)} />
            </div>
            <Button cta type="submit" disabled={loading} className="w-full mt-2">Registrati</Button>
          </form>
        )}

        {mode === "reset" && (
          <form onSubmit={handleReset} className="grid gap-3">
            <div>
              <label className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>Email</label>
              <Input type="email" required value={email} onChange={(e: any) => setEmail(e.target.value)} />
            </div>
            <Button cta type="submit" disabled={loading} className="w-full mt-2">Invia link di reset</Button>
            <button type="button" onClick={() => setMode("login")} className="text-sm text-center underline" style={{ color: "var(--text-dim)" }}>
              Torna al login
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}
