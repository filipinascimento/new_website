import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDist = path.join(root, "node_modules", "helios-web", "dist");
const networkDist = path.join(root, "node_modules", "helios-network", "dist");
const vendorDir = path.join(root, "public", "vendor");
const assetDir = path.join(vendorDir, "assets");

await mkdir(assetDir, { recursive: true });

const source = await readFile(path.join(webDist, "helios-web.es.js"), "utf8");
const workerNames = [...source.matchAll(/"\/assets\/([^"?]+Worker[^"?]+\.js)"/g)]
  .map((match) => match[1]);

if (workerNames.length === 0) {
  throw new Error("No Helios Web worker assets were discovered; inspect the installed package layout.");
}

const browserBundle = source
  .replace('from "helios-network";', 'from "./helios-network.inline.js";')
  .replaceAll('"/assets/', '"./assets/');

await writeFile(path.join(vendorDir, "helios-web.es.js"), browserBundle);
await copyFile(
  path.join(networkDist, "helios-network.inline.js"),
  path.join(vendorDir, "helios-network.inline.js"),
);

await Promise.all(workerNames.map((name) => copyFile(
  path.join(webDist, "assets", name),
  path.join(assetDir, name),
)));

console.log(`Helios: vendored browser bundles and ${workerNames.length} worker assets.`);
