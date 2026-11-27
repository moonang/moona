"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const I = {
  home: <svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></svg>,
  plus: <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>,
  ticket: <svg viewBox="0 0 24 24"><path d="M4 8a2 2 0 0 0 2-2h12a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H6a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z" /><path d="M14 6v12" strokeDasharray="2 2" /></svg>,
  host: <svg viewBox="0 0 24 24"><path d="M8 4h8M9 4v2a3 3 0 0 0 6 0V4M5 8h14v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" /><path d="M9 13l2 2 4-4" /></svg>,
};

export default function Nav() {
  const p = usePathname();
  const cur = (k: string): "page" | undefined => ((k === "/" ? p === "/" : p.startsWith(k)) ? "page" : undefined);
  return (
    <nav className="nav" aria-label="Main">
      <Link href="/" aria-current={cur("/")}>{I.home}<span>Home</span></Link>
      <Link href="/create" className="plus" aria-current={cur("/create")}><span className="dot">{I.plus}</span><span>Create</span></Link>
      <Link href="/plans" aria-current={cur("/plans")}>{I.ticket}<span>My plans</span></Link>
      <Link href="/host" aria-current={cur("/host")}>{I.host}<span>Hosting</span></Link>
    </nav>
  );
}
