# PokéTrack

App per tracciare tornei, Championship Points, matchup Bo3 e statistiche nel TCG Pokémon competitivo.

Stack: **React + TypeScript + Vite + Tailwind CSS**, **Supabase** (database Postgres, autenticazione, Row Level Security), **Resend** (email di feedback), **PWA installabile**, deploy su **Netlify**.

---

## File PWA inclusi

```
public/
  favicon.svg              icona per il tab del browser
  icon-192.png              icona PWA 192×192 (Android/Chrome)
  icon-512.png              icona PWA 512×512 (Android/Chrome, splash screen)
  icon-512-maskable.png     icona "maskable" 512×512 (Android adattiva, safe-zone rispettata)
  apple-touch-icon.png      icona 180×180 per "Aggiungi a Home" su iOS/Safari
```

Il manifest PWA (nome, colori, icone) è generato automaticamente in fase di build da
`vite-plugin-pwa`, configurato in `vite.config.ts` — non serve creare a mano un file
`manifest.json`. Il service worker (cache offline dell'app + aggiornamento automatico)
viene generato allo stesso modo; le chiamate a Supabase sono escluse dalla cache
(`NetworkOnly`) così i dati mostrati offline non sono mai stantii.

Le icone hanno un design originale (monogramma "PT" su anello blu/giallo), pensato per
non riprodurre alcun elemento protetto da copyright dei giochi Pokémon.

Se vuoi cambiare il logo, sostituisci questi file mantenendo esattamente nome e dimensioni,
poi rilancia `npm run build`.

---

## Percorso di deploy completo (tutto quello discusso finora)

### 1. Crea il progetto Supabase

1. Vai su https://supabase.com → crea un nuovo progetto (scegli una password del database sicura).
2. Apri **SQL Editor** → incolla ed esegui **tutto** il contenuto di `supabase/schema.sql`.
   Crea tabelle, indici e le policy **RLS**: ogni utente legge/scrive solo i propri tornei,
   match e game; le tabelle `cp_table`, `kicker_table`, `archetypes` sono globali e in sola lettura.
3. In **Authentication → Providers** verifica che "Email" sia abilitato.
4. In **Authentication → URL Configuration** imposta (sostituisci con il tuo dominio Netlify):
   - Site URL: `https://poketrack.netlify.app`
   - Redirect URLs: aggiungi `https://poketrack.netlify.app/reset-password`
5. Da **Project Settings → API** copia:
   - `Project URL` → userà come `VITE_SUPABASE_URL`
   - `anon public key` → userà come `VITE_SUPABASE_ANON_KEY`

### 2. Aggiorna le tabelle CP con i valori ufficiali che mi hai passato

Nel Table Editor di Supabase (o via SQL) aggiorna/aggiungi righe in `cp_table` e
`kicker_table` per la stagione corrente con i valori ufficiali Play! Pokémon (League
Challenge, League Cup, Regional — già integrati nell'app demo — e International non
appena me lo mandi). Nessuna modifica al frontend necessaria: i valori vengono letti
dal database a ogni stima CP.

### 3. Configura Resend per il form di feedback

1. Crea un account su https://resend.com → genera una API Key.
2. (Consigliato) verifica un tuo dominio su Resend per inviare da un tuo indirizzo invece
   di `onboarding@resend.dev`.
3. Installa la Supabase CLI (`npm i -g supabase`), poi dalla cartella del progetto:
   ```bash
   supabase login
   supabase link --project-ref TUO_PROJECT_REF
   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
   supabase functions deploy send-feedback
   ```
4. La funzione invia sempre l'email a **form.segnalazioni@gmail.com**
   (modificabile in `supabase/functions/send-feedback/index.ts`, costante `TO_EMAIL`).

### 4. Prova tutto in locale

```bash
cp .env.example .env
# incolla VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nel file .env
npm install
npm run dev
```

Apri l'URL locale, registra un utente di prova, crea un torneo, registra un round e
prova il form di feedback (dovrebbe arrivare l'email).

### 5. Deploy su Netlify

1. Metti il codice su un repository Git (GitHub/GitLab/Bitbucket) — es. `git init`,
   `git add .`, `git commit -m "PokéTrack"`, poi crea il repo su GitHub e fai il push.
2. Su https://app.netlify.com → **Add new site** → **Import an existing project** →
   collega il repository.
3. Build command: `npm run build` — Publish directory: `dist`
   (già preconfigurato in `netlify.toml`, incluso il redirect SPA `/* → /index.html`).
4. In **Site settings → Environment variables** aggiungi:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploya. Copia l'URL assegnato da Netlify (o collega un dominio personalizzato) e
   torna al punto 1.4 per aggiornare Site URL / Redirect URLs su Supabase con l'URL reale.

### 6. Testa l'installazione PWA

- **Android/Chrome**: apri il sito, dovrebbe comparire il banner "Aggiungi a schermata
  Home" automaticamente, oppure Menu (⋮) → "Installa app".
- **iOS/Safari**: apri il sito → pulsante Condividi → "Aggiungi a Home". iOS non mostra
  banner automatici: è sempre un'azione manuale dell'utente, da qui le istruzioni nella
  pagina Impostazioni dell'app.
- **Desktop/Chrome**: icona di installazione nella barra degli indirizzi.

Verifica anche che l'app funzioni offline per le sole schermate già visitate (i dati
restano quelli sincronizzati l'ultima volta; le scritture richiedono connessione,
essendo salvate su Supabase).

---

## Struttura del progetto

```
src/
  lib/            client Supabase, logica di stima CP (tabelle + meccanica Kicker)
  contexts/       tema (dark/light) e autenticazione
  components/     UI riutilizzabile (Card, Button, Badge, ProgressBar...) e Layout (sidebar/bottom nav)
  pages/          Login, Dashboard, Tornei, Nuovo Torneo, Matchup, History, Statistiche, Tabelle CP, Simulatore, Impostazioni
public/           icone PWA (vedi sopra)
supabase/
  schema.sql               tutte le tabelle + RLS
  functions/send-feedback  Edge Function che invia l'email via Resend
```

## Sicurezza / RLS

Ogni tabella con dati personali (`tournaments`, `matches`, `games`, `feedback`, `profiles`)
ha RLS abilitata con policy `auth.uid() = user_id`: un utente autenticato può leggere e
modificare esclusivamente le proprie righe. Le tabelle di riferimento globali
(`archetypes`, `cp_table`, `kicker_table`) sono in sola lettura per qualsiasi utente autenticato.

## Note

- Il "Resta connesso" del login è il comportamento di default di Supabase Auth (sessione
  persistita in `localStorage`).
- Le tabelle CP di Regional Championship e League Challenge/Cup nello schema demo sono
  ancora quelle di esempio iniziali: aggiornale in Supabase con i valori ufficiali 2027
  che mi hai fornito in chat (vedi punto 2 sopra).
