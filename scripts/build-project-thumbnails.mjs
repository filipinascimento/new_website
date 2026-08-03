import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const root = process.cwd();
const outputDirectory = path.join(root, "public/figures/projects/normalized");
const canvas = { width: 720, height: 480 };

const figures = [
  {
    source: "public/figures/publications/from-node2vec-to-gpt-based-graphrag-scientific-impact-prediction-across-grap.png",
    output: "agentic-scientific-design.png",
    whiteSurface: true,
    scale: 1,
  },
  {
    source: "public/figures/publications/linking-global-science-funding-to-research-publications.png",
    output: "science-funding.png",
    whiteSurface: true,
    scale: 0.96,
  },
  {
    source: "public/figures/projects/technology-capability-map.png",
    output: "technology-capability-map.png",
    whiteSurface: true,
    scale: 1,
  },
  {
    source: "public/software-icons/helios-web-mark.svg",
    output: "helios-web.png",
    whiteSurface: false,
    scale: 0.72,
  },
];

await mkdir(outputDirectory, { recursive: true });

for (const figure of figures) {
  const input = sharp(path.join(root, figure.source), { density: 240 });
  if (figure.whiteSurface) input.flatten({ background: "#ffffff" });

  const trimmed = await input
    .trim({
      background: figure.whiteSurface ? "#ffffff" : { r: 0, g: 0, b: 0, alpha: 0 },
      threshold: 12,
    })
    .png()
    .toBuffer();

  const resized = await sharp(trimmed)
    .resize({
      width: Math.round(672 * figure.scale),
      height: Math.round(432 * figure.scale),
      fit: "inside",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: canvas.width,
      height: canvas.height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  })
    .composite([{ input: resized, gravity: "center" }])
    .png()
    .toFile(path.join(outputDirectory, figure.output));
}

console.log(`Project figures: normalized ${figures.length} featured assets.`);
