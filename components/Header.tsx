import Link from "next/link";
import { LOGO_INNER, LOGO_VIEWBOX } from "./logo-inner";
import Nav from "./Nav";
import ModeToggle from "./ModeToggle";

export default function Header() {
  return (
    <header className="head">
      <Link className="logo" href="/" aria-label="Moona home">
        <svg viewBox={LOGO_VIEWBOX} role="img" aria-label="moona" style={{ height: 40, width: "auto", display: "block", margin: "-6px 0 -6px -10px" }}
          dangerouslySetInnerHTML={{ __html: LOGO_INNER }} />
      </Link>
      <Nav />
      <ModeToggle />
    </header>
  );
}
