import "server-only";
import { rsvpEmail, sendEmail } from "@/lib/email";
import { adminClient, isDemo } from "./supabase/server";
import { DEMO_EVENTS } from "./demo";
import type { EventVM, Pass } from "./types";
import { FREE_GUEST_CAP, categoryOf, type Category } from "./core";

// ---------- mapping from database rows ----------
function toVM(e: any, counts?: { going: number; maybe: number }): EventVM {
  const pro = e.profiles?.pro_until && new Date(e.profiles.pro_until).getTime() > Date.now();
  const guestCap = e.boosted || pro ? 100000 : FREE_GUEST_CAP;
  return {
    id: e.id, slug: e.slug, kind: e.kind, visibility: e.visibility, category: categoryOf(e), title: e.title, host: e.host_name, about: e.about,
    start: e.starts_at, mins: e.duration_min, tz: e.tz, mode: e.mode, venue: e.venue, area: e.area, hide: e.hide_address,
    approval: e.approval, plus: e.allow_plus, maxPlus: e.max_plus, capacity: e.capacity, cur: e.currency, cert: e.certificate,
    cpd: Number(e.cpd_hours) || 0, sponsors: e.sponsors || [],
    tiers: (e.ticket_tiers || []).sort((a: any, b: any) => a.position - b.position).map((t: any) => ({ id: t.id, name: t.name, price: t.price })),
    questions: (e.event_questions || []).sort((a: any, b: any) => a.position - b.position).map((q: any) => ({ id: q.id, label: q.label, is_child: q.is_child })),
    bring: (e.bring_items || []).sort((a: any, b: any) => a.position - b.position)
      .map((b: any) => ({ id: b.id, item: b.item, takenBy: b.rsvps?.name ? String(b.rsvps.name).split(" ")[0] : null })),
    going: counts?.going ?? 0, maybe: counts?.maybe ?? 0, guestCap, flyer: e.flyer_url || null, brandingOff: !!(pro && e.hide_branding),
  };
}
const EVENT_SELECT = "*, profiles!events_owner_id_fkey(pro_until), ticket_tiers(*), event_questions(*), bring_items(*, rsvps(name))";

async function countsFor(ids: string[]) {
  if (!ids.length) return {} as Record<string, { going: number; maybe: number }>;
  const { data } = await adminClient().from("event_counts").select("*").in("event_id", ids);
  return Object.fromEntries((data || []).map((c: any) => [c.event_id, { going: c.going, maybe: c.maybe }]));
}

// ---------- reads ----------
/** Public, approved events for What's on, optionally for one category. */
export async function getPublicEvents(category?: Category): Promise<EventVM[]> {
  if (isDemo()) return DEMO_EVENTS.filter((e) => e.visibility === "public" && (!category || e.category === category)).sort((a, b) => a.start.localeCompare(b.start));
  let q = adminClient().from("events").select(EVENT_SELECT)
    .eq("visibility", "public").eq("status", "published").eq("listing_status", "approved")
    .gte("starts_at", new Date(Date.now() - 6 * 3600e3).toISOString());
  if (category) q = q.eq("category", category);
  const { data, error } = await q.order("featured", { ascending: false }).order("starts_at").limit(60);
  if (error) throw error;
  const counts = await countsFor((data || []).map((e) => e.id));
  return (data || []).map((e) => toVM(e, counts[e.id]));
}

/** Private events are reachable only through their exact link, never listed. */
export async function getEventBySlug(slug: string): Promise<EventVM | null> {
  if (!/^[a-z0-9-]{3,60}$/.test(slug)) return null;
  if (isDemo()) return DEMO_EVENTS.find((e) => e.slug === slug) || null;
  const { data } = await adminClient().from("events").select(EVENT_SELECT).eq("slug", slug).eq("status", "published").maybeSingle();
  if (!data) return null;
  const counts = await countsFor([data.id]);
  return toVM(data, counts[data.id]);
}

// ---------- guest RSVP ----------
export type RsvpInput = {
  slug: string; rsvp: "going" | "maybe"; name: string; phone?: string; email: string; tierId?: string; plus?: number;
  answers?: Record<string, string>; guardianConsent?: boolean;
};
export type RsvpResult = { ok: true; token: string; demoPass?: Pass } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[a-z]{2,}$/i;
const clean = (s: unknown, max = 200) => String(s ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
const newCode = () => "MNA-" + Array.from(crypto.getRandomValues(new Uint8Array(4))).map((b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("") +
  Array.from(crypto.getRandomValues(new Uint8Array(2))).map((b) => "23456789"[b % 8]).join("");

export async function createRsvp(input: RsvpInput): Promise<RsvpResult> {
  const ev = await getEventBySlug(clean(input.slug, 60));
  if (!ev) return { ok: false, error: "This event no longer exists." };
  const name = clean(input.name, 120), phone = clean(input.phone, 30), email = clean(input.email, 254).toLowerCase();
  if (name.length < 2) return { ok: false, error: "Add your name so the host knows who's coming." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Add a valid email address so we can send your confirmation." };
  if (phone && phone.replace(/\D/g, "").length < 7) return { ok: false, error: "That WhatsApp number looks too short. Check it, or leave it blank." };
  const maybe = input.rsvp === "maybe";
  const tier = ev.tiers.find((t) => t.id === input.tierId) || ev.tiers[0];
  const plus = ev.plus && !maybe ? Math.max(0, Math.min(ev.maxPlus, Math.floor(Number(input.plus) || 0))) : 0;
  const answers: Record<string, string> = {};
  if (!maybe) for (const q of ev.questions) answers[q.label] = clean(input.answers?.[q.id], 300);
  const needsConsent = !maybe && ev.questions.some((q) => q.is_child);
  if (needsConsent && !input.guardianConsent) return { ok: false, error: "Please confirm you're the child's parent or guardian and agree to share their details." };
  if (!maybe && ev.going + 1 + plus > ev.capacity) return { ok: false, error: "Sorry, this event is now full." };
  if (!maybe && ev.going + 1 + plus > ev.guestCap) return { ok: false, error: "This event has reached its guest limit. Let the host know: they can lift it with Moona Pro or an Event Boost." };

  const status = maybe ? "maybe" : ev.approval ? "pending" : "going";
  const paid = !maybe && tier && tier.price > 0;
  const code = newCode();

  if (isDemo()) {
    const token = crypto.randomUUID();
    return { ok: true, token, demoPass: { token, code, name, plus, status, tierName: tier?.name || "Guest", price: tier?.price || 0, paymentStatus: paid ? "pending" : "none", event: ev } };
  }
  const { data, error } = await adminClient().from("rsvps").insert({
    event_id: ev.id, tier_id: tier?.id ?? null, name, phone: phone || null, email, plus, status, answers,
    guardian_consent_at: needsConsent ? new Date().toISOString() : null, code, payment_status: paid ? "pending" : "none",
  }).select("manage_token").single();
  if (error) return { ok: false, error: "Something went wrong saving your RSVP. Please try again." };
  // Confirmation email. Paid tickets get theirs from the payment webhook instead, once payment clears.
  if (!paid) {
    const m = rsvpEmail(ev, { name, status, code, token: data.manage_token, plus });
    if (await sendEmail(email, m.subject, m.html, m.text))
      await adminClient().from("rsvps").update({ confirmation_sent_at: new Date().toISOString() }).eq("manage_token", data.manage_token);
  }
  return { ok: true, token: data.manage_token };
}

export async function getPass(token: string): Promise<Pass | null> {
  if (isDemo() || !/^[0-9a-f-]{36}$/.test(token)) return null;
  const { data } = await adminClient().from("rsvps").select("*, ticket_tiers(name, price), events(slug)").eq("manage_token", token).maybeSingle();
  if (!data) return null;
  const ev = await getEventBySlug(data.events.slug);
  if (!ev) return null;
  return { token, code: data.code, name: data.name, plus: data.plus, status: data.status, tierName: data.ticket_tiers?.name || "Guest",
    price: data.ticket_tiers?.price || 0, paymentStatus: data.payment_status, event: ev };
}

/** A guest with a pass says they'll bring an item. */
export async function claimBring(token: string, itemId: string): Promise<{ ok: boolean; error?: string }> {
  if (isDemo()) return { ok: true };
  const pass = await getPass(token);
  if (!pass || pass.status !== "going") return { ok: false, error: "RSVP first, then pick something to bring." };
  const db = adminClient();
  const { data: rsvp } = await db.from("rsvps").select("id").eq("manage_token", token).single();
  const { error } = await db.from("bring_items").update({ rsvp_id: rsvp!.id }).eq("id", itemId).eq("event_id", pass.event.id).is("rsvp_id", null);
  return error ? { ok: false, error: "Someone just took that one." } : { ok: true };
}
