import { expect, test } from "@playwright/test";

test("installable: manifest, icons and a service worker", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.name).toBe("Záchranáři");
  expect(manifest.display).toBe("fullscreen");
  for (const icon of manifest.icons as { src: string }[])
    expect((await request.get(icon.src)).ok()).toBe(true);
  const scope = await page.evaluate(
    async () => (await navigator.serviceWorker.ready).scope,
  );
  expect(scope).toMatch(/\/$/);
  // Development hooks are not in the production build.
  expect(await page.evaluate(() => "__game" in window)).toBe(false);
});

test("starts offline once it has been opened", async ({ page, context }) => {
  await page.goto("/");
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
