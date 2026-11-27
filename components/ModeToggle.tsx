"use client";
import { useEffect, useState } from "react";

const MODES = { auto: { ic: "◐", label: "Auto" }, day: { ic: "☀", label: "Day" }, night: { ic: "☾", label: "Night" } } as const;
type Pref = keyof typeof MODES;

function apply(pref: Pref) {
  const eff = pref === "auto" ? (matchMedia("(prefers-color-scheme: light)").matches ? "day" : "night") : pref;
  document.documentElement.dataset.mode = eff;
  window.dispatchEvent(new Event("moona-mode"));
}

export default function ModeToggle() {
  const [pref, setPref] = useState<Pref>("auto");
  useEffect(() => {
    let p: Pref = "auto";
    try { p = (localStorage.getItem("moona-mode") as Pref) || "auto"; } catch {}
    setPref(p);
    const mq = matchMedia("(prefers-color-scheme: light)");
    const onChange = () => { if ((localStorage.getItem("moona-mode") || "auto") === "auto") apply("auto"); };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  const next = () => {
    const n: Pref = ({ auto: "day", day: "night", night: "auto" } as const)[pref];
    try { localStorage.setItem("moona-mode", n); } catch {}
    setPref(n); apply(n);
  };
  return (
    <button className="modebtn" type="button" onClick={next} aria-label={`Appearance: ${MODES[pref].label}. Tap to change`}>
      <span className="ic" aria-hidden="true">{MODES[pref].ic}</span><span>{MODES[pref].label}</span>
    </button>
  );
}
