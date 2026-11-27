// Guest list export (spreadsheet/CSV). Paid only: the host has Moona Pro, OR this event is Boosted.
// Checked here on the server: hiding the button in the app is not enough on its own. Free hosts
// still see their guests on screen to run the event, but downloading, copying and reports are paid.
import { NextResponse } from "next/server";
import { isDemo, userClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Stops spreadsheet formula injection: a guest typing "=HYPERLINK(...)" as their name must stay plain text.
const cell = (v: unknown) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  if (isDemo()) return NextResponse.json({ error: "Exports need the live database." }, { status: 503 });
  const { slug } = await ctx.params;
  const sb = await userClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  // Owner only: the query is scoped to this user's events, and row-level security enforces it again.
  const { data: ev } = await sb.from("events").select("id, title, slug, boosted, event_questions(label, position)").eq("slug", slug).eq("owner_id", user.id).maybeSingle();
  if (!ev) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const { data: prof } = await sb.from("profiles").select("pro_until, is_admin").eq("id", user.id).single();
  const isPro = !!prof?.pro_until && new Date(prof.pro_until).getTime() > Date.now();
  // events.boosted is protected by the guard_plan_fields trigger: only the payment webhook can set it.
  if (!isPro && !ev.boosted && !prof?.is_admin) return NextResponse.json({ error: "Guest list exports come with Event Boost or Moona Pro." }, { status: 403 });

  const { data: rows, error } = await sb.from("rsvps")
    .select("name, phone, email, status, plus, answers, payment_status, amount_paid, checked_in_at, created_at, ticket_tiers(name)")
    .eq("event_id", ev.id).neq("status", "cancelled").order("created_at");
  if (error) return NextResponse.json({ error: "Couldn't load the guest list." }, { status: 500 });

  const qs = [...(ev.event_questions ?? [])].sort((a: any, b: any) => a.position - b.position).map((q: any) => q.label as string);
  const head = ["Name", "Phone", "Email", "Status", "Plus-ones", "Ticket", "Paid", ...qs, "Checked in", "RSVP'd on"];
  const lines = [head.map(cell).join(",")];
  for (const r of rows ?? []) {
    const a = (r.answers ?? {}) as Record<string, string>;
    lines.push([r.name, r.phone, r.email, r.status, r.plus, (r as any).ticket_tiers?.name ?? "", r.payment_status === "paid" ? r.amount_paid : "",
      ...qs.map(q => a[q] ?? ""), r.checked_in_at ?? "", r.created_at].map(cell).join(","));
  }
  const file = `${ev.slug}-guest-list.csv`.replace(/[^a-z0-9.\-]/gi, "-");
  return new NextResponse("﻿" + lines.join("\r\n"), {   // BOM so Excel opens Naira signs and accents correctly
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${file}"`, "Cache-Control": "no-store" },
  });
}
