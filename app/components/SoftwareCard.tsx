import { ArrowUpRight } from "lucide-react";
import type { GitHubRepo, SoftwareRecord } from "../lib/types";

export function SoftwareCard({ software, repo }: { software: SoftwareRecord; repo?: GitHubRepo }) {
  return (
    <article className="software-card">
      <div className="software-card__topline">
        <span className="software-card__status">{software.status}</span>
        {repo && (
          <span className="software-card__stats" aria-label={`${repo.stars} GitHub stars and ${repo.forks} forks`}>
            {repo.stars} stars · {repo.forks} forks
          </span>
        )}
      </div>
      <h3>{software.title}</h3>
      <p className="software-card__tagline">{software.tagline}</p>
      <div className="software-card__body" dangerouslySetInnerHTML={{ __html: software.html }} />
      {software.technologies && (
        <div className="tag-list">
          {software.technologies.map((technology) => <span key={technology}>{technology}</span>)}
        </div>
      )}
      <div className="software-card__links">
        <a href={software.url} target="_blank" rel="noreferrer">
          Source<ArrowUpRight size={14} aria-hidden="true" />
        </a>
        {software.homepage && (
          <a href={software.homepage} target="_blank" rel="noreferrer">
            Visit project<ArrowUpRight size={14} aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  );
}
