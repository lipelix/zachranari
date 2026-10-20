import { defineConfig, devices } from "@playwright/test";

// Headless Chromium draws WebGL in software: the specs run at 1x device pixels.
const oneX = { deviceScaleFactor: 1 };

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  use: { baseURL: "http://localhost:5173", trace: "retain-on-failure" },
  webServer: [
    {
      command: "npm run dev -- --port 5173 --strictPort",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env["CI"],
    },
    // The production build: the installable, offline game (service worker, no dev hooks).
    {
      command: "npm run build && npm run preview -- --port 4173 --strictPort",
      url: "http://localhost:4173",
      reuseExistingServer: !process.env["CI"],
      timeout: 180_000,
    },
  ],
  projects: [
    {
      name: "phone-landscape",
      testIgnore: /pwa\.spec\.ts/,
      use: { ...devices["Pixel 7 landscape"], ...oneX },
    },
    {
      name: "phone-portrait",
      testIgnore: /pwa\.spec\.ts/,
      use: { ...devices["Pixel 7"], ...oneX },
    },
    {
      name: "tablet",
      testIgnore: /pwa\.spec\.ts/,
      use: { ...devices["Galaxy Tab S9 landscape"], ...oneX },
    },
    {
      name: "pwa",
      testMatch: /pwa\.spec\.ts/,
      use: {
        ...devices["Pixel 7 landscape"],
        baseURL: "http://localhost:4173",
        serviceWorkers: "allow",
      },
    },
  ],
});
