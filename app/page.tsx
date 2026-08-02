import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import contentJson from "@/data/content.json";
import githubJson from "@/data/github/repos.json";
import openAlexJson from "@/data/openalex/works.json";
import { HeliosPreview } from "./components/HeliosPreview";
import type { ContentRecord, GitHubRepo, ProjectRecord, Publication, SoftwareRecord, TeachingRecord } from "./lib/types";

export const metadata: Metadata = {
  title: { absolute: "Filipi Nascimento Silva · Research and software" },
};

type ProfileRecord = ContentRecord & {
  headline: string;
  eyebrow: string;
  role: string;
  institution: string;
  institutionUrl: string;
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
  const projects = (contentJson.projects as ProjectRecord[])
    .filter((project) => project.era === "current" && project.featured)
    .slice(0, 4);
  const software = (contentJson.software as SoftwareRecord[]).filter((item) => item.featured).slice(0, 3);
  const teaching = contentJson.teaching as TeachingRecord[];
  const works = (openAlexJson.works as Publication[]).slice(0, 5);
  const repos = new Map((githubJson.featured as GitHubRepo[]).map((repo) => [repo.name, repo]));
  const introParagraphs = profile.markdown.split(/\n\s*\n/).filter(Boolean);

  return (
    <main id="main-content" className="home">
      <div className="home-layout shell">
        <aside className="profile-sidebar" aria-labelledby="profile-sidebar-name">
          <Image
            className="profile-sidebar__portrait"
            src={`${basePath}/profile.jpg`}
            alt="Portrait of Filipi Nascimento Silva"
            width={320}
            height={320}
            priority
          />
          <div className="profile-sidebar__identity">
            <h2 id="profile-sidebar-name">Filipi Nascimento Silva</h2>
            <p>{profile.role}</p>
          </div>
          <dl className="profile-sidebar__facts">
            <div>
              <dt>Affiliation</dt>
              <dd><a href={profile.institutionUrl} target="_blank" rel="noreferrer">Center for Science of Science &amp; Innovation</a></dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{profile.location}</dd>
            </div>
          </dl>
          <nav className="profile-sidebar__links" aria-label="Research profiles">
            <a href={profile.github} target="_blank" rel="noreferrer">GitHub<ArrowUpRight size={14} /></a>
            <a href={profile.scholar} target="_blank" rel="noreferrer">Google Scholar<ArrowUpRight size={14} /></a>
            <a href={profile.orcid} target="_blank" rel="noreferrer">ORCID<ArrowUpRight size={14} /></a>
            <a href={profile.openalex} target="_blank" rel="noreferrer">OpenAlex<ArrowUpRight size={14} /></a>
            <Link href="/cv">Curriculum vitae<ArrowRight size={14} /></Link>
          </nav>
        </aside>

        <div className="home-content">
          <section className="home-intro-grid" aria-labelledby="home-intro-title">
            <div className="home-intro">
              <p className="home-intro__role">{profile.role} · Northwestern University</p>
              <h1 id="home-intro-title">{profile.title}</h1>
              <p className="home-intro__research">Network science, science of science, artificial intelligence, and visual computing.</p>
              {introParagraphs.slice(0, 2).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              <div className="home-intro__actions">
                <Link className="text-link" href="/projects">Research projects<ArrowRight size={15} aria-hidden="true" /></Link>
                <Link className="text-link" href="/publications">Publications<ArrowRight size={15} aria-hidden="true" /></Link>
              </div>
            </div>
            <div className="home-helios">
              <div className="home-helios__heading">
                <h2>Helios Web</h2>
                <p>Interactive network and embedding visualization in the browser.</p>
              </div>
              <HeliosPreview />
            </div>
          </section>

          <section className="home-section" aria-labelledby="home-projects-title">
            <div className="home-section__heading">
              <h2 id="home-projects-title">Current research</h2>
              <Link className="text-link" href="/projects">All projects<ArrowRight size={15} /></Link>
            </div>
            <div className="home-project-list">
              {projects.map((project) => (
                <article key={project.slug}>
                  <div className="home-project-list__meta"><span>{project.status}</span><span>{project.year}</span></div>
                  <h3>{project.title}</h3>
                  <div className="home-project-list__body" dangerouslySetInnerHTML={{ __html: project.html }} />
                  {project.topics && <div className="home-project-list__topics">{project.topics.map((topic) => <span key={topic}>{topic}</span>)}</div>}
                </article>
              ))}
            </div>
          </section>

          <section className="home-section" aria-labelledby="home-publications-title">
            <div className="home-section__heading">
              <h2 id="home-publications-title">Recent publications</h2>
              <Link className="text-link" href="/publications">Full record<ArrowRight size={15} /></Link>
            </div>
            <ul className="recent-publications recent-publications--home">
              {works.map((work) => (
                <li key={work.id}>
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
            </ul>
          </section>

          <section className="home-section" aria-labelledby="home-software-title">
            <div className="home-section__heading">
              <h2 id="home-software-title">Selected software</h2>
              <Link className="text-link" href="/software">Software portfolio<ArrowRight size={15} /></Link>
            </div>
            <div className="home-software-list">
              {software.map((item) => {
                const repo = repos.get(item.repo);
                return (
                  <article key={item.slug}>
                    <div className="home-software-list__meta">
                      <span>{item.status}</span>
                      {repo && <span>{repo.stars} stars · {repo.forks} forks</span>}
                    </div>
                    <h3><a href={item.url} target="_blank" rel="noreferrer">{item.title}<ArrowUpRight size={14} /></a></h3>
                    <p>{item.tagline}</p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="home-section home-teaching" aria-labelledby="home-teaching-title">
            <div className="home-section__heading">
              <h2 id="home-teaching-title">Teaching</h2>
              <Link className="text-link" href="/teaching">Teaching archive<ArrowRight size={15} /></Link>
            </div>
            <div className="home-course-list">
              {teaching.map((course) => (
                <a href={course.url} target="_blank" rel="noreferrer" key={course.slug}>
                  <span><strong>{course.code ? `${course.code}: ` : ""}{course.title}</strong><small>{course.term} · {course.format}</small></span>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
