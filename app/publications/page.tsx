import type { Metadata } from "next";
import openAlexProfile from "@/data/openalex/profile.json";
import openAlexWorks from "@/data/openalex/works.json";
import { ArrowUpRight, Database, GitMerge } from "lucide-react";
import { PublicationExplorer } from "../components/PublicationExplorer";
import type { Publication } from "../lib/types";

export const metadata: Metadata = {
  title: "Publications",
  description: "A reconciled publication record for Filipi Nascimento Silva, refreshed from OpenAlex.",
};

export default function PublicationsPage() {
  const date = new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date(openAlexProfile.fetchedAt));
  return (
    <main id="main-content">
      <header className="page-hero shell page-hero--publications">
        <div>
          <div className="eyebrow">Scholarly record</div>
          <h1>Publications</h1>
          <p>A DOI- and title-deduplicated record assembled from OpenAlex, with targeted arXiv cross-checks for records that do not yet carry author identifiers.</p>
        </div>
        <div className="metric-card-grid">
          <div><strong>{openAlexProfile.mergedScholarlyWorksCount}</strong><span>reconciled records</span></div>
          <div><strong>{openAlexProfile.citedByCount.toLocaleString()}</strong><span>OpenAlex citations</span></div>
          <div><strong>{openAlexProfile.hIndex}</strong><span>OpenAlex h-index</span></div>
        </div>
      </header>
      <section className="source-note shell">
        <Database size={18} aria-hidden="true" />
        <div>
          <strong>Automated data pipeline · synced {date}</strong>
          <p>The profile currently resolves one primary and nine confirmed split OpenAlex author records. Counts remain source-specific; Google Scholar is linked as an independent cross-check.</p>
        </div>
        <div className="source-note__links">
          <a href="https://openalex.org/A5025683130" target="_blank" rel="noreferrer">OpenAlex<ArrowUpRight size={12} /></a>
          <a href="https://scholar.google.com/citations?user=fhWJEysAAAAJ" target="_blank" rel="noreferrer">Google Scholar<ArrowUpRight size={12} /></a>
          <a href="https://arxiv.org/search/?query=Filipi+Nascimento+Silva&searchtype=author" target="_blank" rel="noreferrer">arXiv<ArrowUpRight size={12} /></a>
        </div>
      </section>
      <section className="section shell section--first publication-section">
        <div className="section-label-row">
          <h2><GitMerge size={20} aria-hidden="true" /> Reconciled works</h2>
          <span>Search and filter the full generated collection</span>
        </div>
        <PublicationExplorer works={openAlexWorks.works as Publication[]} />
      </section>
    </main>
  );
}
