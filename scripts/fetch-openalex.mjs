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
  "preprint",
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

function readableRawAuthorName(value = "") {
  const rawName = cleanText(value);
  const parts = rawName.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length === 2 ? `${parts[1]} ${parts[0]}` : rawName;
}

function authorName(authorship = {}) {
  const displayName = cleanText(authorship.author?.display_name);
  const rawName = readableRawAuthorName(authorship.raw_author_name);
  const informationScore = (value) => value.replace(/[^\p{L}\p{N}]/gu, "").length;
  const hasInitial = (value) => value
    .split(/\s+/)
    .some((part) => part.replace(/[^\p{L}\p{N}]/gu, "").length === 1);
  return (
    informationScore(rawName) > informationScore(displayName) &&
    hasInitial(displayName) &&
    !hasInitial(rawName)
  )
    ? rawName
    : (displayName || rawName || "Unknown author");
}

function normalizeTitle(title = "") {
  return cleanText(title)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizePreprintUrl(value = "") {
  const raw = String(value).trim();
  if (!raw || raw.toLowerCase() === "null") return null;
  const arxivUrl = raw.match(/arxiv\.org\/(?:abs|pdf)\/([^?#]+)/i);
  const arxivDoi = raw.match(/10\.48550\/arxiv\.([^?#]+)/i);
  const identifier = (arxivUrl?.[1] || arxivDoi?.[1] || "")
    .replace(/\.pdf$/i, "")
    .replace(/v\d+$/i, "");
  if (identifier) return `https://arxiv.org/abs/${identifier}`;
  return raw.replace(/^http:\/\//i, "https://");
}

function preprintUrls(work) {
  const locations = [work.primary_location, ...(work.locations || [])].filter(Boolean);
  const candidates = [];
  if (work.type === "preprint") candidates.push(work.doi);
  for (const location of locations) {
    const source = location.source?.display_name || "";
    const urls = [location.landing_page_url, location.pdf_url].filter(Boolean);
    if (
      work.type === "preprint" ||
      /arxiv|biorxiv|medrxiv|preprint/i.test(source) ||
      urls.some((url) => /arxiv\.org|biorxiv\.org|medrxiv\.org/i.test(url))
    ) {
      candidates.push(...urls);
    }
  }
  return [...new Set(candidates.map(normalizePreprintUrl).filter(Boolean))];
}

function preferredUrl(work) {
  const locations = [work.primary_location, ...(work.locations || [])].filter(Boolean);
  if (work.type !== "preprint" && work.doi && !/10\.48550\/arxiv/i.test(work.doi)) {
    return work.doi;
  }
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
    name: authorName(authorship),
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
    preprintUrls: preprintUrls(work),
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
      const linkedPreprints = [...new Set(versions.flatMap((version) => version.preprintUrls || []))];
      return {
        ...chosen,
        citedByCount,
        openAlexIds,
        preprintUrls: linkedPreprints,
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
  const publishedTitles = [
    ...audit.publishedProfileTitles,
    ...audit.additionalPublishedTitles,
  ];
  const standalonePreprintTitles = audit.standalonePreprintTitles || [];
  const canonicalTitles = [...publishedTitles, ...standalonePreprintTitles];
  const publicationStatusByTitle = new Map([
    ...publishedTitles.map((title) => [normalizeTitle(title), "published"]),
    ...standalonePreprintTitles.map((title) => [normalizeTitle(title), "preprint"]),
  ]);
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
    throw new Error(`Audited publications or preprints missing from OpenAlex: ${missing.join("; ")}`);
  }

  return [...groups.entries()]
    .map(([canonicalKey, versions]) => {
      versions.sort((a, b) => workScore(b) - workScore(a));
      const chosen = versions[0];
      const canonicalTitle = canonicalByTitle.get(canonicalKey) || chosen.title;
      const linkedPreprints = [
        ...new Set(
          versions.flatMap((version) => [
            ...(version.preprintUrls || []),
            ...(version.type === "preprint" ? [version.url] : []),
          ])
            .concat(audit.manualPreprintUrls?.[canonicalTitle] || [])
            .map(normalizePreprintUrl)
            .filter(Boolean),
        ),
      ];
      return {
        ...chosen,
        title: canonicalTitle,
        normalizedTitle: canonicalKey,
        publicationStatus: publicationStatusByTitle.get(canonicalKey) || "published",
        url: publicationStatusByTitle.get(canonicalKey) === "preprint"
          ? (linkedPreprints[0] || chosen.url)
          : chosen.url,
        openAlexIds: [...new Set(versions.flatMap((version) => version.openAlexIds || [version.id]))],
        preprintUrls: linkedPreprints,
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
  const publicationLabel = `${Math.floor(profile.publishedWorksCount / 10) * 10}+`;
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
    `${publicationLabel} published works plus selected standalone preprints.`,
    "",
  ];
  let currentYear = null;
  for (const work of works) {
    if (work.year !== currentYear) {
      currentYear = work.year;
      lines.push(`## ${currentYear || "Undated"}`, "");
    }
    const venue = work.source ? ` *${work.source}*.` : "";
    const primaryLink = work.publicationStatus === "preprint"
      ? ` [Preprint](${work.url})`
      : (work.doi ? ` [DOI](${work.doi})` : ` [Publication](${work.url})`);
    const preprintLink = work.publicationStatus === "published" && work.preprintUrls?.[0]
      ? ` [Preprint](${work.preprintUrls[0]})`
      : "";
    lines.push(
      `- **${work.title}**`,
      `  ${formatAuthors(work.authors)}.${venue}${primaryLink}${preprintLink}`,
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
const rawAuthorWorks = worksByAuthor.flat();
const rawLinkedWorks = [...rawAuthorWorks, ...manuallyLinkedWorks];
const titleMergedScholarlyCandidates = mergeWorks(rawLinkedWorks);
const works = curatePublishedWorks(
  titleMergedScholarlyCandidates,
  publicationAudit,
);
const profile = {
  id: primary.id,
  displayName: primary.display_name,
  orcid: primary.orcid,
  worksCount: primary.works_count,
  rawUniqueWorksAcrossLinkedAuthors: new Set(rawAuthorWorks.map((work) => work.id)).size,
  manuallyLinkedWorks: manuallyLinkedWorks.length,
  candidateWorksBeforePublicationAudit: titleMergedScholarlyCandidates.length,
  publishedWorksCount: works.filter((work) => work.publicationStatus === "published").length,
  standalonePreprintsCount: works.filter((work) => work.publicationStatus === "preprint").length,
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
  `OpenAlex: ${authorIds.length} author records -> ${works.length} deduplicated publications and preprints.`,
);
