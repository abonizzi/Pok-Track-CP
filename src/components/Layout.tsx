import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

const NAV = [
  { to: "/", label: "Home", icon: "🏠" },
  { to: "/tornei", label: "Tornei", icon: "🏆" },
  { to: "/history", label: "Cronologia", icon: "📜" },
  { to: "/statistiche", label: "Statistiche", icon: "📊" },
  { to: "/simulatore", label: "Simulatore", icon: "🧮" },
  { to: "/tabelle", label: "Tabelle CP", icon: "📋" },
  { to: "/impostazioni", label: "Impostazioni", icon: "⚙️" },
];
const MOBILE_MAIN = ["/", "/tornei", "/statistiche"];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile, session } = useAuth();
  const loc = useLocation();
  const [online, setOnline] = React.useState(navigator.onLine);
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  React.useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg)" }}>
      <aside className="hidden md:flex flex-col w-64 shrink-0 p-5" style={{ background: "var(--sidebar)", position: "sticky", top: 0, height: "100vh" }}>
        <div className="flex items-center gap-2 mb-8 px-1">
          <div className="w-9 h-9 rounded-full border-2 border-white" style={{ background: "radial-gradient(circle at 35% 30%, #fff 0 15%, var(--red) 16% 48%, #0B1530 49% 54%, #fff 55%)" }} />
          <div>
            <div className="text-white font-extrabold text-lg leading-none">PokéTrack</div>
            <div className="text-[11px]" style={{ color: "#9BABCB" }}>Il tuo percorso nel TCG</div>
          </div>
        </div>
        <nav className="flex-1 flex flex-col gap-1">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end className={({ isActive }) => `nav-item flex items-center gap-3 px-3 py-2.5 text-[15px] font-medium ${isActive ? "active" : ""}`}>
              <span className="text-lg">{n.icon}</span><span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="pt-4 mt-4 border-t" style={{ borderColor: "rgba(255,255,255,.08)" }}>
          <div className="flex items-center gap-2 text-[13px]" style={{ color: "#9BABCB" }}>
            <span className="w-2 h-2 rounded-full" style={{ background: online ? "var(--green)" : "var(--red)" }} />
            <span>{online ? "Online · sincronizzato" : "Offline"}</span>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="text-[12px] mt-2 underline" style={{ color: "#9BABCB" }}>Esci</button>
          <div className="text-[11px] mt-1" style={{ color: "#9BABCB" }}>v1.0.0</div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center justify-between px-5 md:px-8 py-4" style={{ borderBottom: "1px solid var(--card-border)" }}>
          <div>
            <div className="text-lg md:text-xl font-bold">👋 Ciao, {profile?.name || "Allenatore"}!</div>
            <div className="text-sm" style={{ color: "var(--text-dim)" }}>Stagione {profile?.season || 2027} ▾</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-sm font-medium rounded-full px-3 py-1.5" style={{ background: "rgba(34,197,94,.12)", color: "var(--green)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: "var(--green)" }} /> {online ? "Online" : "Offline"}
            </span>
            <div className="relative">
              <button
                className="text-xl"
                title="Account"
                onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
              >
                👤
              </button>
              {menuOpen && (
                <div className="card p-3 absolute right-0 mt-2 w-56 z-50 text-left">
                  <div className="text-sm font-semibold mb-0.5">{profile?.name || "Allenatore"}</div>
                  <div className="text-xs mb-3 truncate" style={{ color: "var(--text-dim)" }}>{session?.user?.email}</div>
                  <button
                    className="w-full text-left text-sm py-2 px-2 rounded-lg"
                    style={{ background: "var(--bg)", color: "var(--red)" }}
                    onClick={() => supabase.auth.signOut()}
                  >
                    ↩︎ Esci
                  </button>
                </div>
              )}
            </div>
            <NavLink to="/impostazioni" className="text-xl" title="Impostazioni">⚙️</NavLink>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8 pb-28 md:pb-8">
          <div className="max-w-5xl mx-auto">{children}</div>
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 flex justify-around py-2 z-40" style={{ background: "var(--card)", borderTop: "1px solid var(--card-border)", paddingBottom: "calc(8px + env(safe-area-inset-bottom,0px))" }}>
        {MOBILE_MAIN.map((to) => {
          const n = NAV.find((x) => x.to === to)!;
          const active = loc.pathname === to;
          return (
            <NavLink key={to} to={to} className="flex flex-col items-center text-[11px] gap-0.5 px-3" style={{ color: active ? "var(--blue)" : "var(--text-dim)" }}>
              <span className="text-lg">{n.icon}</span>{n.label}
            </NavLink>
          );
        })}
        <NavLink to="/altro" className="flex flex-col items-center text-[11px] gap-0.5 px-3" style={{ color: loc.pathname === "/altro" ? "var(--blue)" : "var(--text-dim)" }}>
          <span className="text-lg">⋯</span>Altro
        </NavLink>
      </nav>
    </div>
  );
}
