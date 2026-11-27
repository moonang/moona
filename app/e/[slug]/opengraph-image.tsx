import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getEventBySlug } from "@/lib/data";
import { KINDS, dayLabel, moonInfo, timeLabel, tzShort } from "@/lib/core";

// The picture card WhatsApp, iMessage, LinkedIn and X show when a Moona link is shared.
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Moona event invitation";

function moonSvg(frac: number, r = 150) {
  const cx = r, cy = r, top = `${cx},${cy - r}`, bot = `${cx},${cy + r}`;
  const lit = "#F6EED8", dark = "#2A2550";
  const t = frac * 2 * Math.PI, k = Math.abs(Math.cos(t)) * r;
  const waxing = frac < 0.5, gibbous = Math.cos(t) < 0;
  // Lit side is the right side while waxing, left side while waning.
  const outer = waxing ? `A${r},${r} 0 0 1 ${bot}` : `A${r},${r} 0 0 0 ${bot}`;
  const term = `A${k.toFixed(1)},${r} 0 0 ${waxing === gibbous ? 1 : 0} ${top}`;
  const d = `M${top} ${outer} ${term} Z`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${2 * r}" height="${2 * r}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${dark}"/><path d="${d}" fill="${lit}"/></svg>`)}`;
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const ev = await getEventBySlug((await params).slug);
  const font = await readFile(path.join(process.cwd(), "node_modules/@fontsource/sora/files/sora-latin-700-normal.woff"));
  // Moona wordmark on every shared invite (branding). 720×124 PNG for dark backgrounds.
  const logo = `data:image/png;base64,${(await readFile(path.join(process.cwd(), "public/moona-logo-share.png"))).toString("base64")}`;
  const LOGO_W = 720, LOGO_H = 124;
  const k = (ev && KINDS[ev.kind]) || KINDS.other;
  const title = ev?.title || "You're invited";
  const when = ev ? `${dayLabel(ev.start, ev.tz)} · ${timeLabel(ev.start, ev.tz)} ${tzShort(ev.tz)}` : "";
  const mi = moonInfo(ev?.start || new Date().toISOString());
  // The host's own flyer: shown whole on a brand background, with a Moona badge in the corner.
  if (ev?.flyer) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", fontFamily: "Sora", background: "linear-gradient(160deg, #2A1056 0%, #12042A 100%)", color: "#fff" }}>
          <img src={ev.flyer} width={1200} height={630} style={{ position: "absolute", inset: 0, objectFit: "contain" }} />
          {!ev.brandingOff && <div style={{ position: "absolute", right: 24, bottom: 24, display: "flex", alignItems: "center", gap: 16, padding: "12px 22px", borderRadius: 40, background: "rgba(18,4,42,.88)", fontSize: 22 }}>
            <img src={logo} width={Math.round(LOGO_W * 34 / LOGO_H)} height={34} /><span>RSVP · moona.ng</span>
          </div>}
        </div>
      ),
      { ...size, fonts: [{ name: "Sora", data: font, weight: 700, style: "normal" }] }
    );
  }
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", fontFamily: "Sora",
        background: `linear-gradient(160deg, ${k.c[0]} 0%, ${k.c[1]} 100%)`, color: "#fff" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(180deg, rgba(6,6,20,0) 35%, rgba(6,6,20,.85) 100%)" }} />
        {!ev?.brandingOff && <img src={logo} width={Math.round(LOGO_W * 52 / LOGO_H)} height={52} style={{ position: "absolute", left: 50, top: 42 }} />}
        <img src={moonSvg(mi.frac)} width={300} height={300} style={{ position: "absolute", right: 110, top: 50, borderRadius: 150, boxShadow: "0 0 120px rgba(255,236,200,.45)" }} />
        <div style={{ position: "absolute", left: 56, bottom: 60, right: 340, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 22, letterSpacing: 4, textTransform: "uppercase", opacity: 0.85 }}>{k.label}</div>
          <div style={{ fontSize: title.length > 40 ? 54 : 64, lineHeight: 1.05, letterSpacing: -1.5 }}>{title}</div>
          <div style={{ fontSize: 28, opacity: 0.9 }}>{when}</div>
        </div>
        <div style={{ position: "absolute", right: 50, bottom: 44, display: "flex", padding: "12px 26px", borderRadius: 40, background: "#FF1F8E", fontSize: 26 }}>{ev?.brandingOff ? "RSVP now" : "RSVP · moona.ng"}</div>
      </div>
    ),
    { ...size, fonts: [{ name: "Sora", data: font, weight: 700, style: "normal" }] }
  );
}
