import { expect, test } from "@playwright/test";

// baseURL is the game's folder (/zachranari/, as on GitHub Pages): paths stay relative.

test("installable: manifest, icons and a service worker", async ({
  page,
  request,
}) => {
  await page.goto("./");
  const manifest = await (await request.get("manifest.webmanifest")).json();
  expect(manifest.name).toBe("Záchranáři");
  expect(manifest.display).toBe("fullscreen");
  for (const icon of manifest.icons as { src: string }[])
    expect((await request.get(icon.src)).ok()).toBe(true);
  const scope = await page.evaluate(
    async () => (await navigator.serviceWorker.ready).scope,
  );
  expect(new URL(scope).pathname).toBe("/zachranari/");
  // Development hooks are not in the production build.
  expect(await page.evaluate(() => "__game" in window)).toBe(false);
});

test("loads everything from its folder", async ({ page }) => {
  const bad: string[] = [];
  page.on("response", (r) => {
    if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`);
  });
  page.on("request", (r) => {
    // Phaser turns SVGs into blob: images; only network requests must stay in the folder.
    const url = new URL(r.url());
    if (
      url.protocol.startsWith("http") &&
      !url.pathname.startsWith("/zachranari/")
    )
      bad.push(`outside: ${r.url()}`);
  });
  page.on("pageerror", (e) => bad.push(e.message));
  await page.goto("./");
  await expect(page.locator("#app canvas")).toBeVisible();
  await page.waitForTimeout(1500);
  expect(bad).toEqual([]);
});

test("starts offline once it has been opened", async ({ page, context }) => {
  await page.goto("./");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // The worker takes over open pages after activation; reload once under its control.
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);

  await context.setOffline(true);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("requestfailed", (r) =>
    errors.push(`${r.url()} ${r.failure()?.errorText ?? ""}`),
  );
  await page.reload();
  await expect(page.locator("#app canvas")).toBeVisible();
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
  await context.setOffline(false);
});
