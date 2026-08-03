import type { Metadata } from "next";
import contentJson from "@/data/content.json";
import { ProjectCard } from "../components/ProjectCard";
import type { ProjectRecord } from "../lib/types";

export const metadata: Metadata = {
  title: "Projects",
  description: "Current and selected past research projects by Filipi Nascimento Silva.",
};

export default function ProjectsPage() {
  const projects = contentJson.projects as ProjectRecord[];
  const current = projects.filter((project) => project.era === "current");
  const past = projects.filter((project) => project.era === "past");

  return (
    <main id="main-content">
      <header className="page-hero shell">
        <div className="eyebrow">Projects</div>
        <h1>Research projects</h1>
        <p>Recent work is intentionally summarized at a high level. Earlier projects include more context and links to the publications, tools, and public resources behind them.</p>
      </header>
      <section className="section shell section--first">
        <div className="section-label-row">
          <h2>Current directions</h2>
          <span>{current.length} active themes</span>
        </div>
        <div className="project-grid">
          {current.map((project) => <ProjectCard project={project} key={project.slug} />)}
        </div>
      </section>
      <section className="section section--tint">
        <div className="shell">
          <div className="section-label-row">
            <h2>Interdisciplinary and earlier work</h2>
            <span>Methods, applications, and research infrastructure</span>
          </div>
          <div className="project-grid">
            {past.map((project) => <ProjectCard project={project} key={project.slug} />)}
          </div>
        </div>
      </section>
    </main>
  );
}
