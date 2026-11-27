import { notFound } from "next/navigation";
import Link from "next/link";
import { getPass } from "@/lib/data";
import { PassCard } from "@/app/e/[slug]/EventActions";

export const metadata = { title: "Your pass", robots: { index: false, follow: false } };

export default async function PassPage({ params }: { params: Promise<{ token: string }> }) {
  const pass = await getPass((await params).token);
  if (!pass) notFound();
  const ev = pass.event;
  const confirmed = pass.status === "going";
  return (
    <section className="sec" style={{ maxWidth: 520, margin: "0 auto" }}>
      <Link href={`/e/${ev.slug}`} className="dim small" style={{ textDecoration: "none" }}>← Event page</Link>
      <h1 style={{ fontSize: "clamp(30px,6vw,44px)", margin: "10px 0 16px" }}>Your <em>pass</em></h1>
      <PassCard pass={pass} />
      {confirmed && ev.mode === "In person" && ev.hide && (
        <div className="paynote" style={{ marginTop: 14 }}><b>Address</b><span>{ev.venue}</span></div>
      )}
      <p className="dim small" style={{ marginTop: 14 }}>Keep this link private. Anyone with it can see your pass. Show the QR code at the door.</p>
    </section>
  );
}
