import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const config = JSON.parse(
  await readFile(path.join(root, "config/profile-sources.json"), "utf8"),
);
const publicationAudit = JSON.parse(
  await readFile(path.join(root, "config/scholar-publication-audit.json"), "utf8"),
);
const outputDir = path.join(root, "data/openalex");
const generatedContentDir = path.join(root, "content/publications");
const baseUrl = "https://api.openalex.org";
const scholarlyTypes = new Set([
  "article",
  "conference-paper",
  "book-chapter",
  "report",
  "editorial",
  "letter",
]);
const typePreference = new Map([
  ["article", 90],
  ["conference-paper", 85],
  ["book-chapter", 80],
  ["editorial", 75],
  ["letter", 70],
  ["report", 60],
  ["preprint", 50],
  ["dissertation", 40],
  ["dataset", 20],
  ["software", 10],
]);

function apiUrl(endpoint, params = {}) {
  const url = new URL(endpoint, baseUrl);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  if (process.env.OPENALEX_MAILTO) {
    url.searchParams.set("mailto", process.env.OPENALEX_MAILTO);
  }
  return url;
}

async function getJson(url, attempt = 0) {
  const response = await fetch(url, {
    headers: { "User-Agent": "filipinascimento-website/1.0" },
  });
  if (response.status === 429 && attempt < 5) {
    const retryAfter = Number(response.headers.get("retry-after") || 1);
    const delay = Math.min(10_000, Math.max(1_000, retryAfter * 1_000 * 2 ** attempt));
    await new Promise((resolve) => setTimeout(resolve, delay));
    return getJson(url, attempt + 1);
  }
  if (!response.ok) {
    throw new Error(`OpenAlex request failed (${response.status}): ${url}`);
  }
  return response.json();
}

async function getAuthor(authorId) {
  return getJson(apiUrl(`/authors/${authorId}`));
}

async function getWorks(authorId) {
  const works = [];
  let cursor = "*";
  do {
    const payload = await getJson(
      apiUrl("/works", {
        filter: `author.id:${authorId}`,
        "per-page": 200,
        cursor,
        sort: "publication_date:desc",
      }),
    );
    works.push(...payload.results);
    cursor = payload.meta.next_cursor;
  } while (cursor);
  return works;
}

function cleanText(value = "") {
  return String(value)
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitle(title = "") {
  return cleanText(title)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function preferredUrl(work) {
  const locations = [work.primary_location, ...(work.locations || [])].filter(Boolean);
  return (
    work.best_oa_location?.landing_page_url ||
    work.best_oa_location?.pdf_url ||
    locations.find((location) => location.is_oa)?.landing_page_url ||
    work.doi ||
    work.id
  );
}

function workScore(work) {
  const typeScore = typePreference.get(work.type) ?? 0;
  const sourceScore = work.primary_location?.source?.display_name ? 8 : 0;
  const doiScore = work.doi && !work.doi.includes("arxiv") ? 6 : work.doi ? 2 : 0;
  return typeScore + sourceScore + doiScore;
}

function compactWork(work) {
  const authors = (work.authorships || []).map((authorship) => ({
    name: authorship.author?.display_name || "Unknown author",
    id: authorship.author?.id || null,
  }));
  return {
    id: work.id,
    title: cleanText(work.title),
    normalizedTitle: normalizeTitle(work.title),
    publicationDate: work.publication_date || null,
    year: work.publication_year || null,
    type: work.type || "other",
    source: work.primary_location?.source?.display_name || "",
    doi: work.doi || null,
    url: preferredUrl(work),
    citedByCount: work.cited_by_count || 0,
    openAccess: Boolean(work.open_access?.is_oa),
    openAccessStatus: work.open_access?.oa_status || null,
    authors,
    topics: (work.topics || []).slice(0, 3).map((topic) => topic.display_name),
  };
}

function mergeWorks(rawWorks) {
  const groups = new Map();
  for (const rawWork of rawWorks) {
    const work = compactWork(rawWork);
    if (!work.normalizedTitle) continue;
    const group = groups.get(work.normalizedTitle) || [];
    group.push(work);
    groups.set(work.normalizedTitle, group);
  }

  return [...groups.values()]
    .map((versions) => {
      versions.sort((a, b) => workScore(b) - workScore(a));
      const chosen = versions[0];
      const urls = [...new Set(versions.map((version) => version.url).filter(Boolean))];
      const openAlexIds = [...new Set(versions.map((version) => version.id))];
      const citedByCount = Math.max(...versions.map((version) => version.citedByCount || 0));
      return {
        ...chosen,
        citedByCount,
        openAlexIds,
        alternateUrls: urls.filter((url) => url !== chosen.url),
      };
    })
    .filter((work) => scholarlyTypes.has(work.type))
    .sort((a, b) => {
      const dateOrder = String(b.publicationDate || b.year || "").localeCompare(
        String(a.publicationDate || a.year || ""),
      );
      return dateOrder || a.title.localeCompare(b.title);
    });
}

function curatePublishedWorks(works, audit) {
  const canonicalTitles = [
    ...audit.publishedProfileTitles,
    ...audit.additionalPublishedTitles,
  ];
  const canonicalByTitle = new Map(
    canonicalTitles.map((title) => [normalizeTitle(title), title]),
  );
  for (const [alias, canonical] of Object.entries(audit.openAlexTitleAliases || {})) {
    canonicalByTitle.set(normalizeTitle(alias), canonical);
  }

  const groups = new Map();
  for (const work of works) {
    const canonicalTitle = canonicalByTitle.get(normalizeTitle(work.title));
    if (!canonicalTitle) continue;
    const key = normalizeTitle(canonicalTitle);
    const group = groups.get(key) || [];
    group.push(work);
    groups.set(key, group);
  }

  const missing = canonicalTitles.filter((title) => !groups.has(normalizeTitle(title)));
  if (missing.length > 0) {
    throw new Error(`Audited publications missing from OpenAlex: ${missing.join("; ")}`);
  }

  return [...groups.entries()]
    .map(([canonicalKey, versions]) => {
      versions.sort((a, b) => workScore(b) - workScore(a));
      const chosen = versions[0];
      const canonicalTitle = canonicalByTitle.get(canonicalKey) || chosen.title;
      return {
        ...chosen,
        title: canonicalTitle,
        normalizedTitle: canonicalKey,
        openAlexIds: [...new Set(versions.flatMap((version) => version.openAlexIds || [version.id]))],
        alternateUrls: [
          ...new Set(
            versions.flatMap((version) => [version.url, ...(version.alternateUrls || [])]).filter(Boolean),
          ),
        ].filter((url) => url !== chosen.url),
      };
    })
    .sort((a, b) => {
      const dateOrder = String(b.publicationDate || b.year || "").localeCompare(
        String(a.publicationDate || a.year || ""),
      );
      return dateOrder || a.title.localeCompare(b.title);
    });
}

function escapeYaml(value) {
  return JSON.stringify(String(value));
}

function formatAuthors(authors) {
  const names = authors.map((author) => author.name);
  if (names.length <= 8) return names.join(", ");
  return `${names.slice(0, 7).join(", ")}, et al.`;
}

function publicationsMarkdown(profile, works, fetchedAt) {
  const lines = [
    "---",
    "title: Publications",
    `description: ${escapeYaml("An audited publication record populated from Filipi Nascimento Silva's linked OpenAlex author profiles.")}`,
    `generatedAt: ${escapeYaml(fetchedAt)}`,
    `source: ${escapeYaml("OpenAlex")}`,
    "---",
    "",
    "This file is generated by `npm run data:openalex`. Edit the author identifiers in `config/profile-sources.json`, not this file.",
    "",
    `${profile.mergedScholarlyWorksCount} distinct publications after title, version, and document-type review.`,
    "",
  ];
  let currentYear = null;
  for (const work of works) {
    if (work.year !== currentYear) {
      currentYear = work.year;
      lines.push(`## ${currentYear || "Undated"}`, "");
    }
    const venue = work.source ? ` *${work.source}*.` : "";
    const doi = work.doi ? ` [DOI](${work.doi})` : ` [OpenAlex](${work.url})`;
    lines.push(
      `- **${work.title}**`,
      `  ${formatAuthors(work.authors)}.${venue}${doi}`,
      "",
    );
  }
  return `${lines.join("\n")}\n`;
}

const authorIds = config.openalex.authorIds;
const authorProfiles = [];
const worksByAuthor = [];
for (const authorId of authorIds) {
  authorProfiles.push(await getAuthor(authorId));
  worksByAuthor.push(await getWorks(authorId));
}
const manuallyLinkedWorks = [];
for (const doi of config.openalex.manualWorkDois || []) {
  manuallyLinkedWorks.push(await getJson(apiUrl(`/works/https://doi.org/${doi}`)));
}
const primary = authorProfiles.find(
  (author) => author.id.endsWith(config.openalex.primaryAuthorId),
);
if (!primary) throw new Error("Primary OpenAlex author profile was not found.");

const fetchedAt = new Date().toISOString();
const works = curatePublishedWorks(
  mergeWorks([...worksByAuthor.flat(), ...manuallyLinkedWorks]),
  publicationAudit,
);
const profile = {
  id: primary.id,
  displayName: primary.display_name,
  orcid: primary.orcid,
  worksCount: primary.works_count,
  mergedScholarlyWorksCount: works.length,
  citedByCount: primary.cited_by_count,
  hIndex: primary.summary_stats?.h_index || null,
  i10Index: primary.summary_stats?.i10_index || null,
  authorIds,
  fetchedAt,
};

await mkdir(outputDir, { recursive: true });
await mkdir(generatedContentDir, { recursive: true });
await writeFile(path.join(outputDir, "profile.json"), `${JSON.stringify(profile, null, 2)}\n`);
await writeFile(
  path.join(outputDir, "works.json"),
  `${JSON.stringify({ fetchedAt, works }, null, 2)}\n`,
);
await writeFile(
  path.join(generatedContentDir, "generated.md"),
  publicationsMarkdown(profile, works, fetchedAt),
);

console.log(
  `OpenAlex: ${authorIds.length} author records -> ${works.length} deduplicated scholarly works.`,
);
