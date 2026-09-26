import React from "react";
import { NavLink } from "react-router-dom";
import { Card } from "../components/ui";

const ITEMS = [
  { to: "/history", label: "Cronologia", icon: "📜" },
  { to: "/simulatore", label: "Simulatore", icon: "🧮" },
  { to: "/tabelle", label: "Tabelle CP", icon: "📋" },
  { to: "/impostazioni", label: "Impostazioni", icon: "⚙️" },
];

export default function More() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Altro</h2>
      <div className="grid gap-3">
        {ITEMS.map((it) => (
          <NavLink key={it.to} to={it.to}>
            <Card className="flex items-center gap-3">
              <span className="text-2xl">{it.icon}</span><span className="font-semibold">{it.label}</span>
            </Card>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
