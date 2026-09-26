// Supabase Edge Function: send-feedback
// Riceve { email, subject, message } dal frontend, salva già avvenuto
// lato client nella tabella `feedback`, e invia una email via Resend
// all'indirizzo form.segnalazioni@gmail.com.
//
// Deploy:
//   supabase functions deploy send-feedback
// Secret richiesto (non esporre mai la chiave nel frontend):
//   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const TO_EMAIL = "form.segnalazioni@gmail.com";
const FROM_EMAIL = "PokéTrack <onboarding@resend.dev>"; // sostituisci con un dominio verificato su Resend

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, subject, message } = await req.json();

    if (!message || String(message).trim().length === 0) {
      return new Response(JSON.stringify({ error: "Messaggio mancante" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        reply_to: email || undefined,
        subject: `[PokéTrack] ${subject || "Nuovo feedback"}`,
        html: `
          <h2>Nuovo feedback da PokéTrack</h2>
          <p><strong>Email utente:</strong> ${email || "non fornita"}</p>
          <p><strong>Oggetto:</strong> ${subject || "-"}</p>
          <p><strong>Messaggio:</strong></p>
          <p>${String(message).replace(/\n/g, "<br/>")}</p>
        `,
      }),
    });

    if (!resendResp.ok) {
      const errText = await resendResp.text();
      return new Response(JSON.stringify({ error: "Resend error", detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
