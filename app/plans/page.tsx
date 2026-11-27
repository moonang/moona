"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Moon, Poster } from "@/components/Poster";
import { dayLabel } from "@/lib/core";

type Saved = { token: string; slug: string; title: string; start: string; tz: string; kind: string; status: string; name: string };
const word: Record<string, string> = { going: "You're going", pending: "Waiting for the host", maybe: "You said maybe", declined: "Declined" };

export default function Plans() {
  const [list, setList] = useState<Saved[] | null>(null);
  useEffect(() => { try { setList(JSON.parse(localStorage.getItem("moona-passes") || "[]")); } catch { setList([]); } }, []);
  if (!list) return null;
  const upcoming = list.filter((s) => new Date(s.start).getTime() > Date.now() - 864e5).sort((a, b) => a.start.localeCompare(b.start));
  return (
    <section className="sec">
      <div className="sec-h"><h2 style={{ fontSize: "clamp(34px,7vw,52px)" }}>My <em>plans</em></h2></div>
      {upcoming.length ? (
        <div className="stack" style={{ gap: 10 }}>
          {upcoming.map((s) => (
            <Link key={s.token} className="listrow" href={s.status === "maybe" ? `/e/${s.slug}` : `/p/${s.token}`}>
              <Poster ev={s} size="mini" />
              <div className="grow"><h3>{s.title}</h3><div className="dim small">{dayLabel(s.start, s.tz)} · {word[s.status] || "Replied"}</div></div>
              <span className={`pill ${s.status === "going" ? "ok" : s.status === "pending" ? "warn" : "info"}`}>{s.status === "maybe" ? "Maybe" : "Pass"}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty"><Moon frac={0.03} seed={4} style={{ width: 90, height: 90 }} /><h3>No plans yet</h3>
          <p style={{ margin: 0 }}>RSVP to an event and your pass lands here, on this phone.</p><Link className="btn gold" href="/">See what's on</Link></div>
      )}
    </section>
  );
}
