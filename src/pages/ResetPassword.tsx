import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { Card, Button, Input, toast } from "../components/ui";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) toast(error.message);
    else { toast("Password aggiornata!"); navigate("/"); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--sidebar)" }}>
      <Card className="w-full max-w-sm p-6">
        <div className="text-xl font-extrabold mb-4">Imposta nuova password</div>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <Input type="password" required placeholder="Nuova password" value={password} onChange={(e: any) => setPassword(e.target.value)} />
          <Button cta type="submit" className="w-full">Salva password</Button>
        </form>
      </Card>
    </div>
  );
}
