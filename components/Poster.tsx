"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { drawPoster, moonCanvas } from "@/lib/art";
import { KINDS, dayLabel, timeLabel, tzShort } from "@/lib/core";

type PosterEvent = { slug: string; kind: string; title: string; start: string; tz: string; flyer?: string | null };

/** The generated poster: occasion colours and motif, with the real moon on the night. */
export function Poster({ ev, size = "card", href }: { ev: PosterEvent; size?: "card" | "hero" | "wide" | "mini"; href?: string }) {
  if (ev.flyer) {   // the host's own flyer, shown whole over a blurred copy of itself
    const style = { ["--fl" as any]: `url("${encodeURI(ev.flyer)}")` } as React.CSSProperties;
    const img = <img src={ev.flyer} alt={`Flyer for ${ev.title}`} loading="lazy" />;
    return href ? <Link className={`poster ${size} hasflyer`} href={href} style={style}>{img}</Link> : <div className={`poster ${size} hasflyer`} style={style}>{img}</div>;
  }
  return <GeneratedPoster ev={ev} size={size} href={href} />;
}

function GeneratedPoster({ ev, size, href }: { ev: PosterEvent; size: "card" | "hero" | "wide" | "mini"; href?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const draw = () => ref.current && drawPoster(ref.current, { id: ev.slug, kind: ev.kind, title: ev.title, start: ev.start }, undefined);
    draw();
    let t: any; const onResize = () => { clearTimeout(t); t = setTimeout(draw, 150); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [ev.slug, ev.kind, ev.title, ev.start]);
  const inner = (
    <>
      <canvas ref={ref} aria-hidden="true" />
      <div className="pt">
        <span className="pk">{KINDS[ev.kind]?.label || "Event"}</span>
        <h3>{ev.title}</h3>
        <span className="pd">{dayLabel(ev.start, ev.tz)} · {timeLabel(ev.start, ev.tz)} {tzShort(ev.tz)}</span>
      </div>
    </>
  );
  return href ? <Link className={`poster ${size}`} href={href}>{inner}</Link> : <div className={`poster ${size}`}>{inner}</div>;
}

/** A moon disc showing a given phase (0 = new, 0.5 = full). */
export function Moon({ frac, seed = 5, style, className }: { frac: number; seed?: number; style?: React.CSSProperties; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const draw = () => ref.current && moonCanvas(ref.current, frac, seed, document.documentElement.dataset.mode === "day" ? "222,210,244" : undefined);
    draw(); window.addEventListener("moona-mode", draw);
    return () => window.removeEventListener("moona-mode", draw);
  }, [frac, seed]);
  return <canvas ref={ref} aria-hidden="true" style={style} className={className} />;
}
