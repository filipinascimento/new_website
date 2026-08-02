import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import matter from "gray-matter";
import { marked } from "marked";

const root = process.cwd();
const contentRoot = path.join(root, "content");
const collections = ["site", "projects", "software", "teaching", "cv", "posts"];
const scholarProfile = JSON.parse(
  await readFile(path.join(root, "data/scholar/profile.json"), "utf8"),
);
const templateValues = {
  scholarPublications: scholarProfile.publicationsDisplay,
  scholarCitations: scholarProfile.citations.toLocaleString("en-US"),
  scholarHIndex: scholarProfile.hIndex.toLocaleString("en-US"),
};
marked.use({ gfm: true, breaks: false });

function applyTemplate(source) {
  return source.replace(/\{\{(scholarPublications|scholarCitations|scholarHIndex)\}\}/g, (_, key) => templateValues[key]);
}

function plainText(markdown = "") {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_>~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadCollection(collection) {
  const directory = path.join(contentRoot, collection);
  let entries = [];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }

  const records = [];
  for (const entry of entries) {
    if (!entry.isFile() || !/\.mdx?$/.test(entry.name) || entry.name === "README.md") continue;
    const filePath = path.join(directory, entry.name);
    const source = applyTemplate(await readFile(filePath, "utf8"));
    const parsed = matter(source);
    const slug = parsed.data.slug || entry.name.replace(/\.mdx?$/, "");
    records.push({
      slug,
      collection,
      ...parsed.data,
      markdown: parsed.content.trim(),
      html: await marked.parse(parsed.content),
      text: plainText(parsed.content),
    });
  }
  return records.sort((a, b) => {
    const order = Number(a.order ?? 999) - Number(b.order ?? 999);
    if (order) return order;
    return String(b.year || b.date || "").localeCompare(String(a.year || a.date || ""));
  });
}

const output = {};
for (const collection of collections) output[collection] = await loadCollection(collection);

const outputDir = path.join(root, "data");
await mkdir(outputDir, { recursive: true });
await writeFile(
  path.join(outputDir, "content.json"),
  `${JSON.stringify(output, null, 2)}\n`,
);
console.log(
  `Content: ${collections.map((name) => `${name}=${output[name].length}`).join(", ")}.`,
);
