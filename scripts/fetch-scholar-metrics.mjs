import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const outputDir = path.join(root, "data/scholar");
const outputFile = path.join(outputDir, "profile.json");
const profileUrl = "https://scholar.google.com/citations?user=fhWJEysAAAAJ&hl=en";

function parseNumber(value) {
  return Number(String(value).replace(/[^0-9]/g, ""));
}

function parseMetrics(html) {
  const cells = [...html.matchAll(/<td[^>]*class="gsc_rsb_std"[^>]*>([^<]*)<\/td>/g)].map(
    (match) => parseNumber(match[1]),
  );
  if (cells.length < 6 || cells.slice(0, 6).some((value) => !Number.isFinite(value))) {
    throw new Error("Google Scholar returned an unexpected metrics table.");
  }
  const yearMatch = html.match(/Citations since (\d{4})/i);
  return {
    profileUrl,
    citations: cells[0],
    citationsSince2021: cells[1],
    hIndex: cells[2],
    hIndexSince2021: cells[3],
    i10Index: cells[4],
    i10IndexSince2021: cells[5],
    sinceYear: yearMatch ? Number(yearMatch[1]) : 2021,
    fetchedAt: new Date().toISOString(),
  };
}

async function refresh() {
  const response = await fetch(profileUrl, {
    headers: {
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36",
    },
  });
  if (!response.ok) {
    throw new Error(`Google Scholar request failed (${response.status}).`);
  }
  const metrics = parseMetrics(await response.text());
  await mkdir(outputDir, { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(metrics, null, 2)}\n`, "utf8");
  console.log(
    `Updated Google Scholar metrics: ${metrics.citations} citations, h-index ${metrics.hIndex}, i10-index ${metrics.i10Index}.`,
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
