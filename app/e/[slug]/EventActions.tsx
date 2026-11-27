"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import type { EventVM, Pass } from "@/lib/types";
import { KINDS, cap1, dayLabel, fmt, money, moonInfo, timeLabel, tzShort } from "@/lib/core";
import { drawPoster } from "@/lib/art";
import { Poster } from "@/components/Poster";
import { Sheet, toast } from "@/components/ui";
import { rsvpAction, claimAction } from "./actions";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://moona.ng";
type Saved = { token: string; slug: string; title: string; start: string; tz: string; kind: string; status: string; name: string };

function loadSaved(): Saved[] { try { return JSON.parse(localStorage.getItem("moona-passes") || "[]"); } catch { return []; } }
function savePass(s: Saved) { try { const all = loadSaved().filter((x) => x.slug !== s.slug); localStorage.setItem("moona-passes", JSON.stringify([s, ...all].slice(0, 100))); } catch {} }

export default function EventActions({ ev, gcal }: { ev: EventVM; gcal: string; kindLabel: string; dayText: string }) {
  const router = useRouter();
  const [mine, setMine] = useState<Saved | null>(null);
  const [sheet, setSheet] = useState<null | "rsvp-going" | "rsvp-maybe" | "share" | "pass">(null);
  const [pass, setPass] = useState<Pass | null>(null);
  const [bring, setBring] = useState(ev.bring);

  useEffect(() => { setMine(loadSaved().find((s) => s.slug === ev.slug) || null); }, [ev.slug]);
  const full = ev.going >= ev.capacity;

  async function claim(itemId: string) {
    if (!mine || mine.status !== "going") { toast("RSVP first, then pick something to bring"); return; }
    const r = await claimAction(mine.token, itemId);
    if (!r.ok) { toast(r.error || "Couldn't save that"); return; }
    setBring((b) => b.map((x) => (x.id === itemId ? { ...x, takenBy: mine.name.split(" ")[0] } : x)));
    toast("Thank you! The host can see it's covered");
  }

  return (
    <>
      {bring.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Who's bringing what</div>
          <p className="dim small" style={{ margin: "0 0 10px" }}>Tap an item to say you'll bring it, so nothing doubles up.</p>
          <div className="bring">
            {bring.map((b) => (
              <div key={b.id} className={`bitem ${b.takenBy ? "taken" : ""}`}>
                <span className="box">{b.takenBy ? "✓" : ""}</span><span className="what">{b.item}</span>
                {b.takenBy ? <span className="dim small">{b.takenBy}</span> : <button className="btn sm" type="button" onClick={() => claim(b.id)}>I'll bring it</button>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="row" style={{ marginTop: 20 }}>
        <button className="btn wa sm" type="button" onClick={() => setSheet("share")}>Share</button>
        <a className="btn sm" href={gcal} target="_blank" rel="noopener">Add to calendar</a>
      </div>

      <div className="actionbar">
        {mine ? (
          <>
            <div className="note"><b>{({ going: "You're going", pending: "Waiting for the host", maybe: "You said maybe" } as any)[mine.status] || "You've replied"}</b></div>
            <button className="btn gold" type="button" onClick={() => (mine.status === "maybe" ? setSheet("rsvp-going") : router.push(`/p/${mine.token}`))}>
              {mine.status === "maybe" ? "Change RSVP" : "View pass"}
            </button>
          </>
        ) : full ? (
          <><div className="note"><b>Fully booked</b></div><button className="btn" type="button" onClick={() => toast("Waitlists arrive soon")}>Join waitlist</button></>
        ) : (
          <>
            <button className="btn" type="button" onClick={() => setSheet("rsvp-maybe")}>Maybe</button>
            <button className="btn gold" type="button" onClick={() => setSheet("rsvp-going")}>{ev.approval ? "Ask to join" : "I'm going"}</button>
          </>
        )}
      </div>

      {(sheet === "rsvp-going" || sheet === "rsvp-maybe") && (
        <RsvpSheet ev={ev} rsvp={sheet === "rsvp-maybe" ? "maybe" : "going"} onClose={() => setSheet(null)}
          onDone={(token, name, status, demoPass) => {
            const s: Saved = { token, slug: ev.slug, title: ev.title, start: ev.start, tz: ev.tz, kind: ev.kind, status, name };
            savePass(s); setMine(s); setSheet(null);
            if (status === "maybe") { toast("Saved as maybe. We'll nudge you before the day."); return; }
            if (demoPass) { setPass(demoPass); setSheet("pass"); } else router.push(`/p/${token}`);
          }} />
      )}
      {sheet === "share" && <ShareSheet ev={ev} onClose={() => setSheet(null)} />}
      {sheet === "pass" && pass && <Sheet onClose={() => setSheet(null)}><PassCard pass={pass} demo /></Sheet>}
    </>
  );
}

function RsvpSheet({ ev, rsvp, onClose, onDone }: { ev: EventVM; rsvp: "going" | "maybe"; onClose: () => void;
  onDone: (token: string, name: string, status: string, demoPass?: Pass) => void }) {
  const maybe = rsvp === "maybe";
  const showTiers = !maybe && (ev.tiers.length > 1 || (ev.tiers[0]?.price || 0) > 0);
  const kids = !maybe && ev.questions.some((q) => q.is_child);
  const [tierId, setTierId] = useState(ev.tiers[0]?.id);
  const [plus, setPlus] = useState(0);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(""); setBusy(true);
    const f = new FormData(e.currentTarget);
    const answers: Record<string, string> = {};
    ev.questions.forEach((q) => (answers[q.id] = String(f.get(`q-${q.id}`) || "")));
    const r = await rsvpAction({ slug: ev.slug, rsvp, name: String(f.get("name") || ""), phone: String(f.get("phone") || ""),
      email: String(f.get("email") || ""), tierId, plus, answers, guardianConsent: f.get("consent") === "on" });
    setBusy(false);
    if (r.ok === false) { setErr(r.error); return; }
    onDone(r.token, String(f.get("name")), maybe ? "maybe" : ev.approval ? "pending" : "going", r.demoPass);
  }

  return (
    <Sheet onClose={onClose}>
      <h2>{maybe ? <>Maybe <em>— no pressure</em></> : ev.approval ? <>Ask to <em>join</em></> : <>You're <em>going!</em></>}</h2>
      <div className="dim small">{ev.title}</div>
      <form className="stack" onSubmit={submit} noValidate>
        {showTiers && (
          <div className="tiers" role="radiogroup" aria-label="Ticket">
            {ev.tiers.map((t) => (
              <label key={t.id} className="tier"><span className="row"><input type="radio" name="tier" checked={tierId === t.id} onChange={() => setTierId(t.id)} /> {t.name}</span><b>{money(t.price, ev.cur)}</b></label>
            ))}
          </div>
        )}
        <label className="field"><span>Your name</span><input name="name" type="text" autoComplete="name" required /></label>
        <label className="field"><span>Email <small>· we'll send your confirmation and pass here</small></span><input name="email" type="email" inputMode="email" placeholder="you@example.com" autoComplete="email" required /></label>
        <label className="field"><span>WhatsApp number <small>· optional, for reminders</small></span><input name="phone" type="tel" placeholder="+234 803 000 0000" autoComplete="tel" /></label>
        {ev.plus && !maybe && (
          <div className="field"><span>Bringing anyone?</span>
            <div className="seg" role="group" aria-label="Plus-ones">
              {Array.from({ length: ev.maxPlus + 1 }, (_, i) => <button key={i} type="button" aria-pressed={plus === i} onClick={() => setPlus(i)}>{i === 0 ? "Just me" : `+${i}`}</button>)}
            </div></div>
        )}
        {!maybe && ev.questions.map((q) => <label key={q.id} className="field"><span>{q.label}</span><input name={`q-${q.id}`} type="text" /></label>)}
        {kids && (
          <label className="check" style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14 }}>
            <input name="consent" type="checkbox" style={{ marginTop: 3, width: 18, height: 18, accentColor: "var(--gold)", flex: "none" }} />
            <span>I'm this child's parent or guardian, and I agree to share these details with the host for this event only.</span>
          </label>
        )}
        <p role="alert" style={{ color: "var(--bad)", margin: 0 }}>{err}</p>
        <button className="btn gold block" type="submit" disabled={busy}>{busy ? "Saving…" : maybe ? "Save as maybe" : showTiers ? "Continue to payment" : ev.approval ? "Send request" : "Confirm"}</button>
        {showTiers && <div className="paynote"><b>Pay your way</b><span>Bank transfer, card, USSD, or cash at any Moniepoint agent. Payments are processed by <b>Sports DNA Ltd</b>, owner of Moona, so that name may appear on your bank statement.</span></div>}
        <p className="dim small" style={{ margin: 0 }}>Your details go to the host so they can manage the guest list. Moona is a product of Sports DNA Ltd. <a href="/privacy">Privacy policy</a></p>
      </form>
    </Sheet>
  );
}

export function PassCard({ pass, demo }: { pass: Pass; demo?: boolean }) {
  const [qr, setQr] = useState("");
  useEffect(() => { QRCode.toDataURL(`moona:${pass.event.slug}:${pass.code}`, { margin: 0, width: 248, color: { dark: "#191426", light: "#ffffff" } }).then(setQr); }, [pass]);
  const ev = pass.event;
  return (
    <>
      <div className="pass"><div className="top"><Poster ev={ev} size="wide" /></div>
        <div className="stub">
          <div>
            <span className="dim small">{pass.status === "pending" ? "Waiting for the host" : "Admit"}</span>
            <b>{pass.name}{pass.plus ? ` + ${pass.plus}` : ""}</b>
            <div className="dim small" style={{ marginTop: 6 }}>{pass.tierName} · {money(pass.price, ev.cur)}<br />Code <b style={{ fontSize: 14, display: "inline" }}>{pass.code}</b></div>
            {pass.status === "pending" && <p className="dim small" style={{ margin: "8px 0 0" }}>Your pass and the address unlock when the host confirms you.</p>}
            {pass.price > 0 && <p className="dim small" style={{ margin: "8px 0 0" }}>{pass.paymentStatus === "paid" ? "Paid" : "Payment pending"} · processed by Sports DNA Ltd for Moona</p>}
            {demo && <p className="dim small" style={{ margin: "8px 0 0" }}>Demo mode: this pass isn't saved.</p>}
          </div>
          <div className="qr" aria-label="QR code for check-in">{qr && <img src={qr} alt="" width={124} height={124} style={{ opacity: pass.status === "pending" ? 0.3 : 1 }} />}</div>
        </div></div>
      {!demo && pass.price === 0 && <div className="mailnote">✉️ {pass.status === "pending" ? "Request received. We've emailed you a copy." : "Your confirmation and pass are in your email."} Check your spam folder if you can't see it.</div>}
      <div className="field" style={{ margin: "12px 0 0" }}><span>Share with friends</span><ShareButtons ev={ev} /></div>
    </>
  );
}

function inviteText(ev: EventVM) {
  const k = KINDS[ev.kind] || KINDS.other;
  const place = ev.mode === "Online" ? "Online" : ev.hide ? `${ev.area} (address on RSVP)` : ev.venue.split(",").map((s) => s.trim()).slice(0, 2).join(", ");
  const firstLine = ev.about.split("\n").map((s) => s.trim()).find((s) => s && !s.startsWith("•")) || "";
  const lines = [`${k.emoji || "✨"} *You're invited!*`, "", `*${ev.title}*`, `_Hosted by ${ev.host}_`, "",
    `🗓 ${fmt(ev.start, ev.tz, { weekday: "long", day: "numeric", month: "long" })}`, `⏰ ${timeLabel(ev.start, ev.tz)} ${tzShort(ev.tz)}`, `📍 ${place}`,
    `🌙 ${cap1(moonInfo(ev.start).name)} on the night`, "", firstLine, "", `👉 RSVP here: ${SITE}/e/${ev.slug}`,
    ev.visibility === "public" ? "" : "🔒 _Private invite, please don't forward_", "", ev.brandingOff ? "" : "🌙 _Sent with Moona · moona.ng_"];
  return lines.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n").trim();
}
function waHTML(t: string) {
  const esc = t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" } as any)[c]);
  return esc.replace(/\*([^*\n]+)\*/g, "<b>$1</b>").replace(/_([^_\n]+)_/g, "<i>$1</i>").replace(/(https:\/\/\S+)/g, "<a>$1</a>");
}
/** Moona wordmark (public/moona-logo-share.png, 720×124) for drawing onto shared pictures. */
let logoP: Promise<HTMLImageElement | null> | null = null;
const logoImg = () => (logoP ||= new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = "/moona-logo-share.png"; }));
async function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, h: number) { const L = await logoImg(); if (L) ctx.drawImage(L, x, y, (h * L.width) / L.height, h); }
async function brandBadge(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const L = await logoImg(), lh = 34, lw = L ? (lh * L.width) / L.height : 0, pad = 18, gap = 16;
  ctx.font = `700 22px Sora, system-ui, sans-serif`;
  const tw = ctx.measureText("RSVP · moona.ng").width, bw = pad + lw + gap + tw + pad, bh = 58, x = W - bw - 24, y = H - bh - 24;
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 18; ctx.fillStyle = "rgba(18,4,42,.86)";
  ctx.beginPath(); (ctx as any).roundRect ? (ctx as any).roundRect(x, y, bw, bh, 29) : ctx.rect(x, y, bw, bh); ctx.fill(); ctx.restore();
  if (L) ctx.drawImage(L, x + pad - 4, y + (bh - lh) / 2, lw, lh);
  ctx.fillStyle = "#fff"; ctx.fillText("RSVP · moona.ng", x + pad + lw + gap, y + bh / 2 + 8);
}
async function posterImage(ev: EventVM) {
  const c = document.createElement("canvas"), W = 1200, H = 630; drawPoster(c, { id: ev.slug, kind: ev.kind, title: ev.title, start: ev.start }, { w: W, h: H });
  const ctx = c.getContext("2d")!, font = (s: number) => `700 ${s}px Sora, system-ui, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.font = font(22); ctx.fillText((KINDS[ev.kind]?.label || "Event").toUpperCase(), 56, 330);
  ctx.fillStyle = "#fff"; ctx.font = font(58);
  const lines: string[] = []; let line = "";
  ev.title.split(" ").forEach((w) => { const t = line ? `${line} ${w}` : w; if (ctx.measureText(t).width > 720 && line) { lines.push(line); line = w; } else line = t; }); lines.push(line);
  lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, 56, 400 + i * 66));
  ctx.font = font(26); ctx.fillStyle = "rgba(255,255,255,.88)";
  ctx.fillText(`${dayLabel(ev.start, ev.tz)} · ${timeLabel(ev.start, ev.tz)} ${tzShort(ev.tz)}`, 56, 400 + Math.min(lines.length, 3) * 66 + 18);
  const branded = !ev.brandingOff;
  if (branded) { ctx.save(); ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 14; await drawLogo(ctx, 40, 34, 58); ctx.restore(); }
  const pill = branded ? "RSVP · moona.ng" : "RSVP now"; ctx.font = font(24); const pw = ctx.measureText(pill).width + 40;
  ctx.fillStyle = "#FF1F8E"; ctx.beginPath(); (ctx as any).roundRect ? (ctx as any).roundRect(W - 50 - pw, H - 86, pw, 50, 25) : ctx.rect(W - 50 - pw, H - 86, pw, 50); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.fillText(pill, W - 50 - pw + 20, H - 52);
  return c.toDataURL("image/jpeg", 0.9);
}
/** The host's flyer for link previews: blurred backdrop + the whole flyer at 1200×630. */
async function flyerImage(src: string, branded = true) {
  const c = document.createElement("canvas"), W = 1200, H = 630, ctx = c.getContext("2d")!; c.width = W; c.height = H;
  try {
    const im = await new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = no; i.src = src; });
    const cover = Math.max(W / im.width, H / im.height), fit = Math.min(W / im.width, H / im.height);
    ctx.filter = "blur(28px) brightness(.6)"; ctx.drawImage(im, (W - im.width * cover) / 2, (H - im.height * cover) / 2, im.width * cover, im.height * cover); ctx.filter = "none";
    ctx.drawImage(im, (W - im.width * fit) / 2, (H - im.height * fit) / 2, im.width * fit, im.height * fit);
  } catch {}
  if (!branded) return c.toDataURL("image/jpeg", 0.9);
  await brandBadge(ctx, W, H);
  return c.toDataURL("image/jpeg", 0.9);
}

/** WhatsApp, Email, Facebook, X, Threads. Private events: one-to-one channels only (no public social posts). */
export function ShareButtons({ ev }: { ev: EventVM }) {
  const url = `${SITE}/e/${ev.slug}`, e = encodeURIComponent, priv = ev.visibility !== "public";
  const area = ev.mode === "Online" ? "Online" : ev.area || ev.venue.split(",").slice(-2).join(",").trim();
  const short = `${KINDS[ev.kind]?.emoji || "✨"} ${ev.title} · ${fmt(ev.start, ev.tz, { weekday: "short", day: "numeric", month: "short" })}, ${timeLabel(ev.start, ev.tz)} · ${area}. RSVP on Moona:`;
  const text = inviteText(ev);
  const links = [
    { k: "wa", label: "WhatsApp", href: `https://wa.me/?text=${e(text)}` },
    { k: "mail", label: "Email", href: `mailto:?subject=${e(`${priv ? "You're invited" : "Join me"}: ${ev.title}`)}&body=${e(text.replace(/[*_]/g, ""))}` },
    ...(priv ? [] : [
      { k: "fb", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${e(url)}` },
      { k: "x", label: "X", href: `https://x.com/intent/tweet?text=${e(short)}&url=${e(url)}` },
      { k: "th", label: "Threads", href: `https://www.threads.com/intent/post?text=${e(short)}&url=${e(url)}` },
    ]),
  ];
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator !== "undefined" && !!navigator.share), []);
  return (
    <>
      <div className="sharegrid">
        {links.map((l) => <a key={l.k} className={`sh sh-${l.k}`} href={l.href} {...(l.k === "mail" ? {} : { target: "_blank", rel: "noopener" })}>{l.label}</a>)}
        <button type="button" className="sh sh-copy" onClick={async () => { try { await navigator.clipboard.writeText(url); toast("Link copied"); } catch { toast(url); } }}>Copy link</button>
        {canShare && <button type="button" className="sh sh-more" onClick={async () => { try { await navigator.share({ title: ev.title, text: `${short} ${url}` }); } catch {} }}>More…</button>}
      </div>
      {priv && <p className="dim small" style={{ margin: "6px 0 0" }}>🔒 Private event, so it's shared one-to-one only, not posted on social media.{ev.approval ? " The host still approves each guest." : ""}</p>}
    </>
  );
}

function ShareSheet({ ev, onClose }: { ev: EventVM; onClose: () => void }) {
  const text = inviteText(ev);
  const [img, setImg] = useState("");
  const [save, setSave] = useState(false);
  useEffect(() => { if (ev.flyer) { flyerImage(ev.flyer, !ev.brandingOff).then(setImg); return; } document.fonts?.load('700 60px "Sora"').finally(() => posterImage(ev).then(setImg)); }, [ev]);
  const now = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
  return (
    <Sheet onClose={onClose}>
      {save ? (<>
        <h2>Save the <em>poster</em></h2><img className="saveimg" src={img} alt={`Poster for ${ev.title}`} />
        <p className="dim small" style={{ margin: 0 }}>Press and hold the image, then choose Save or Share.</p>
        <button className="btn block" type="button" onClick={() => setSave(false)}>Back</button>
      </>) : (<>
        <h2>Share the <em>invite</em></h2>
        <div className="dim small">How it will look in WhatsApp</div>
        <div className="wa-chat"><div className="wa-bubble">
          <div className="wa-card">{img && <img src={img} alt="" />}<div className="t"><b>{ev.title}</b><span>RSVP on Moona · moona.ng</span></div></div>
          <div className="wa-msg" dangerouslySetInnerHTML={{ __html: waHTML(text) }} /><span className="wa-time">{now} ✓✓</span>
        </div></div>
        <ShareButtons ev={ev} />
        <div className="row">
          <button className="btn" style={{ flex: 1 }} type="button" onClick={async () => { try { await navigator.clipboard.writeText(text); toast("Invite copied"); } catch { toast("Couldn't copy"); } }}>Copy message</button>
          <button className="btn" style={{ flex: 1 }} type="button" onClick={() => setSave(true)} disabled={!img}>Save {ev.flyer ? "flyer" : "poster"}</button>
        </div>
      </>)}
    </Sheet>
  );
}
