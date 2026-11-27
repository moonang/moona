"use client";
import { useEffect, useRef } from "react";

/** Bottom sheet on phones, centred dialog on desktop. */
export function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    setTimeout(() => box.current?.querySelector<HTMLElement>("input:not([type=radio]),button")?.focus(), 30);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" ref={box}><div className="grab" aria-hidden="true" />{children}</div>
    </div>
  );
}

export function toast(msg: string) {
  document.querySelectorAll(".toast").forEach((t) => t.remove());
  const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
  document.body.append(t); setTimeout(() => t.remove(), 2800);
}
