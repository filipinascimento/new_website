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
  assert.ok(content.software.length >= 8);
  assert.equal(content.teaching.length, 2);
  assert.equal(content.posts.length, 0);

  const projectFiles = await readdir(new URL("content/projects/", root));
  assert.equal(projectFiles.filter((name) => name.endsWith(".md")).length, content.projects.length);
  await access(new URL("content/posts/README.md", root));
});

test("reconciles split OpenAlex identities without duplicate titles", async () => {
  const config = await json("config/profile-sources.json");
  const profile = await json("data/openalex/profile.json");
  const works = await json("data/openalex/works.json");
  assert.equal(config.openalex.authorIds.length, 10);
  assert.equal(profile.authorIds.length, 10);
  assert.ok(works.works.length >= 80);
  assert.equal(new Set(works.works.map((work) => work.normalizedTitle)).size, works.works.length);
  assert.ok(works.works.some((work) => work.doi === "https://doi.org/10.1103/4124-dyj8"));
  assert.ok(works.works.some((work) => work.title.startsWith("Triadic Novelty")));
});

test("caches scholarly metrics and course identifiers", async () => {
  const scholar = await json("data/scholar/profile.json");
  const content = await json("data/content.json");
  assert.ok(scholar.citations >= 2500);
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
