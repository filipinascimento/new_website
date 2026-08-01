import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

const navigation = [
  ["Projects", "/projects"],
  ["Publications", "/publications"],
  ["Software", "/software"],
  ["Teaching", "/teaching"],
  ["CV", "/cv"],
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner shell">
        <Link className="wordmark" href="/" aria-label="Filipi Nascimento Silva, home">
          <span className="wordmark__mark" aria-hidden="true">FN</span>
          <span className="wordmark__name">Filipi N. Silva</span>
        </Link>
        <nav className="site-nav" aria-label="Primary navigation">
          {navigation.map(([label, href]) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
