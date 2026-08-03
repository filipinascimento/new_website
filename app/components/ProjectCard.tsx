import { ArrowUpRight } from "lucide-react";
import type { ProjectRecord } from "../lib/types";

export function ProjectCard({ project }: { project: ProjectRecord }) {
  const assetRoot = process.env.GITHUB_PAGES === "true" ? "/new_website" : "";
  const accent = project.accent || "neutral";
  const figureImage = project.figure ? (
    <img
      src={`${assetRoot}${project.figure.src}`}
      alt={project.figure.alt}
      loading="lazy"
      style={{
        objectFit: project.figure.fit || "contain",
        objectPosition: project.figure.position || "center",
      }}
    />
  ) : null;
  return (
    <article className={`project-card project-card--${accent}`} id={project.slug}>
      {project.figure && project.figure.sourceUrl ? (
        <a
          className="project-card__figure"
          href={project.figure.sourceUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`View figure source for ${project.title}`}
        >
          {figureImage}
        </a>
      ) : project.figure ? (
        <div className="project-card__figure">{figureImage}</div>
      ) : null}
      <div className="project-card__content">
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
      </div>
    </article>
  );
}
