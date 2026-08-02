import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const outputDir = path.join(root, "data/scholar");
const outputFile = path.join(outputDir, "profile.json");
const entriesFile = path.join(outputDir, "entries.json");
const auditFile = path.join(root, "config/scholar-publication-audit.json");
const profileUrl = "https://scholar.google.com/citations?user=fhWJEysAAAAJ&hl=en";
const pageSize = 100;

function parseNumber(value) {
  return Number(String(value).replace(/[^0-9]/g, ""));
}

function decodeHtml(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&hellip;/g, "…")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeTitle(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parsePublicationEntries(html) {
  return [...html.matchAll(/<a[^>]*class="gsc_a_at"[^>]*>[\s\S]*?<\/a>/g)]
    .map((match) => {
      const tag = match[0];
      const id = tag.match(/citation_for_view=([^&"]+)/)?.[1];
      const title = decodeHtml(tag.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
      return id && title ? { id, title } : null;
    })
    .filter(Boolean);
}

function parseMetrics(html, { publications, profileEntries, audit }) {
  const cells = [...html.matchAll(/<td[^>]*class="gsc_rsb_std"[^>]*>([^<]*)<\/td>/g)].map(
    (match) => parseNumber(match[1]),
  );
  if (cells.length < 6 || cells.slice(0, 6).some((value) => !Number.isFinite(value))) {
    throw new Error("Google Scholar returned an unexpected metrics table.");
  }
  const yearMatch = html.match(/Citations since (\d{4})/i);
  return {
    profileUrl,
    publications,
    publicationsDisplay: `${Math.floor(publications / 10) * 10}+`,
    profileEntries,
    citations: cells[0],
    citationsSince2021: cells[1],
    hIndex: cells[2],
    hIndexSince2021: cells[3],
    i10Index: cells[4],
    i10IndexSince2021: cells[5],
    sinceYear: yearMatch ? Number(yearMatch[1]) : 2021,
    publicationAudit: {
      auditedAt: audit.auditedAt,
      definition: audit.definition,
      publishedProfileRows: audit.publishedProfileTitles.length,
      additionalPublishedRecords: audit.additionalPublishedTitles.length,
    },
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchPage(cstart = 0) {
  const url = new URL(profileUrl);
  url.searchParams.set("pagesize", String(pageSize));
  url.searchParams.set("cstart", String(cstart));
  const response = await fetch(url, {
    headers: {
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36",
    },
  });
  if (!response.ok) {
    throw new Error(`Google Scholar request failed (${response.status}).`);
  }
  return response.text();
}

async function refresh() {
  const audit = JSON.parse(await readFile(auditFile, "utf8"));
  const firstPage = await fetchPage();
  const firstEntries = parsePublicationEntries(firstPage);
  const publicationEntries = new Map(firstEntries.map((entry) => [entry.id, entry]));
  const publicationTitles = new Set(firstEntries.map((entry) => normalizeTitle(entry.title)));
  let pageCount = firstEntries.length;
  let cstart = pageSize;
  while (pageCount === pageSize) {
    const page = await fetchPage(cstart);
    const entries = parsePublicationEntries(page);
    pageCount = entries.length;
    for (const entry of entries) {
      publicationEntries.set(entry.id, entry);
      publicationTitles.add(normalizeTitle(entry.title));
    }
    cstart += pageSize;
  }
  if (publicationEntries.size === 0) {
    throw new Error("Google Scholar returned no publication entries.");
  }
  const missingAuditedTitles = audit.publishedProfileTitles.filter(
    (title) => !publicationTitles.has(normalizeTitle(title)),
  );
  if (missingAuditedTitles.length > 0) {
    throw new Error(
      `Google Scholar publication audit no longer matches the profile: ${missingAuditedTitles.join("; ")}`,
    );
  }
  const publications =
    audit.publishedProfileTitles.length + audit.additionalPublishedTitles.length;
  const metrics = parseMetrics(firstPage, {
    publications,
    profileEntries: publicationEntries.size,
    audit,
  });
  const auditedTitles = new Set(audit.publishedProfileTitles.map(normalizeTitle));
  const entries = {
    profileUrl,
    fetchedAt: metrics.fetchedAt,
    count: publicationEntries.size,
    entries: [...publicationEntries.values()].map((entry) => ({
      ...entry,
      normalizedTitle: normalizeTitle(entry.title),
      matchesPublishedTitle: auditedTitles.has(normalizeTitle(entry.title)),
    })),
  };
  await mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeFile(outputFile, `${JSON.stringify(metrics, null, 2)}\n`, "utf8"),
    writeFile(entriesFile, `${JSON.stringify(entries, null, 2)}\n`, "utf8"),
  ]);
  console.log(
    `Updated Google Scholar metrics: ${metrics.publications} publications, ${metrics.citations} citations, h-index ${metrics.hIndex}.`,
  );
}

try {
  await refresh();
} catch (error) {
  try {
    await readFile(outputFile, "utf8");
    console.warn(`Google Scholar refresh skipped; preserving cached metrics. ${error.message}`);
  } catch {
    throw error;
  }
}
