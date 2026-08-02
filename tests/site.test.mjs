import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function json(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

test("keeps the editorial content in Markdown collections", async () => {
  const content = await json("data/content.json");
  assert.equal(content.site.length, 1);
  assert.ok(content.projects.length >= 12);
  assert.ok(content.software.length >= 7);
  assert.equal(content.teaching.length, 2);
  assert.equal(content.posts.length, 0);

  const projectFiles = await readdir(new URL("content/projects/", root));
  assert.equal(projectFiles.filter((name) => name.endsWith(".md")).length, content.projects.length);
  await access(new URL("content/posts/README.md", root));
});

test("merges split OpenAlex identities without duplicate titles", async () => {
  const config = await json("config/profile-sources.json");
  const profile = await json("data/openalex/profile.json");
  const works = await json("data/openalex/works.json");
  const scholar = await json("data/scholar/profile.json");
  const comparison = await json("data/scholar/source-comparison.json");
  assert.equal(config.openalex.authorIds.length, 10);
  assert.equal(profile.authorIds.length, 10);
  assert.equal(works.works.length, scholar.publications);
  assert.equal(profile.mergedScholarlyWorksCount, scholar.publications);
  assert.equal(comparison.crosswalk.publicationsFoundInOpenAlex, scholar.publications);
  assert.equal(comparison.openAlex.missingCanonicalPublications.length, 0);
  assert.equal(comparison.openAlex.duplicateNormalizedTitles, 0);
  assert.ok(comparison.openAlex.candidateWorksBeforePublicationAudit > scholar.publications);
  assert.equal(new Set(works.works.map((work) => work.normalizedTitle)).size, works.works.length);
  assert.ok(works.works.every((work) => work.type !== "preprint"));
  assert.ok(works.works.some((work) => work.doi === "https://doi.org/10.1103/4124-dyj8"));
  assert.ok(works.works.some((work) => work.doi === "https://doi.org/10.1016/j.ins.2026.123702"));
  for (const doi of [
    "https://doi.org/10.1016/j.joi.2021.101218",
    "https://doi.org/10.1016/j.joi.2021.101158",
    "https://doi.org/10.1016/j.joi.2017.03.003",
    "https://doi.org/10.1016/j.joi.2016.03.008",
    "https://doi.org/10.1016/j.joi.2013.01.007",
  ]) {
    assert.ok(works.works.some((work) => work.doi === doi));
  }
});

test("caches scholarly metrics and course identifiers", async () => {
  const scholar = await json("data/scholar/profile.json");
  const scholarEntries = await json("data/scholar/entries.json");
  const content = await json("data/content.json");
  assert.ok(scholar.citations >= 2500);
  assert.equal(scholar.publications, 64);
  assert.equal(scholar.publicationsDisplay, "60+");
  assert.equal(scholarEntries.count, scholar.profileEntries);
  assert.equal(
    new Set(
      scholarEntries.entries
        .filter((entry) => entry.matchesPublishedTitle)
        .map((entry) => entry.normalizedTitle),
    ).size,
    63,
  );
  assert.ok(scholar.profileEntries >= 118);
  assert.match(scholar.publicationAudit.definition, /duplicate versions/i);
  assert.ok(scholar.hIndex >= 20);
  assert.ok(scholar.i10Index >= 40);
  assert.deepEqual(
    content.teaching.map((course) => course.code).sort(),
    ["INFO-I 513", "INFO-I 590"],
  );
});

test("keeps private contact fields out of the public site data", async () => {
  const publicData = await readFile(new URL("data/content.json", root), "utf8");
  assert.doesNotMatch(publicData, /812[) .-]+369[ .-]+3201/);
  assert.doesNotMatch(publicData, /1800 Sherman Avenue/i);
  assert.doesNotMatch(publicData, /filipinascimento@gmail\.com/i);
  assert.doesNotMatch(publicData, /reconciled scholarly works/i);
  assert.doesNotMatch(publicData, /64 distinct publications/i);
  assert.doesNotMatch(publicData, /recurring technical motifs/i);
  assert.doesNotMatch(publicData, /Device Motif Atlas|filipinascimento\/motifs|github\.io\/motifs/i);
});

test("vendors the current Helios browser runtime for static hosting", async () => {
  const packageJson = await json("package.json");
  assert.match(packageJson.dependencies["helios-web"], /0\.10/);
  assert.match(packageJson.dependencies["helios-network"], /0\.10/);

  const helios = await readFile(new URL("public/vendor/helios-web.es.js", root), "utf8");
  assert.match(helios, /from "\.\/helios-network\.inline\.js"/);
  assert.doesNotMatch(helios, /"\/assets\/(?:layout|d3force3d)Worker/);
  await access(new URL("public/vendor/helios-network.inline.js", root));
});

test("keeps the home page academic, unnumbered, and free of implementation slogans", async () => {
  const home = await readFile(new URL("app/page.tsx", root), "utf8");
  const helios = await readFile(new URL("app/components/HeliosPreview.tsx", root), "utf8");
  const softwarePage = await readFile(new URL("app/software/page.tsx", root), "utf8");
  const softwareCard = await readFile(new URL("app/components/SoftwareCard.tsx", root), "utf8");
  const softwareIcon = await readFile(new URL("app/components/SoftwareIcon.tsx", root), "utf8");
  const footer = await readFile(new URL("app/components/SiteFooter.tsx", root), "utf8");
  const styles = await readFile(new URL("app/globals.css", root), "utf8");
  assert.match(home, /home-intro-grid/);
  assert.match(home, /home-helios/);
  assert.doesNotMatch(home, /home-helios__heading/);
  assert.doesNotMatch(home, /Interactive network and embedding visualization in the browser/);
  assert.doesNotMatch(home, /padStart|Helios defaults|Live visualization/i);
  assert.doesNotMatch(helios, /live GPU layout/i);
  assert.match(helios, /getPropertyValue\("--paper"\)/);
  assert.match(helios, /MutationObserver\(synchronizeBackground\)/);
  assert.match(helios, /Helios Web visualization/);
  assert.match(helios, /ui:\s*false/);
  assert.match(helios, /quickControls:\s*false/);
  assert.match(helios, /legends:\s*\{\s*enabled:\s*false\s*\}/);
  assert.doesNotMatch(`${home}\n${softwarePage}\n${softwareCard}`, /\bstars\b|\bforks\b/i);
  assert.doesNotMatch(`${home}\n${softwareCard}`, /\{(?:item|software)\.status\}/);
  assert.match(softwareCard, /SoftwareIcon/);
  assert.match(softwareIcon, /lucide-react/);
  assert.match(softwareIcon, /software-icons\/helios-web\.svg/);
  assert.doesNotMatch(footer, /Content in Markdown|data synced from public APIs/i);
  assert.match(styles, /\.helios-stage__viewport\s*{[^}]*background:\s*var\(--paper\)/s);
  assert.doesNotMatch(styles, /\.helios-stage__viewport\s*{[^}]*border:/s);
});
