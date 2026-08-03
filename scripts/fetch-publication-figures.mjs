import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import matter from "gray-matter";

const root = process.cwd();
const worksPath = path.join(root, "data/openalex/works.json");
const overridesPath = path.join(root, "content/publication-figures/overrides.md");
const outputPath = path.join(root, "data/publication-figures.json");
const generatedMarkdownPath = path.join(root, "content/publication-figures/generated.md");
const publicDirectory = path.join(root, "public/figures/publications");

const { works } = JSON.parse(await readFile(worksPath, "utf8"));
const overridesSource = await readFile(overridesPath, "utf8");
const overrides = matter(overridesSource).data.figures || [];
const overrideByTitle = new Map(
  overrides.map((entry) => [normalizeTitle(entry.title), entry]),
);

function normalizeTitle(value = "") {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slug(value = "") {
  return normalizeTitle(value).replace(/\s+/g, "-").slice(0, 76);
}

function cleanHtml(value = "") {
  return String(value)
    .replace(/<math[\s\S]*?<\/math>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:x27|39);/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function arxivIdentifier(work) {
  const candidates = [work.url, ...(work.preprintUrls || []), work.doi].filter(
    (value) => typeof value === "string" && value !== "null",
  );
  for (const candidate of candidates) {
    const urlMatch = candidate.match(/arxiv\.org\/(?:abs|pdf)\/([^?#]+)/i);
    const doiMatch = candidate.match(/10\.48550\/arxiv\.([^?#]+)/i);
    const identifier = (urlMatch?.[1] || doiMatch?.[1] || "")
      .replace(/\.pdf$/i, "")
      .replace(/v\d+$/i, "");
    if (identifier) return identifier;
  }
  return null;
}

function extensionFrom(contentType, url) {
  const type = String(contentType || "").toLowerCase();
  if (type.includes("image/jpeg")) return ".jpg";
  if (type.includes("image/webp")) return ".webp";
  if (type.includes("image/svg")) return ".svg";
  if (type.includes("image/gif")) return ".gif";
  if (type.includes("image/png")) return ".png";
  const extension = path.extname(new URL(url).pathname).toLowerCase();
  return [".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"].includes(extension)
    ? extension.replace(".jpeg", ".jpg")
    : ".png";
}

async function fetchResource(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "filipinascimento-website/1.0" },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response;
}

async function saveRemoteImage(url, baseName) {
  const response = await fetchResource(url);
  const extension = extensionFrom(response.headers.get("content-type"), response.url || url);
  const fileName = `${baseName}${extension}`;
  await writeFile(path.join(publicDirectory, fileName), Buffer.from(await response.arrayBuffer()));
  return `/figures/publications/${fileName}`;
}

async function saveOverride(work, override) {
  const baseName = slug(work.title);
  let src;
  if (override.localPath) {
    const extension = path.extname(override.localPath).toLowerCase().replace(".jpeg", ".jpg") || ".png";
    const fileName = `${baseName}${extension}`;
    const sourcePath = path.isAbsolute(override.localPath)
      ? override.localPath
      : path.join(root, override.localPath);
    await copyFile(sourcePath, path.join(publicDirectory, fileName));
    src = `/figures/publications/${fileName}`;
  } else if (override.remoteUrl) {
    src = await saveRemoteImage(override.remoteUrl, baseName);
  } else if (override.src) {
    src = override.src;
  } else {
    throw new Error("Override has no localPath, remoteUrl, or src");
  }
  return {
    normalizedTitle: work.normalizedTitle,
    title: work.title,
    src,
    alt: override.alt || `Figure from ${work.title}.`,
    caption: override.caption || null,
    sourceUrl: override.sourceUrl || work.preprintUrls?.[0] || work.url,
    sourceLabel: override.sourceLabel || "Paper figure",
    method: "curated",
    fit: override.fit || "contain",
    position: override.position || "center",
  };
}

async function fetchArxivFigure(work, identifier) {
  const articleUrl = `https://ar5iv.labs.arxiv.org/html/${identifier}`;
  const html = await (await fetchResource(articleUrl)).text();
  const figures = [...html.matchAll(/<figure\b[^>]*>([\s\S]*?)<\/figure>/gi)];
  for (const figure of figures) {
    const body = figure[1];
    const image = body.match(/<img\b[^>]*src=["']([^"']+)["'][^>]*>/i);
    if (!image || image[1].startsWith("data:")) continue;
    const remoteUrl = new URL(image[1], articleUrl).href;
    const captionMatch = body.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i);
    const caption = cleanHtml(captionMatch?.[1] || "");
    const src = await saveRemoteImage(remoteUrl, slug(work.title));
    return {
      normalizedTitle: work.normalizedTitle,
      title: work.title,
      src,
      alt: `Figure from ${work.title}.`,
      caption: caption || null,
      sourceUrl: `https://arxiv.org/abs/${identifier}`,
      sourceLabel: "Preprint figure",
      method: "ar5iv",
      fit: "contain",
      position: "center",
    };
  }
  throw new Error("No raster or SVG figure found in ar5iv HTML");
}

function markdownValue(value) {
  return JSON.stringify(value ?? null);
}

function generatedMarkdown(figures, missing, generatedAt) {
  const lines = [
    "---",
    `generatedAt: ${markdownValue(generatedAt)}`,
    "figures:",
  ];
  for (const figure of figures) {
    lines.push(
      `  - title: ${markdownValue(figure.title)}`,
      `    normalizedTitle: ${markdownValue(figure.normalizedTitle)}`,
      `    src: ${markdownValue(figure.src)}`,
      `    alt: ${markdownValue(figure.alt)}`,
      `    caption: ${markdownValue(figure.caption)}`,
      `    sourceUrl: ${markdownValue(figure.sourceUrl)}`,
      `    sourceLabel: ${markdownValue(figure.sourceLabel)}`,
      `    method: ${markdownValue(figure.method)}`,
      `    fit: ${markdownValue(figure.fit)}`,
      `    position: ${markdownValue(figure.position)}`,
    );
  }
  lines.push("missing:");
  for (const work of missing) {
    lines.push(
      `  - title: ${markdownValue(work.title)}`,
      `    normalizedTitle: ${markdownValue(work.normalizedTitle)}`,
    );
  }
  lines.push("---", "", "Publication figures are generated from open preprints and curated author assets.", "");
  return lines.join("\n");
}

await mkdir(publicDirectory, { recursive: true });
await mkdir(path.dirname(outputPath), { recursive: true });
await mkdir(path.dirname(generatedMarkdownPath), { recursive: true });

const figures = [];
const missing = [];
for (const work of works) {
  const override = overrideByTitle.get(work.normalizedTitle);
  try {
    if (override) {
      figures.push(await saveOverride(work, override));
      console.log(`Curated: ${work.title}`);
      continue;
    }
    const identifier = arxivIdentifier(work);
    if (identifier) {
      figures.push(await fetchArxivFigure(work, identifier));
      console.log(`arXiv: ${work.title}`);
      continue;
    }
    missing.push(work);
    console.warn(`Missing: ${work.title}`);
  } catch (error) {
    missing.push(work);
    console.warn(`Missing: ${work.title} (${error.message})`);
  }
}

const generatedAt = new Date().toISOString();
await writeFile(
  outputPath,
  `${JSON.stringify({ generatedAt, count: figures.length, missingCount: missing.length, figures }, null, 2)}\n`,
);
await writeFile(generatedMarkdownPath, generatedMarkdown(figures, missing, generatedAt));
console.log(`Publication figures: ${figures.length}/${works.length}; missing ${missing.length}.`);
