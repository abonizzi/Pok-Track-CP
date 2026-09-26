import React from "react";

export function Card({ children, className = "", style = {} }: any) {
  return <div className={`card p-4 ${className}`} style={style}>{children}</div>;
}

export function Button({ children, onClick, className = "", cta = false, type = "button", disabled = false }: any) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${cta ? "btn-cta" : "rounded-xl font-semibold"} px-4 py-2.5 ${className}`}
    >
      {children}
    </button>
  );
}

export function Input(props: any) {
  return <input {...props} className={`w-full p-3 ${props.className || ""}`} />;
}

export function Select({ children, ...props }: any) {
  return <select {...props} className={`w-full p-3 ${props.className || ""}`}>{children}</select>;
}

export function Badge({ children, cls = "" }: any) {
  return <span className={`badge ${cls}`}>{children}</span>;
}

export function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="progress-track h-3">
      <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

export function StatCard({ icon, label, value, sub }: any) {
  return (
    <Card className="flex flex-col gap-1">
      <div className="text-2xl">{icon}</div>
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="text-xs" style={{ color: "var(--text-dim)" }}>{label}</div>
      {sub ? <div className="text-[11px]" style={{ color: "var(--text-dim)" }}>{sub}</div> : null}
    </Card>
  );
}

export function EmptyState({ icon, title, sub }: any) {
  return (
    <Card className="p-10 text-center" style={{ color: "var(--text-dim)" }}>
      <div className="text-4xl mb-3">{icon}</div>
      <div className="font-semibold text-base mb-1" style={{ color: "var(--text)" }}>{title}</div>
      <div className="text-sm">{sub}</div>
    </Card>
  );
}

let toastEl: HTMLDivElement | null = null;
export function toast(msg: string) {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.style.position = "fixed";
    toastEl.style.left = "50%";
    toastEl.style.bottom = "96px";
    toastEl.style.transform = "translateX(-50%)";
    toastEl.style.background = "var(--sidebar)";
    toastEl.style.color = "#fff";
    toastEl.style.padding = "10px 18px";
    toastEl.style.borderRadius = "12px";
    toastEl.style.fontSize = "14px";
    toastEl.style.zIndex = "9999";
    toastEl.style.transition = "opacity .25s ease";
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.style.opacity = "1";
  clearTimeout((window as any).__toastTimer);
  (window as any).__toastTimer = setTimeout(() => {
    if (toastEl) toastEl.style.opacity = "0";
  }, 2200);
}
