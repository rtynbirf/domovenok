// Генерация PWA-иконок из SVG-исходников: обычные, маскируемые и apple-touch.
// Запуск: bun scripts/make-icons.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const ICONS = path.join(here, "..", "public", "icons");

async function render(svgName, size, outFile) {
  const svg = path.join(ICONS, svgName);
  await sharp(svg, { density: 512 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(ICONS, outFile));
  console.log("✓", outFile, `${size}x${size}`);
}

await fs.promises.mkdir(ICONS, { recursive: true });
await render("icon-rounded.svg", 192, "icon-192.png");
await render("icon-rounded.svg", 512, "icon-512.png");
await render("icon-plain.svg", 512, "maskable-512.png");
await render("icon-plain.svg", 180, "apple-touch-icon.png");
console.log("Иконки готовы.");
