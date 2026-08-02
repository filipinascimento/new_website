import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

async function json(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

function normalizeTitle(value = "") {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const [audit, scholarProfile, scholarEntries, openAlexProfile, openAlexWorks] = await Promise.all([
  json("config/scholar-publication-audit.json"),
  json("data/scholar/profile.json"),
  json("data/scholar/entries.json"),
  json("data/openalex/profile.json"),
  json("data/openalex/works.json"),
]);

const canonicalTitles = [...audit.publishedProfileTitles, ...audit.additionalPublishedTitles];
const standalonePreprintTitles = audit.standalonePreprintTitles || [];
const allCuratedTitles = [...canonicalTitles, ...standalonePreprintTitles];
const scholarTitles = new Set(scholarEntries.entries.map((entry) => normalizeTitle(entry.title)));
const openAlexTitles = new Set(openAlexWorks.works.map((work) => normalizeTitle(work.title)));
const missingScholarPublishedRows = audit.publishedProfileTitles.filter(
  (title) => !scholarTitles.has(normalizeTitle(title)),
);
const missingOpenAlexPublications = canonicalTitles.filter(
  (title) => !openAlexTitles.has(normalizeTitle(title)),
);
const missingOpenAlexPreprints = standalonePreprintTitles.filter(
  (title) => !openAlexTitles.has(normalizeTitle(title)),
);
const curatedPublishedWorks = openAlexWorks.works.filter(
  (work) => work.publicationStatus === "published",
);
const curatedStandalonePreprints = openAlexWorks.works.filter(
  (work) => work.publicationStatus === "preprint",
);
const duplicateOpenAlexTitles = openAlexWorks.works
  .map((work) => normalizeTitle(work.title))
  .filter((title, index, titles) => titles.indexOf(title) !== index);
const excludedBreakdown = audit.profileEntryAudit;
const excludedRows =
  excludedBreakdown.duplicateOrVersionRows +
  excludedBreakdown.unpublishedPreprintOrManuscriptRows +
  excludedBreakdown.otherScholarlyOutputRows +
  excludedBreakdown.unrelatedOrMalformedAuthorRows;

if (scholarEntries.count !== scholarProfile.profileEntries) {
  throw new Error("Google Scholar entry cache and profile count disagree.");
}
if (audit.publishedProfileTitles.length + excludedRows !== scholarEntries.count) {
  throw new Error("Google Scholar audit categories no longer account for every profile row.");
}
if (missingScholarPublishedRows.length > 0) {
  throw new Error(`Audited Google Scholar publications are missing: ${missingScholarPublishedRows.join("; ")}`);
}
if (missingOpenAlexPublications.length > 0) {
  throw new Error(`Curated publications are missing from OpenAlex: ${missingOpenAlexPublications.join("; ")}`);
}
if (missingOpenAlexPreprints.length > 0) {
  throw new Error(`Curated preprints are missing from OpenAlex: ${missingOpenAlexPreprints.join("; ")}`);
}
if (
  duplicateOpenAlexTitles.length > 0 ||
  openAlexWorks.works.length !== allCuratedTitles.length ||
  curatedPublishedWorks.length !== canonicalTitles.length ||
  curatedStandalonePreprints.length !== standalonePreprintTitles.length
) {
  throw new Error("The curated OpenAlex bibliography contains a duplicate or unexpected record.");
}

const comparison = {
  generatedAt: new Date().toISOString(),
  googleScholar: {
    profileEntries: scholarEntries.count,
    acceptedPublishedRows: audit.publishedProfileTitles.length,
    excludedRows,
    excludedBreakdown: {
      duplicateOrVersionRows: excludedBreakdown.duplicateOrVersionRows,
      unpublishedPreprintOrManuscriptRows: excludedBreakdown.unpublishedPreprintOrManuscriptRows,
      otherScholarlyOutputRows: excludedBreakdown.otherScholarlyOutputRows,
      unrelatedOrMalformedAuthorRows: excludedBreakdown.unrelatedOrMalformedAuthorRows,
    },
    citations: scholarProfile.citations,
    hIndex: scholarProfile.hIndex,
  },
  openAlex: {
    linkedAuthorRecords: openAlexProfile.authorIds.length,
    rawUniqueWorksAcrossLinkedAuthors: openAlexProfile.rawUniqueWorksAcrossLinkedAuthors,
    manuallyLinkedWorks: openAlexProfile.manuallyLinkedWorks,
    candidateWorksBeforePublicationAudit: openAlexProfile.candidateWorksBeforePublicationAudit,
    curatedPublishedWorks: curatedPublishedWorks.length,
    curatedStandalonePreprints: curatedStandalonePreprints.length,
    duplicateNormalizedTitles: duplicateOpenAlexTitles.length,
    missingCanonicalPublications: missingOpenAlexPublications,
    missingCanonicalPreprints: missingOpenAlexPreprints,
    primaryAuthorCitations: openAlexProfile.citedByCount,
    primaryAuthorHIndex: openAlexProfile.hIndex,
  },
  crosswalk: {
    canonicalPublishedWorks: canonicalTitles.length,
    publishedScholarRowsFound: audit.publishedProfileTitles.length - missingScholarPublishedRows.length,
    additionalPublishedWorks: audit.additionalPublishedTitles.length,
    publicationsFoundInOpenAlex: canonicalTitles.length - missingOpenAlexPublications.length,
  },
};

await mkdir(path.join(root, "data/scholar"), { recursive: true });
await writeFile(
  path.join(root, "data/scholar/source-comparison.json"),
  `${JSON.stringify(comparison, null, 2)}\n`,
  "utf8",
);

console.log(
  `Compared ${scholarEntries.count} Google Scholar rows with ${openAlexProfile.authorIds.length} OpenAlex author records: ${canonicalTitles.length}/${canonicalTitles.length} curated publications matched.`,
);
