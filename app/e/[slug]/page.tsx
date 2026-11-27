import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEventBySlug } from "@/lib/data";
import { KINDS, cap1, dayLabel, fmt, gcalStamp, moonInfo, timeLabel, tzShort, untilLabel } from "@/lib/core";
import { Moon, Poster } from "@/components/Poster";
import EventActions from "./EventActions";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ev = await getEventBySlug((await params).slug);
  if (!ev) return { title: "Event not found" };
  const when = `${fmt(ev.start, ev.tz, { weekday: "long", day: "numeric", month: "long" })}, ${timeLabel(ev.start, ev.tz)} ${tzShort(ev.tz)}`;
  const description = `${when} · Hosted by ${ev.host}. RSVP on Moona.`;
  return {
    title: ev.title, description,
    openGraph: { title: ev.title, description, type: "website" },
    twitter: { card: "summary_large_image", title: ev.title, description },
    robots: ev.visibility === "public" ? undefined : { index: false, follow: false },
  };
}

export default async function EventPage({ params }: Props) {
  const ev = await getEventBySlug((await params).slug);
  if (!ev) notFound();
  const end = new Date(new Date(ev.start).getTime() + ev.mins * 60000).toISOString();
  const other = ev.tz === "Africa/Lagos" ? "Europe/London" : "Africa/Lagos";
  const multiDay = ev.mins >= 1440;
  const moon = moonInfo(ev.start);
  const showAddress = !ev.hide; // guests see the full address on their pass once confirmed
  const parts = ev.venue.split(",").map((s) => s.trim());
  const placeTitle = ev.mode === "Online" ? "Online" : showAddress ? parts[0] : ev.area || "Private location";
  const placeSub = ev.mode === "Online" ? "Link on your pass" : showAddress ? parts.slice(1).join(", ") : "Exact address shared once the host confirms you";
  const left = Math.max(0, ev.capacity - ev.going);

  return (
    <div className="ev">
      <div className="left"><Poster ev={ev} size="hero" /></div>
      <div>
        <div className="row between">
          <span className="countdown">{untilLabel(ev.start)}</span>
          <span className="row" style={{ gap: 6 }}>
            {ev.visibility === "public" ? <span className="pill ok">🌍 Public</span> : <span className="pill info">🔒 Private</span>}
            {ev.approval && <span className="pill warn">Host approves</span>}
            {ev.cert && <span className="pill ok">Certificate</span>}
          </span>
        </div>
        <h1 style={{ marginTop: 8 }}>{ev.title}</h1>
        <div className="dim" style={{ marginTop: 8 }}>Hosted by <b style={{ color: "var(--tx)" }}>{ev.host}</b></div>
        {ev.visibility !== "public" && <div className="dim small" style={{ marginTop: 6 }}>Invitation only. Only people with the link can see this event.</div>}

        <div className="facts">
          <div className="fact">
            <div className="glyph"><div><small>{fmt(ev.start, ev.tz, { month: "short" })}</small><span className="n">{fmt(ev.start, ev.tz, { day: "numeric" })}</span></div></div>
            <div>
              <b>{fmt(ev.start, ev.tz, { weekday: "long", day: "numeric", month: "long" })}{multiDay ? ` – ${fmt(end, ev.tz, { weekday: "short", day: "numeric", month: "short" })}` : ""}</b>
              <div className="dim small">{multiDay ? `From ${timeLabel(ev.start, ev.tz)} ${tzShort(ev.tz)}` : `${timeLabel(ev.start, ev.tz)}–${timeLabel(end, ev.tz)} ${tzShort(ev.tz)} · ${timeLabel(ev.start, other)} ${tzShort(other)}`}</div>
            </div>
          </div>
          <div className="fact"><div className="glyph">{showAddress ? "⌖" : "🔒"}</div><div><b>{placeTitle}</b><div className="dim small">{placeSub}</div></div></div>
          <div className="fact"><div className="glyph"><Moon frac={moon.frac} seed={3} /></div><div><b>{cap1(moon.name)} on the night</b><div className="dim small">{moon.lit}% of the moon lit</div></div></div>
          <div className="fact">
            <div className="glyph" style={{ fontSize: 20, fontWeight: 700 }}>{ev.going}</div>
            <div><b>{ev.going} going{ev.maybe ? ` · ${ev.maybe} maybe` : ""}</b>
              <div className="cap" style={{ marginTop: 8 }}><i style={{ width: `${Math.min(100, (ev.going / ev.capacity) * 100)}%` }} /></div>
              <div className="dim small" style={{ marginTop: 6 }}>{left} of {ev.capacity} spots left</div></div>
          </div>
        </div>

        {ev.sponsors.length > 0 && (
          <div style={{ marginTop: 18 }}><div className="eyebrow" style={{ marginBottom: 8 }}>Supported by</div>
            <div className="row">{ev.sponsors.map((s) => <span key={s} className="pill">{s}</span>)}</div></div>
        )}
        <div style={{ marginTop: 24 }}><div className="eyebrow" style={{ marginBottom: 8 }}>About</div><div className="about">{ev.about}</div></div>

        <EventActions ev={ev} gcal={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${gcalStamp(ev.start)}/${gcalStamp(end)}`}
          kindLabel={KINDS[ev.kind]?.label || "Event"} dayText={dayLabel(ev.start, ev.tz)} />
      </div>
    </div>
  );
}
