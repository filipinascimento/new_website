import type { Metadata } from "next";
import contentJson from "@/data/content.json";
import scholarProfile from "@/data/scholar/profile.json";
import { PdfButton } from "../components/PdfButton";
import type { ContentRecord } from "../lib/types";

export const metadata: Metadata = {
  title: "Curriculum vitae",
  description: "Public web curriculum vitae for Filipi Nascimento Silva.",
};

export default function CvPage() {
  const cv = contentJson.cv[0] as ContentRecord & { updated: string };
  const profile = contentJson.site[0] as ContentRecord & {
    role: string;
    institution: string;
    github: string;
    scholar: string;
    orcid: string;
    openalex: string;
  };
  const updated = new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(cv.updated));
  const profileLinks = [
    { label: "Website", url: "https://filipinascimento.github.io" },
    { label: "GitHub", url: profile.github },
    { label: "Google Scholar", url: profile.scholar },
    { label: "ORCID", url: profile.orcid },
    { label: "OpenAlex", url: profile.openalex },
  ];
  const metrics = [
    {
      value: scholarProfile.publicationsDisplay,
      label: "Publications",
      url: profile.scholar,
    },
    {
      value: scholarProfile.citations.toLocaleString("en-US"),
      label: "Citations",
      url: profile.scholar,
    },
    {
      value: scholarProfile.hIndex.toLocaleString("en-US"),
      label: "h-index",
      url: profile.scholar,
    },
  ];
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
          <PdfButton />
        </div>
      </header>
      <nav className="cv-profile-links shell" aria-label="Professional profiles">
        {profileLinks.map((link) => (
          <a key={link.label} href={link.url} target="_blank" rel="noreferrer">
            {link.label}
          </a>
        ))}
      </nav>
      <section className="cv-metrics shell" aria-label="Scholarly metrics">
        {metrics.map((metric) => (
          <a key={metric.label} href={metric.url} target="_blank" rel="noreferrer">
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </a>
        ))}
        <p>Google Scholar profile</p>
      </section>
      <article className="cv-document shell" dangerouslySetInnerHTML={{ __html: cv.html }} />
    </main>
  );
}
