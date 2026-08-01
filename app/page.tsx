import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, Code2, Network, Sparkles } from "lucide-react";
import contentJson from "@/data/content.json";
import githubJson from "@/data/github/repos.json";
import openAlexJson from "@/data/openalex/works.json";
import { HeliosPreview } from "./components/HeliosPreview";
import { ProjectCard } from "./components/ProjectCard";
import { SectionHeading } from "./components/SectionHeading";
import { SoftwareCard } from "./components/SoftwareCard";
import type { ContentRecord, GitHubRepo, ProjectRecord, Publication, SoftwareRecord, TeachingRecord } from "./lib/types";

export const metadata: Metadata = {
  title: { absolute: "Filipi Nascimento Silva · Network science, AI, and visualization" },
};

type ProfileRecord = ContentRecord & {
  eyebrow: string;
  role: string;
  institution: string;
  location: string;
  orcid: string;
  scholar: string;
  github: string;
  openalex: string;
};

function authors(authorsList: Publication["authors"]) {
  const names = authorsList.map((author) => author.name);
  return names.length <= 6 ? names.join(", ") : `${names.slice(0, 5).join(", ")}, et al.`;
}

export default function Home() {
  const basePath = process.env.GITHUB_PAGES === "true" ? "/new_website" : "";
  const profile = contentJson.site[0] as ProfileRecord;
  const projects = (contentJson.projects as ProjectRecord[]).filter((project) => project.era === "current" && project.featured).slice(0, 4);
  const software = (contentJson.software as SoftwareRecord[]).filter((item) => item.featured).slice(0, 3);
  const teaching = contentJson.teaching as TeachingRecord[];
  const works = (openAlexJson.works as Publication[]).slice(0, 5);
  const repos = new Map((githubJson.featured as GitHubRepo[]).map((repo) => [repo.name, repo]));
  const intro = profile.markdown.split(/\n\s*\n/)[0];

  return (
    <main id="main-content">
      <section className="hero shell">
        <div className="hero__copy">
          <div className="hero__identity">
            <Image src={`${basePath}/profile.jpg`} alt="Portrait of Filipi Nascimento Silva" width={104} height={104} priority />
            <div>
              <div className="eyebrow">{profile.eyebrow}</div>
              <div className="hero__name">Filipi Nascimento Silva</div>
            </div>
          </div>
          <h1>Networks, AI, and visual systems for understanding science.</h1>
          <p className="hero__lead">{intro}</p>
          <div className="position-card">
            <span className="position-card__icon"><Network size={18} aria-hidden="true" /></span>
            <span><strong>{profile.role}</strong><br />{profile.institution}</span>
          </div>
          <div className="hero__actions">
            <Link className="button button--primary" href="/projects">Explore current work<ArrowRight size={16} aria-hidden="true" /></Link>
            <Link className="button button--secondary" href="/publications">Browse publications</Link>
          </div>
          <div className="profile-links" aria-label="Research profiles">
            <a href={profile.scholar} target="_blank" rel="noreferrer">Google Scholar<ArrowUpRight size={12} aria-hidden="true" /></a>
            <a href={profile.orcid} target="_blank" rel="noreferrer">ORCID<ArrowUpRight size={12} aria-hidden="true" /></a>
            <a href={profile.github} target="_blank" rel="noreferrer">GitHub<ArrowUpRight size={12} aria-hidden="true" /></a>
          </div>
        </div>
        <div className="hero__visual">
          <HeliosPreview />
          <div className="hero__figcaption">
            <span>Research map</span>
            <span>methods · domains · tools · outcomes</span>
          </div>
        </div>
      </section>

      <section className="signal-strip" aria-label="Highlights">
        <div className="shell signal-strip__inner">
          <div><strong>50+</strong><span>scholarly works</span></div>
          <div><strong>1M+</strong><span>nodes visualized with Helios</span></div>
          <div><strong>20 yrs</strong><span>building network methods</span></div>
          <div><strong>Open</strong><span>software, data, and teaching</span></div>
        </div>
      </section>

      <section className="section shell">
        <SectionHeading
          eyebrow="Current research"
          title="From scientific evidence to new capabilities"
          description="Active projects are described at a deliberate overview level while the underlying work is still developing."
          link={{ label: "All projects", href: "/projects" }}
        />
        <div className="project-grid project-grid--home">
          {projects.map((project) => <ProjectCard project={project} key={project.slug} />)}
        </div>
      </section>

      <section className="section section--tint">
        <div className="shell">
          <SectionHeading
            eyebrow="Latest record"
            title="Recent publications"
            description="Automatically reconciled from the primary and split OpenAlex author records, with arXiv cross-checks for missing links."
            link={{ label: "Full publication record", href: "/publications" }}
          />
          <ol className="recent-publications">
            {works.map((work, index) => (
              <li key={work.id}>
                <span className="recent-publications__index">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3><a href={work.url} target="_blank" rel="noreferrer">{work.title}</a></h3>
                  <p>{authors(work.authors)}</p>
                  <div className="recent-publications__meta">
                    <span>{work.year}</span><span>{work.source || work.type}</span>
                    {work.openAccess && <span className="open-access">Open access</span>}
                  </div>
                </div>
                <a className="circle-link" href={work.url} target="_blank" rel="noreferrer" aria-label={`Open ${work.title}`}><ArrowUpRight size={16} /></a>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section shell">
        <SectionHeading
          eyebrow="Selected software"
          title="Research tools built to be used"
          description="A curated set of maintained or enduring projects—not a mirror of every repository."
          link={{ label: "Software portfolio", href: "/software" }}
        />
        <div className="software-grid software-grid--home">
          {software.map((item) => <SoftwareCard software={item} repo={repos.get(item.repo)} key={item.slug} />)}
        </div>
      </section>

      <section className="section section--ink">
        <div className="shell teaching-preview">
          <div className="teaching-preview__intro">
            <div className="eyebrow"><BookOpen size={14} aria-hidden="true" /> Teaching</div>
            <h2>Making technical ideas usable.</h2>
            <p>Course materials connect foundations to hands-on work in Python, JavaScript, machine learning, and interactive visualization.</p>
            <Link className="button button--light" href="/teaching">Teaching and mentorship<ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <div className="teaching-preview__courses">
            {teaching.map((course) => (
              <a href={course.url} target="_blank" rel="noreferrer" key={course.slug}>
                <span className="teaching-preview__icon">{course.title.includes("Visualization") ? <Code2 size={20} /> : <Sparkles size={20} />}</span>
                <span><strong>{course.title}</strong><small>{course.term} · {course.format}</small></span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
