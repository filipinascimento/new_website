import type { Metadata } from "next";
import openAlexProfile from "@/data/openalex/profile.json";
import openAlexWorks from "@/data/openalex/works.json";
import publicationFigures from "@/data/publication-figures.json";
import scholarProfile from "@/data/scholar/profile.json";
import { PublicationExplorer } from "../components/PublicationExplorer";
import type { Publication } from "../lib/types";

export const metadata: Metadata = {
  title: "Publications",
  description: "Journal articles, conference papers, book chapters, and preprints by Filipi Nascimento Silva.",
};

export default function PublicationsPage() {
  const date = new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date(openAlexProfile.fetchedAt));
  const assetRoot = process.env.GITHUB_PAGES === "true" ? "/new_website" : "";
  const figureByTitle = new Map(
    publicationFigures.figures.map((figure) => [figure.normalizedTitle, figure]),
  );
  const works = (openAlexWorks.works as Publication[]).map((work) => ({
    ...work,
    figure: figureByTitle.get(work.normalizedTitle),
  }));
  return (
    <main id="main-content">
      <header className="page-hero shell page-hero--publications">
        <div>
          <div className="eyebrow">Scholarly record</div>
          <h1>Publications</h1>
          <p>Journal articles, conference papers, book chapters, and preprints. Citation and h-index metrics are from Google Scholar.</p>
        </div>
        <div className="metric-card-grid">
          <div><strong>{scholarProfile.publicationsDisplay}</strong><span>Publications</span></div>
          <div><strong>{scholarProfile.citations.toLocaleString()}</strong><span>Google Scholar citations</span></div>
          <div><strong>{scholarProfile.hIndex}</strong><span>Google Scholar h-index</span></div>
        </div>
      </header>
      <section className="section shell section--first publication-section">
        <div className="section-label-row">
          <h2>Publication list</h2>
          <span>Last updated {date}</span>
        </div>
        <PublicationExplorer works={works} assetRoot={assetRoot} />
      </section>
    </main>
  );
}
