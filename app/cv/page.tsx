import type { Metadata } from "next";
import contentJson from "@/data/content.json";
import { LockKeyhole } from "lucide-react";
import { PrintButton } from "../components/PrintButton";
import type { ContentRecord } from "../lib/types";

export const metadata: Metadata = {
  title: "Curriculum vitae",
  description: "Public web curriculum vitae for Filipi Nascimento Silva.",
};

export default function CvPage() {
  const cv = contentJson.cv[0] as ContentRecord & { subtitle: string; updated: string };
  const updated = new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(cv.updated));
  return (
    <main id="main-content" className="cv-page">
      <header className="page-hero shell cv-hero">
        <div>
          <div className="eyebrow">{cv.subtitle}</div>
          <h1>{cv.title}</h1>
          <p>Last updated {updated}. Publications and public software metadata are maintained separately by the automated site pipeline.</p>
        </div>
        <PrintButton />
      </header>
      <aside className="privacy-note shell">
        <LockKeyhole size={18} aria-hidden="true" />
        <span>This web edition intentionally omits personal email, phone, and postal details. Complete ATS-friendly Markdown, Word, and PDF versions are maintained locally.</span>
      </aside>
      <article className="cv-document shell" dangerouslySetInnerHTML={{ __html: cv.html }} />
    </main>
  );
}
