import { execSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type Plugin } from "vite";
import { defineConfig } from "vitest/config";
import {
  cacheName,
  precacheList,
  serviceWorkerSource,
} from "./src/pwa/sw-template.ts";

const pkg: unknown = JSON.parse(readFileSync("package.json", "utf8"));
if (
  typeof pkg !== "object" ||
  pkg === null ||
  !("version" in pkg) ||
  typeof pkg.version !== "string"
)
  throw new Error("package.json has no version");

/** The commit this build is made from: GAME_COMMIT (Docker builds have no .git), else git. */
function gameCommit(): string {
  const fromEnv = process.env["GAME_COMMIT"];
  if (fromEnv) return fromEnv;
  try {
    return execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    throw new Error(
      "Cannot tell the commit: set GAME_COMMIT or build inside a git checkout",
    );
  }
}

/** Files under `public/` as URL paths relative to the root ("icons/icon-192.png"). */
function publicFiles(dir = "public", prefix = ""): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? publicFiles(join(dir, entry.name), `${prefix}${entry.name}/`)
      : [`${prefix}${entry.name}`],
  );
}

/** Emits `sw.js` with the precache list of this build. */
function serviceWorkerPlugin(version: string): Plugin {
  return {
    name: "zachranari-service-worker",
    apply: "build",
    generateBundle(_options, bundle) {
      const list = precacheList(Object.keys(bundle), publicFiles());
      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: serviceWorkerSource(cacheName(version, gameCommit()), list),
      });
    },
  };
}

export default defineConfig({
  plugins: [serviceWorkerPlugin(pkg.version)],
  // Relative URLs: one build serves from a host's root (Docker) or a sub-folder (Pages).
  base: "./",
  // SVG art stays as files: Phaser loads them by URL and the worker precaches them.
  build: {
    target: "es2023",
    chunkSizeWarningLimit: 2000,
    assetsInlineLimit: 0,
  },
  test: { include: ["src/**/*.test.ts"] },
});
