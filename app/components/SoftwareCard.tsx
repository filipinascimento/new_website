import { ArrowUpRight } from "lucide-react";
import type { SoftwareRecord } from "../lib/types";
import { SoftwareIcon } from "./SoftwareIcon";

export function SoftwareCard({ software }: { software: SoftwareRecord }) {
  return (
    <article className="software-card">
      <div className="software-card__heading">
        <SoftwareIcon slug={software.slug} />
        <h3>{software.title}</h3>
      </div>
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
