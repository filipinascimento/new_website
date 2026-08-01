import type { Metadata } from "next";
import contentJson from "@/data/content.json";
import { PrintButton } from "../components/PrintButton";
import type { ContentRecord } from "../lib/types";

export const metadata: Metadata = {
  title: "Curriculum vitae",
  description: "Public web curriculum vitae for Filipi Nascimento Silva.",
};

export default function CvPage() {
  const cv = contentJson.cv[0] as ContentRecord & { subtitle: string; updated: string };
  const profile = contentJson.site[0] as ContentRecord & { role: string; institution: string };
  const updated = new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(cv.updated));
  return (
    <main id="main-content" className="cv-page">
      <header className="cv-hero shell">
        <div className="cv-hero__identity">
          <p className="cv-kicker">Curriculum vitae</p>
          <h1>{profile.title}</h1>
          <p className="cv-hero__role">
            <strong>{profile.role}</strong>
            <span>{profile.institution}</span>
          </p>
        </div>
        <div className="cv-hero__actions">
          <p>Updated {updated}</p>
          <PrintButton />
        </div>
      </header>
      <aside className="privacy-note shell">
        <strong>Public edition</strong>
        <span>{cv.subtitle}. The complete ATS-readable Markdown, Word, and PDF versions are maintained locally.</span>
      </aside>
      <article className="cv-document shell" dangerouslySetInnerHTML={{ __html: cv.html }} />
    </main>
  );
}
