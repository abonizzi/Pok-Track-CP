import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Tournaments from "./pages/Tournaments";
import NewTournament from "./pages/NewTournament";
import TournamentDetail from "./pages/TournamentDetail";
import History from "./pages/History";
import Stats from "./pages/Stats";
import CpTables from "./pages/CpTables";
import Simulator from "./pages/Simulator";
import Settings from "./pages/Settings";
import More from "./pages/More";

export default function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--sidebar)" }}>
        <div className="text-white/70 text-sm">Caricamento PokéTrack...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/reset-password" element={<ResetPassword />} />
      {!session ? (
        <Route path="*" element={<Login />} />
      ) : (
        <Route
          path="*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/tornei" element={<Tournaments />} />
                <Route path="/tornei/nuovo" element={<NewTournament />} />
                <Route path="/tornei/:id" element={<TournamentDetail />} />
                <Route path="/history" element={<History />} />
                <Route path="/statistiche" element={<Stats />} />
                <Route path="/tabelle" element={<CpTables />} />
                <Route path="/simulatore" element={<Simulator />} />
                <Route path="/impostazioni" element={<Settings />} />
                <Route path="/altro" element={<More />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          }
        />
      )}
    </Routes>
  );
}
