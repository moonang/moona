import Link from "next/link";
import { getPublicEvents } from "@/lib/data";
import { CATEGORIES, isCategory, money, moonInfo, untilLabel } from "@/lib/core";
import { Moon, Poster } from "@/components/Poster";

export const revalidate = 60; // refresh What's On every minute

function priceFrom(tiers: { price: number }[], cur: "NGN" | "GBP") {
  const ps = tiers.map((t) => t.price); const mn = Math.min(...ps);
  return mn === 0 ? (Math.max(...ps) ? "Free option" : "Free") : `From ${money(mn, cur)}`;
}

export default async function Home({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat } = await searchParams;
  const category = isCategory(cat) ? cat : undefined;   // ?cat=business|learning|social|family; anything else shows all
  const events = await getPublicEvents(category);
  const current = CATEGORIES.find((c) => c.key === category);
  const mi = moonInfo(new Date().toISOString());
  return (
    <>
      <section className="hero">
        <div className="moonwrap"><Moon frac={mi.frac} seed={9} /></div>
        <div className="lead">
          <div className="tonight">Tonight, a <em>{mi.name}</em> · {mi.lit}% lit</div>
          <h1>Gather your <em>people.</em></h1>
          <p>Launches, retreats, committee meetings, birthdays, hen weekends. Public events anyone can find, private ones only your guests can see. One beautiful link for RSVPs, approvals, check-in and who's bringing what.</p>
          <div className="row"><Link className="btn gold" href="/create">Plan something</Link><Link className="btn" href="/host">Your guest lists</Link></div>
        </div>
      </section>

      <section className="sec">
        <div className="sec-h"><h2>What's on in <em>Lagos</em></h2><span className="dim small">Public · anyone can join</span></div>
        <nav className="catchips" aria-label="Filter by category">
          <Link href="/" scroll={false} aria-current={!category ? "page" : undefined} className={!category ? "on" : ""}>✨ All</Link>
          {CATEGORIES.map((c) => (
            <Link key={c.key} href={`/?cat=${c.key}`} scroll={false} aria-current={category === c.key ? "page" : undefined} className={category === c.key ? "on" : ""}>{c.emoji} {c.label}</Link>
          ))}
        </nav>
        {events.length ? (
          <div className="carousel">
            {events.map((ev) => (
              <div key={ev.id}>
                <Poster ev={ev} size="card" href={`/e/${ev.slug}`} />
                <div className="meta-under"><span>{priceFrom(ev.tiers, ev.cur)}</span><span>{untilLabel(ev.start)}</span></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty"><h3>{current ? `No ${current.label.toLowerCase()} events yet` : "Nothing listed yet"}</h3><p style={{ margin: 0 }}>Be the first: make your event public and it appears here.</p><Link className="btn gold" href="/create">Plan something</Link></div>
        )}
      </section>

      <footer className="foot">
        <div>Moona is a product of <b>Sports DNA Ltd</b>, Lagos.</div>
        <div className="row" style={{ gap: 14 }}><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/refunds">Refunds</Link><a href="mailto:hello@moona.ng">hello@moona.ng</a></div>
      </footer>
    </>
  );
}
