import { ArrowUpRight } from "lucide-react";

const profiles = [
  ["GitHub", "https://github.com/filipinascimento"],
  ["Google Scholar", "https://scholar.google.com/citations?user=fhWJEysAAAAJ"],
  ["ORCID", "https://orcid.org/0000-0002-9151-6517"],
  ["OpenAlex", "https://openalex.org/A5025683130"],
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell site-footer__grid">
        <div>
          <div className="site-footer__name">Filipi Nascimento Silva</div>
          <p>Research on networks, scientific change, and usable computational tools.</p>
        </div>
        <div className="site-footer__position">
          <span>Research Assistant Professor · Northwestern University</span>
        </div>
        <div className="site-footer__links">
          {profiles.map(([label, url]) => (
            <a href={url} key={url} target="_blank" rel="noreferrer">
              {label}<ArrowUpRight size={13} aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
      <div className="shell site-footer__base">
        <span>© {new Date().getFullYear()} Filipi Nascimento Silva</span>
      </div>
    </footer>
  );
}
