import type { Metadata } from "next";
import openAlexProfile from "@/data/openalex/profile.json";
import openAlexWorks from "@/data/openalex/works.json";
import scholarProfile from "@/data/scholar/profile.json";
import { ArrowUpRight, BookOpen, Database } from "lucide-react";
import { PublicationExplorer } from "../components/PublicationExplorer";
import type { Publication } from "../lib/types";

export const metadata: Metadata = {
  title: "Publications",
  description: "An audited publication record for Filipi Nascimento Silva, populated from OpenAlex.",
};

export default function PublicationsPage() {
  const date = new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date(openAlexProfile.fetchedAt));
  return (
    <main id="main-content">
      <header className="page-hero shell page-hero--publications">
        <div>
          <div className="eyebrow">Scholarly record</div>
          <h1>Publications</h1>
          <p>An audited publication list populated from linked OpenAlex profiles and checked against Google Scholar, ORCID, arXiv, and publisher records. Citation and h-index metrics are from Google Scholar.</p>
        </div>
        <div className="metric-card-grid">
          <div><strong>{scholarProfile.publications.toLocaleString()}</strong><span>Distinct publications</span></div>
          <div><strong>{scholarProfile.citations.toLocaleString()}</strong><span>Google Scholar citations</span></div>
          <div><strong>{scholarProfile.hIndex}</strong><span>Google Scholar h-index</span></div>
        </div>
      </header>
      <section className="source-note shell">
        <Database size={18} aria-hidden="true" />
        <div>
          <strong>OpenAlex pipeline · synced {date}</strong>
          <p>The build imports only the 64 verified publications in the local audit, consolidating preprint and conference versions and excluding abstracts, datasets, theses, teaching materials, malformed records, and unrelated author matches.</p>
        </div>
        <div className="source-note__links">
          <a href="https://openalex.org/A5025683130" target="_blank" rel="noreferrer">OpenAlex<ArrowUpRight size={12} /></a>
          <a href="https://scholar.google.com/citations?user=fhWJEysAAAAJ" target="_blank" rel="noreferrer">Google Scholar<ArrowUpRight size={12} /></a>
          <a href="https://arxiv.org/search/?query=Filipi+Nascimento+Silva&searchtype=author" target="_blank" rel="noreferrer">arXiv<ArrowUpRight size={12} /></a>
        </div>
      </section>
      <section className="section shell section--first publication-section">
        <div className="section-label-row">
          <h2><BookOpen size={20} aria-hidden="true" /> Publication list</h2>
          <span>Search and filter the audited collection</span>
        </div>
        <PublicationExplorer works={openAlexWorks.works as Publication[]} />
      </section>
    </main>
  );
}
