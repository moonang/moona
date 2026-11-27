import Link from "next/link";
export default function Soon({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="sec" style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: "clamp(32px,7vw,48px)" }}>{title}</h1>
      <div className="dim" style={{ marginTop: 10 }}>{children}</div>
      <div className="row" style={{ marginTop: 18 }}><Link className="btn" href="/">Back home</Link></div>
    </section>
  );
}
