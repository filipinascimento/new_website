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

test("provides a figure for every audited publication and project", async () => {
  const figures = await json("data/publication-figures.json");
  const works = await json("data/openalex/works.json");
  const content = await json("data/content.json");
  assert.equal(figures.count, works.works.length);
  assert.equal(figures.missingCount, 0);
  for (const figure of figures.figures) {
    await access(new URL(`public${figure.src}`, root));
  }
  for (const project of content.projects) {
    assert.ok(project.figure?.src, `${project.slug} is missing a figure`);
    await access(new URL(`public${project.figure.src}`, root));
  }
});

test("uses direct figures and correct links for the supplied publication PDFs", async () => {
  const figures = await json("data/publication-figures.json");
  const byTitle = new Map(figures.figures.map((figure) => [figure.title, figure]));
  const expected = new Map([
    ["A pattern recognition approach to transistor array parameter variance", "https://doi.org/10.1016/j.physa.2018.02.011"],
    ["Biological network border detection", "https://doi.org/10.1039/c7ib00161d"],
    ["Methods for gene coexpression network visualization and analysis", "https://doi.org/10.1007/978-3-319-11985-4_4"],
    ["Thymus gene coexpression networks: a comparative study in children with and without Down Syndrome", "https://doi.org/10.1007/978-3-319-11985-4_7"],
    ["Investigating relationships within and between category networks in Wikipedia", "https://doi.org/10.1016/j.joi.2011.03.003"],
    ["A pattern recognition approach to complex networks", "https://doi.org/10.1088/1742-5468/2010/11/p11015"],
    ["Identifying the borders of mathematical knowledge", "https://doi.org/10.1088/1751-8113/43/32/325202"],
  ]);

  for (const [title, sourceUrl] of expected) {
    const figure = byTitle.get(title);
    assert.ok(figure, `${title} is missing its curated figure`);
    assert.equal(figure.method, "curated");
    assert.equal(figure.sourceLabel, "Paper figure");
    assert.equal(figure.sourceUrl, sourceUrl);
    assert.doesNotMatch(figure.src, /a-framework-for-evaluating|a-diffusion-based|dynamic-gene-network|using-network-science-and-text-analytics/);
  }
  assert.equal(figures.figures.filter((figure) => figure.sourceLabel === "Related author figure").length, 0);
});

test("applies the GitHub Pages base path to publication and project figures", async () => {
  const homePage = await readFile(new URL("app/page.tsx", root), "utf8");
  const publicationsPage = await readFile(new URL("app/publications/page.tsx", root), "utf8");
  const publicationExplorer = await readFile(new URL("app/components/PublicationExplorer.tsx", root), "utf8");
  const projectCard = await readFile(new URL("app/components/ProjectCard.tsx", root), "utf8");
  assert.match(publicationsPage, /GITHUB_PAGES/);
  assert.match(publicationExplorer, /assetRoot.*figure\.src/);
  assert.match(projectCard, /assetRoot.*figure\.src/);
  assert.match(homePage, /basePath.*project\.figure\.src/);
  assert.match(homePage, /basePath.*work\.figure\.src/);
});

test("shows the corresponding project and publication figures on the homepage", async () => {
  const homePage = await readFile(new URL("app/page.tsx", root), "utf8");
  const styles = await readFile(new URL("app/globals.css", root), "utf8");

  assert.match(homePage, /publicationFigures\.figures/);
  assert.match(homePage, /figureByTitle\.get\(work\.normalizedTitle\)/);
  assert.match(homePage, /home-project-list__figure/);
  assert.match(homePage, /recent-publications__figure/);
  assert.match(styles, /\.home-project-list__figure img\s*\{[^}]*object-fit:\s*contain/s);
  assert.match(styles, /\.recent-publications__figure img\s*\{[^}]*object-fit:\s*contain/s);
});

test("keeps scientific figures intact and only links verified figure sources", async () => {
  const figures = await json("data/publication-figures.json");
  const projectCard = await readFile(new URL("app/components/ProjectCard.tsx", root), "utf8");
  const publicationExplorer = await readFile(new URL("app/components/PublicationExplorer.tsx", root), "utf8");
  const styles = await readFile(new URL("app/globals.css", root), "utf8");
  const agenticProject = await readFile(new URL("content/projects/agentic-scientific-design.md", root), "utf8");
  const technologyProject = await readFile(new URL("content/projects/technology-capability-maps.md", root), "utf8");

  assert.ok(figures.figures.every((figure) => figure.fit === "contain"));
  assert.match(styles, /\.project-card__figure img\s*\{[^}]*object-fit:\s*contain/s);
  assert.match(styles, /\.publication-list__figure img\s*\{[^}]*object-fit:\s*contain/s);
  assert.doesNotMatch(styles, /(?:project-card|publication-list)__figure:hover img/);
  assert.match(projectCard, /project\.figure\.sourceUrl \?/);
  assert.doesNotMatch(projectCard, /project\.links\?\.\[0\]\?\.url|\|\| "#"/);
  assert.match(publicationExplorer, /objectPosition:\s*work\.figure\.position \|\| "center"/);
  assert.doesNotMatch(`${agenticProject}\n${technologyProject}`, /sourceUrl:/);
});

test("merges split OpenAlex identities without duplicate titles", async () => {
  const config = await json("config/profile-sources.json");
  const profile = await json("data/openalex/profile.json");
  const works = await json("data/openalex/works.json");
  const scholar = await json("data/scholar/profile.json");
  const audit = await json("config/scholar-publication-audit.json");
  const comparison = await json("data/scholar/source-comparison.json");
  const publishedWorks = works.works.filter((work) => work.publicationStatus === "published");
  const standalonePreprints = works.works.filter((work) => work.publicationStatus === "preprint");
  assert.equal(config.openalex.authorIds.length, 10);
  assert.equal(profile.authorIds.length, 10);
  assert.equal(publishedWorks.length, scholar.publications);
  assert.equal(standalonePreprints.length, audit.standalonePreprintTitles.length);
  assert.equal(works.works.length, scholar.publications + audit.standalonePreprintTitles.length);
  assert.equal(profile.mergedScholarlyWorksCount, works.works.length);
  assert.equal(profile.publishedWorksCount, scholar.publications);
  assert.equal(profile.standalonePreprintsCount, audit.standalonePreprintTitles.length);
  assert.equal(comparison.crosswalk.publicationsFoundInOpenAlex, scholar.publications);
  assert.equal(comparison.openAlex.missingCanonicalPublications.length, 0);
  assert.equal(comparison.openAlex.missingCanonicalPreprints.length, 0);
  assert.equal(comparison.openAlex.duplicateNormalizedTitles, 0);
  assert.ok(comparison.openAlex.candidateWorksBeforePublicationAudit > works.works.length);
  assert.equal(new Set(works.works.map((work) => work.normalizedTitle)).size, works.works.length);
  assert.ok(standalonePreprints.every((work) => work.type === "preprint"));
  assert.ok(standalonePreprints.some((work) => work.title === "Linking Global Science Funding to Research Publications"));
  const toneOfAwareness = standalonePreprints.find(
    (work) => work.title === "The Tone of Awareness: Topic, Sentiment, and Toxicity Maps During Mental Health Month on TikTok",
  );
  assert.equal(toneOfAwareness.authors.at(-1).name, "Filipi Nascimento Silva");
  assert.doesNotMatch(toneOfAwareness.authors.map((author) => author.name).join(", "), /\bF E Silva\b/);
  assert.ok(publishedWorks.some((work) => work.preprintUrls.length > 0));
  assert.ok(works.works.some((work) => work.doi === "https://doi.org/10.1103/4124-dyj8"));
  assert.ok(
    works.works.find((work) => work.doi === "https://doi.org/10.1103/4124-dyj8")
      .preprintUrls.includes("https://arxiv.org/abs/2510.23964"),
  );
  assert.ok(works.works.some((work) => work.doi === "https://doi.org/10.1016/j.ins.2026.123702"));
  assert.ok(
    works.works.find((work) => work.doi === "https://doi.org/10.1016/j.ins.2026.123702")
      .preprintUrls.includes("https://arxiv.org/abs/2508.07489"),
  );
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
  assert.equal(scholar.citationsDisplay, "2,600+");
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

test("keeps public citation metrics approximate and pins recent publications in Markdown", async () => {
  const scholar = await json("data/scholar/profile.json");
  const content = await json("data/content.json");
  const publicationsPage = await readFile(new URL("app/publications/page.tsx", root), "utf8");
  const cvPage = await readFile(new URL("app/cv/page.tsx", root), "utf8");
  const home = await readFile(new URL("app/page.tsx", root), "utf8");
  const profileSource = await readFile(new URL("content/site/profile.md", root), "utf8");

  assert.equal(content.site[0].recentPublications.length, 5);
  assert.match(home, /profile\.recentPublications/);
  assert.match(profileSource, /recentPublications:/);
  assert.match(publicationsPage, /scholarProfile\.citationsDisplay/);
  assert.match(cvPage, /scholarProfile\.citationsDisplay/);
  assert.doesNotMatch(publicationsPage, /Google Scholar citations|Google Scholar h-index/);
  assert.match(content.cv[0].markdown, /2,600\+ citations/);
  assert.doesNotMatch(content.cv[0].markdown, new RegExp(`${scholar.citations.toLocaleString("en-US")} citations`));
});

test("keeps private contact fields out of the public site data", async () => {
  const publicData = await readFile(new URL("data/content.json", root), "utf8");
  const publicCv = await readFile(new URL("content/cv/public.md", root), "utf8");
  assert.doesNotMatch(publicData, /812[) .-]+369[ .-]+3201/);
  assert.doesNotMatch(publicData, /1800 Sherman Avenue/i);
  assert.doesNotMatch(publicData, /filipinascimento@gmail\.com/i);
  assert.doesNotMatch(publicData, /reconciled scholarly works/i);
  assert.doesNotMatch(publicData, /64 distinct publications/i);
  assert.doesNotMatch(publicData, /recurring technical motifs/i);
  assert.doesNotMatch(publicData, /Device Motif Atlas|filipinascimento\/motifs|github\.io\/motifs/i);
  assert.match(publicCv, /Technology capability maps:[\s\S]*embedding models[\s\S]*design choices/i);
  assert.doesNotMatch(publicCv, /Climate teleconnections|Didier Vega-Oliveros/i);
});

test("lists only successful funded programs in the CV grant section", async () => {
  const publicCv = await readFile(new URL("content/cv/public.md", root), "utf8");
  const grantSection = publicCv.match(/## Grant writing and funded projects([\s\S]*?)\n## /i)?.[1] ?? "";

  assert.match(grantSection, /APTO: Global Observatory/);
  assert.match(grantSection, /Integrative Study of Local Microbiome Function/);
  assert.match(grantSection, /UPSCALE: Universal Population Segmentation/);
  assert.match(grantSection, /A National Network for Critical Technology Assessment/);
  assert.match(grantSection, /Science Genome: A Scholarly Graph Embedding Framework/);
  assert.equal((grantSection.match(/^-/gm) ?? []).length, 5);
  assert.doesNotMatch(grantSection, /planned|submitted|resubmission|not funded|HeliosChat|HNDS-I|ADvance-Net|VIIME/i);
});

test("avoids em dashes in public website and CV copy", async () => {
  const publicData = await readFile(new URL("data/content.json", root), "utf8");
  const publicCv = await readFile(new URL("content/cv/public.md", root), "utf8");
  const layout = await readFile(new URL("app/layout.tsx", root), "utf8");
  const publications = await readFile(new URL("app/components/PublicationExplorer.tsx", root), "utf8");
  assert.doesNotMatch(`${publicData}\n${publicCv}\n${layout}\n${publications}`, /—/);
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

test("matches the UI-free Helios landing preview", async () => {
  const preview = await readFile(new URL("app/components/HeliosPreview.tsx", root), "utf8");
  assert.match(preview, /nodeCount:\s*2_000/);
  assert.match(preview, /seed:\s*17/);
  assert.match(preview, /mode:\s*"3d"/);
  assert.match(preview, /projection:\s*"perspective"/);
  assert.match(preview, /linkDistance:\s*6/);
  assert.match(preview, /orbit:\s*true/);
  assert.match(preview, /orbitSpeed:\s*0\.04/);
  assert.match(preview, /orbitAngle:\s*16/);
  assert.match(preview, /orbitAxis:\s*\[0\.83,\s*0\.75,\s*0\]/);
  assert.match(preview, /ui:\s*false/);
  assert.match(preview, /quickControls:\s*false/);
});

test("keeps the home page academic, unnumbered, and free of implementation slogans", async () => {
  const home = await readFile(new URL("app/page.tsx", root), "utf8");
  const helios = await readFile(new URL("app/components/HeliosPreview.tsx", root), "utf8");
  const softwarePage = await readFile(new URL("app/software/page.tsx", root), "utf8");
  const softwareCard = await readFile(new URL("app/components/SoftwareCard.tsx", root), "utf8");
  const softwareIcon = await readFile(new URL("app/components/SoftwareIcon.tsx", root), "utf8");
  const publicationsPage = await readFile(new URL("app/publications/page.tsx", root), "utf8");
  const profile = await readFile(new URL("content/site/profile.md", root), "utf8");
  const biomedicalProject = await readFile(new URL("content/projects/brainlife-network-apps.md", root), "utf8");
  const footer = await readFile(new URL("app/components/SiteFooter.tsx", root), "utf8");
  const styles = await readFile(new URL("app/globals.css", root), "utf8");
  assert.match(home, /home-intro-grid/);
  assert.match(home, /profile\.headline/);
  assert.doesNotMatch(home, /home-intro__role|\{profile\.role\}\s*·\s*Northwestern University/);
  assert.doesNotMatch(home, /home-intro-title[^\n]*\{profile\.title\}/);
  assert.match(home, /profile\.centerUrl/);
  assert.match(home, /profile\.schoolUrl/);
  assert.match(home, /profile\.universityUrl/);
  assert.match(profile, /Trained as a physicist[\s\S]*structured AI pipelines/i);
  assert.match(biomedicalProject, /single-cell genomics[\s\S]*wound-healing materials[\s\S]*neuroscience/i);
  assert.doesNotMatch(softwareCard, /Selected collaborators/);
  assert.doesNotMatch(await readFile(new URL("app/components/ProjectCard.tsx", root), "utf8"), /Selected collaborators|project\.collaborators/);
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
  assert.match(softwareIcon, /software-icons\/helios-web-mark\.svg/);
  assert.match(styles, /\.software-icon__asset\s*\{[^}]*object-fit:\s*contain/s);
  assert.doesNotMatch(styles, /\.software-icon--brand\s*\{[^}]*overflow:\s*hidden/s);
  assert.doesNotMatch(footer, /Content in Markdown|data synced from public APIs/i);
  assert.doesNotMatch(publicationsPage, /Duplicate versions|OpenAlex pipeline|BookOpen|Database/);
  assert.match(publicationsPage, /Last updated/);
  const pdfButton = await readFile(new URL("app/components/PdfButton.tsx", root), "utf8");
  assert.match(pdfButton, /Filipi_Nascimento_Silva_CV\.pdf/);
  assert.match(pdfButton, /View or download PDF/);
  assert.doesNotMatch(pdfButton, /window\.print|Print \/ save as PDF/);
  await access(new URL("public/cv/Filipi_Nascimento_Silva_CV.pdf", root));
  assert.match(styles, /\.helios-stage__viewport\s*{[^}]*background:\s*var\(--paper\)/s);
  assert.doesNotMatch(styles, /\.helios-stage__viewport\s*{[^}]*border:/s);
});

test("keeps the compact profile aligned without an oversized location panel", async () => {
  const styles = await readFile(new URL("app/globals.css", root), "utf8");
  assert.match(styles, /@media \(max-width: 860px\)[\s\S]*grid-template-areas:[\s\S]*"portrait identity"[\s\S]*"portrait facts"[\s\S]*"\. links"/);
  assert.match(styles, /\.profile-sidebar__facts > div:nth-child\(even\)\s*\{[^}]*display:\s*flex[^}]*background:\s*none/s);
  assert.match(styles, /@media \(max-width: 680px\)[\s\S]*grid-template-areas:[\s\S]*"portrait identity"[\s\S]*"facts facts"[\s\S]*"links links"/);
  assert.doesNotMatch(styles, /\.profile-sidebar__facts > div:last-child\s*\{[^}]*display:\s*none/s);
});

test("keeps every navigation link visible at compact widths", async () => {
  const styles = await readFile(new URL("app/globals.css", root), "utf8");
  assert.match(styles, /\.site-nav a\s*\{[^}]*font-size:\s*1rem[^}]*white-space:\s*nowrap/s);
  assert.match(styles, /@media \(max-width: 860px\)[\s\S]*?\.site-nav\s*\{[^}]*flex-wrap:\s*wrap[^}]*overflow:\s*visible/s);
  assert.match(styles, /@media \(max-width: 680px\)[\s\S]*?\.site-nav\s*\{[^}]*grid-template-columns:\s*repeat\(3, max-content\)[^}]*justify-content:\s*space-between/s);
  assert.doesNotMatch(styles, /\.site-nav\s*\{[^}]*overflow-x:\s*auto/s);
});

test("lets project descriptions wrap beside figures and continue at full width", async () => {
  const home = await readFile(new URL("app/page.tsx", root), "utf8");
  const projectCard = await readFile(new URL("app/components/ProjectCard.tsx", root), "utf8");
  const styles = await readFile(new URL("app/globals.css", root), "utf8");

  assert.match(home, /home-project-list__content/);
  assert.doesNotMatch(home, /home-project-list__layout/);
  assert.match(projectCard, /project-card__content/);
  assert.doesNotMatch(projectCard, /project-card__layout/);
  assert.match(styles, /\.home-project-list__content\s*\{[^}]*display:\s*flow-root/s);
  assert.match(styles, /\.home-project-list__figure\s*\{[^}]*float:\s*right/s);
  assert.match(styles, /\.project-card__content\s*\{[^}]*display:\s*flow-root/s);
  assert.match(styles, /\.project-card__figure\s*\{[^}]*float:\s*right/s);
  assert.match(styles, /@media \(max-width: 680px\)[\s\S]*?\.home-project-list__figure,[\s\S]*?\.project-card__figure\s*\{[^}]*float:\s*none[^}]*width:\s*100%/s);
});

test("renders publication figures on white surfaces", async () => {
  const styles = await readFile(new URL("app/globals.css", root), "utf8");
  assert.match(styles, /\.recent-publications__figure\s*\{[^}]*background:\s*#fff/s);
  assert.match(styles, /\.publication-list__figure\s*\{[^}]*background:\s*#fff/s);
});

test("normalizes featured project figures and uses concise homepage summaries", async () => {
  const content = await json("data/content.json");
  const home = await readFile(new URL("app/page.tsx", root), "utf8");
  const styles = await readFile(new URL("app/globals.css", root), "utf8");
  const featured = content.projects.filter((project) => project.featured && project.era === "current").slice(0, 4);

  assert.ok(featured.length >= 4);
  assert.ok(featured.every((project) => project.summary?.length >= 100));
  assert.ok(featured.every((project) => project.figure.src.startsWith("/figures/projects/normalized/")));
  for (const project of featured) await access(new URL(`public${project.figure.src}`, root));
  assert.match(home, /project\.summary \|\| project\.text/);
  assert.match(styles, /\.home-project-list__figure img\s*\{[^}]*aspect-ratio:\s*3 \/ 2/s);
  assert.match(styles, /\.project-card__figure img\s*\{[^}]*aspect-ratio:\s*3 \/ 2/s);
  assert.match(styles, /\.home-project-list__topics,[\s\S]*?\.tag-list\s*\{[^}]*font-size:\s*1rem[^}]*font-weight:\s*500/s);
});
