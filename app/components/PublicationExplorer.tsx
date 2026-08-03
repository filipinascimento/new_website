"use client";

import { ArrowUpRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Publication } from "../lib/types";

const filters = [
  ["all", "All"],
  ["article", "Articles"],
  ["book-chapter", "Chapters"],
  ["editorial", "Editorials"],
  ["preprint", "Preprints"],
] as const;

function authorLine(authors: Publication["authors"]) {
  const names = authors.map((author) => author.name);
  return names.length <= 8 ? names.join(", ") : `${names.slice(0, 7).join(", ")}, et al.`;
}

export function PublicationExplorer({ works, assetRoot = "" }: { works: Publication[]; assetRoot?: string }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [visible, setVisible] = useState(24);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return works.filter((work) => {
      if (type !== "all" && work.type !== type) return false;
      if (!needle) return true;
      const haystack = [
        work.title,
        work.source,
        work.year,
        ...work.authors.map((author) => author.name),
        ...work.topics,
      ].join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }, [query, type, works]);

  const shown = filtered.slice(0, visible);

  return (
    <div className="publication-explorer">
      <div className="publication-controls">
        <label className="publication-search">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Search publications</span>
          <input
            type="search"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setVisible(24); }}
            placeholder="Search titles, authors, venues, or topics"
          />
        </label>
        <div className="publication-filters" aria-label="Filter by publication type">
          {filters.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={type === value ? "is-active" : ""}
              onClick={() => { setType(value); setVisible(24); }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="publication-result-count" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "record" : "records"}
      </div>
      <ol className="publication-list">
        {shown.map((work) => (
          <li key={work.id}>
            <div className="publication-list__year">{work.year || "Not dated"}</div>
            {work.figure && (
              <a
                className="publication-list__figure"
                href={work.figure.sourceUrl || work.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`View figure source for ${work.title}`}
              >
                <img
                  src={`${assetRoot}${work.figure.src}`}
                  alt={work.figure.alt}
                  loading="lazy"
                  style={{
                    objectFit: work.figure.fit || "contain",
                    objectPosition: work.figure.position || "center",
                  }}
                />
              </a>
            )}
            <div className="publication-list__content">
              <h3><a href={work.url} target="_blank" rel="noreferrer">{work.title}</a></h3>
              <p className="publication-list__authors">{authorLine(work.authors)}</p>
              <div className="publication-list__meta">
                <span>{work.publicationStatus === "preprint" ? "Preprint" : (work.source || work.type.replace("-", " "))}</span>
                {work.publicationStatus === "published" && (
                  <span className="publication-type">{work.type.replace("-", " ")}</span>
                )}
                {work.openAccess && <span className="open-access">Open access</span>}
                <a href={work.url} target="_blank" rel="noreferrer" aria-label={`Open ${work.title}`}>
                  {work.publicationStatus === "preprint" ? "View preprint" : "Published version"}<ArrowUpRight size={12} aria-hidden="true" />
                </a>
                {work.publicationStatus === "published" && work.preprintUrls?.[0] && (
                  <a href={work.preprintUrls[0]} target="_blank" rel="noreferrer" aria-label={`Open preprint for ${work.title}`}>
                    Preprint<ArrowUpRight size={12} aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
      {shown.length < filtered.length && (
        <button className="load-more" type="button" onClick={() => setVisible((count) => count + 24)}>
          Show more publications
        </button>
      )}
      {filtered.length === 0 && (
        <div className="empty-state">No publications match this search.</div>
      )}
    </div>
  );
}
