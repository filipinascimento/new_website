import { ArrowUpRight } from "lucide-react";
import type { ProjectRecord } from "../lib/types";

export function ProjectCard({ project }: { project: ProjectRecord }) {
  return (
    <article className="project-card">
      <div className="project-card__topline">
        <span>{project.status}</span>
        <span>{project.year}</span>
      </div>
      <h3>{project.title}</h3>
      <div className="project-card__body" dangerouslySetInnerHTML={{ __html: project.html }} />
      {project.topics && (
        <div className="tag-list" aria-label="Topics">
          {project.topics.map((topic) => <span key={topic}>{topic}</span>)}
        </div>
      )}
      {project.links && (
        <div className="project-card__links">
          {project.links.map((link) => (
            <a href={link.url} key={link.url} target="_blank" rel="noreferrer">
              {link.label}<ArrowUpRight size={13} aria-hidden="true" />
            </a>
          ))}
        </div>
      )}
    </article>
  );
}
