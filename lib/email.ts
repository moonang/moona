import "server-only";
// Transactional email (RSVP confirmations) through Resend's HTTP API. No extra package needed.
// Env: RESEND_API_KEY (secret), EMAIL_FROM e.g. "Moona <hello@moona.ng>" (domain must be verified in Resend).
// If the key isn't set (demo / local), emails are skipped and the RSVP still succeeds.
import type { EventVM } from "@/lib/types";
import { fmt, timeLabel, tzShort, KINDS } from "@/lib/core";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://moona.ng";
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as any)[c]);

export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM;
  if (!key || !from) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
      signal: AbortSignal.timeout(8000),
    });
    return r.ok;
  } catch { return false; }
}

const gcal = (ev: EventVM) => {
  const s = new Date(ev.start), e = new Date(s.getTime() + ev.mins * 60000), f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${f(s)}/${f(e)}&details=${encodeURIComponent(`${SITE}/e/${ev.slug}`)}`;
};

/** "You're in" / "Request received" / "Saved as maybe" email after an RSVP. */
export function rsvpEmail(ev: EventVM, g: { name: string; status: string; code: string; token: string; plus: number }) {
  const k = KINDS[ev.kind] || KINDS.other;
  const when = `${fmt(ev.start, ev.tz, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · ${timeLabel(ev.start, ev.tz)} ${tzShort(ev.tz)}`;
  const confirmed = g.status === "going";
  const where = ev.mode === "Online" ? "Online (link on your pass)" : (ev.hide && !confirmed ? `${ev.area} (full address once you're confirmed)` : ev.venue);
  const passUrl = `${SITE}/p/${g.token}`;
  const subject = g.status === "pending" ? `Request received: ${ev.title}` : g.status === "maybe" ? `Saved as maybe: ${ev.title}` : `You're in: ${ev.title}`;
  const lead = g.status === "pending" ? `Thanks, ${g.name}. Your request to join has gone to ${ev.host}. We'll email you as soon as they confirm.`
    : g.status === "maybe" ? `Thanks, ${g.name}. You're down as a maybe. We'll remind you before the day so you can confirm.`
    : `You're going, ${g.name}${g.plus ? ` (plus ${g.plus})` : ""}! Show your pass at the door.`;
  const text = [`${k.emoji || "✨"} ${subject}`, "", lead, "", ev.title, `Hosted by ${ev.host}`, when, where, "",
    confirmed ? `Your pass (code ${g.code}): ${passUrl}` : `View or change your RSVP: ${passUrl}`, `Add to Google Calendar: ${gcal(ev)}`, "",
    "Keep this email private: the link is your personal pass.", "", "🌙 Moona · a product of Sports DNA Ltd · moona.ng"].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#F6F2FF;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1B0838">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:20px;overflow:hidden" cellpadding="0" cellspacing="0">
<tr><td style="background:#12042A;padding:20px 24px"><a href="${SITE}" style="text-decoration:none;color:#fff;font-size:24px;font-weight:800"><img src="${SITE}/moona-logo-share.png" width="140" height="24" alt="moona" style="display:block;border:0;height:24px;width:140px;color:#fff;font-size:24px;font-weight:800"></a></td></tr>
<tr><td style="padding:26px 24px 8px"><div style="font-size:13px;font-weight:700;color:#FF1F8E;text-transform:uppercase;letter-spacing:.06em">${esc(k.label)}</div>
<h1 style="margin:6px 0 10px;font-size:26px;line-height:1.2">${esc(ev.title)}</h1><p style="margin:0 0 16px;font-size:16px;line-height:1.5">${esc(lead)}</p>
<p style="margin:0;font-size:15px;line-height:1.6;color:#4A3B66">🗓 ${esc(when)}<br>📍 ${esc(where)}<br>👤 Hosted by ${esc(ev.host)}</p></td></tr>
<tr><td style="padding:18px 24px 6px">${confirmed ? `<div style="border:1px dashed #C9B8F0;border-radius:14px;padding:12px 14px;font-size:15px">Pass code <b style="font-size:18px;letter-spacing:.04em">${esc(g.code)}</b></div>` : ""}</td></tr>
<tr><td style="padding:12px 24px 4px"><a href="${esc(passUrl)}" style="display:inline-block;background:#FF1F8E;color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:999px">${confirmed ? "Open my pass" : "View my RSVP"}</a>
&nbsp; <a href="${esc(gcal(ev))}" style="color:#6C1CFF;font-weight:600">Add to calendar</a></td></tr>
<tr><td style="padding:18px 24px 24px;font-size:12.5px;color:#7A6A99;line-height:1.5">Keep this email private: the button above is your personal pass link.<br>Moona is a product of Sports DNA Ltd · <a href="${SITE}" style="color:#7A6A99">moona.ng</a> · <a href="${SITE}/privacy" style="color:#7A6A99">Privacy</a></td></tr>
</table></td></tr></table></body></html>`;
  return { subject, html, text };
}
