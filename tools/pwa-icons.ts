import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

/**
 * `npm run pwa:icons` rasterises `public/icons/icon.svg` to the committed PNGs with the
 * Playwright Chromium. `-- --check` renders in memory and fails when a committed PNG
 * differs. The maskable icon keeps the art inside the 80 % safe zone.
 */
const dir = join(import.meta.dirname, "../public/icons");
const check = process.argv.includes("--check");
const svg = readFileSync(join(dir, "icon.svg"), "utf8");
const BACKGROUND = "#38a6f5";

const ICONS = [
  { file: "icon-192.png", size: 192, scale: 1 },
  { file: "icon-512.png", size: 512, scale: 1 },
  { file: "maskable-512.png", size: 512, scale: 0.8 },
  { file: "apple-touch-180.png", size: 180, scale: 1 },
] as const;

const page = (size: number, scale: number): string => {
  const inner = Math.round(size * scale);
  const offset = Math.round((size - inner) / 2);
  return `<!doctype html><html><body style="margin:0;background:${BACKGROUND}">
    <div style="width:${size}px;height:${size}px;position:relative;background:${BACKGROUND}">
      <div style="position:absolute;left:${offset}px;top:${offset}px;width:${inner}px;height:${inner}px">${svg.replace(
        /<svg /,
        `<svg style="width:100%;height:100%;display:block" `,
      )}</div>
    </div></body></html>`;
};

const browser = await chromium.launch();
let failed = false;
try {
  for (const icon of ICONS) {
    const context = await browser.newContext({
      viewport: { width: icon.size, height: icon.size },
      deviceScaleFactor: 1,
    });
    const tab = await context.newPage();
    await tab.setContent(page(icon.size, icon.scale));
    const png = await tab.screenshot({
      clip: { x: 0, y: 0, width: icon.size, height: icon.size },
      type: "png",
    });
    await context.close();
    const file = join(dir, icon.file);
    if (check) {
      if (!existsSync(file) || !readFileSync(file).equals(png)) {
        console.error(`DIFFERENT ${icon.file}`);
        failed = true;
      } else console.log(`ok        ${icon.file}`);
    } else {
      writeFileSync(file, png);
      console.log(`written   ${icon.file}`);
    }
  }
} finally {
  await browser.close();
}
if (failed) process.exit(1);
