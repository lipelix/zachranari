import { expect, test } from "@playwright/test";
import {
  activeScenes,
  drainTank,
  openGarage,
  positionOf,
  ride,
  tapObject,
  waitForScene,
} from "./helpers";

test("the garage offers the three services", async ({ page }) => {
  await openGarage(page);
  for (const id of ["ambulance", "police", "fire"]) {
    const { x, y } = await positionOf(page, "garage", `card-${id}`);
    const box = page.viewportSize();
    expect(x).toBeGreaterThan(0);
    expect(y).toBeGreaterThan(0);
    expect(x).toBeLessThan(box?.width ?? 0);
    expect(y).toBeLessThan(box?.height ?? 0);
  }
});

test("one tap picks a car, it drives on its own and a tap jumps", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openGarage(page);
  await tapObject(page, "garage", "card-fire");
  await waitForScene(page, "race");
  await waitForScene(page, "hud");

  // Software WebGL on CI runs at few frames a second: wait for the distance, not a time.
  const start = await ride(page);
  await expect
    .poll(async () => (await ride(page)).distance, { timeout: 15_000 })
    .toBeGreaterThan(start.distance + 5);
  expect((await ride(page)).fuel).toBeLessThan(1);

  // A tap on the road (not on a button) jumps.
  const size = page.viewportSize();
  await page.mouse.click((size?.width ?? 0) / 2, (size?.height ?? 0) / 2);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window.__game.scene.getScene("race") as unknown as {
              height: number;
            }
          ).height,
      ),
    )
    .toBeGreaterThan(20);
  expect(errors).toEqual([]);
});

test("the siren lights up and pushes the car forward", async ({ page }) => {
  await openGarage(page);
  await tapObject(page, "garage", "card-police");
  await waitForScene(page, "hud");
  await page.waitForTimeout(2500);
  const before = (await ride(page)).speed;
  await tapObject(page, "hud", "siren");
  await expect
    .poll(async () => (await ride(page)).speed, { timeout: 5000 })
    .toBeGreaterThan(before * 1.2);
  // While it cools down, another press does nothing. Checked in one step: on a slow
  // runner the cooldown could run out between two separate calls.
  const again = await page.evaluate(() => {
    const race = window.__game.scene.getScene("race") as unknown as {
      snapshot: () => { sirenReady: number };
      sirenNow: () => boolean;
    };
    return { ready: race.snapshot().sirenReady, accepted: race.sirenNow() };
  });
  expect(again.ready).toBeLessThan(1);
  expect(again.accepted).toBe(false);
});

test("an empty tank ends in a celebration, then ride again or pick another car", async ({
  page,
}) => {
  await openGarage(page);
  await tapObject(page, "garage", "card-ambulance");
  await waitForScene(page, "hud");
  await page.waitForTimeout(1500);
  await drainTank(page);
  await waitForScene(page, "end");
  expect(await activeScenes(page)).not.toContain("hud");
  const done = await ride(page);
  expect(done.finished).toBe(true);

  // A best score is kept for the garage.
  const best = await page.evaluate(() =>
    localStorage.getItem("zachranari.best.v1"),
  );
  expect(JSON.parse(best ?? "{}")).toHaveProperty("ambulance");

  // Buttons appear after a pause, so frantic taps do not skip the celebration.
  await page.waitForTimeout(1800);
  await tapObject(page, "end", "again");
  await waitForScene(page, "hud");
  expect(await activeScenes(page)).not.toContain("end");
  expect((await ride(page)).distance).toBeLessThan(done.distance);

  await drainTank(page);
  await waitForScene(page, "end");
  await page.waitForTimeout(1800);
  await tapObject(page, "end", "garage");
  await waitForScene(page, "garage");
  expect(await activeScenes(page)).toEqual(["garage"]);
});

test("home leaves the ride only when held", async ({ page }) => {
  await openGarage(page);
  await tapObject(page, "garage", "card-police");
  await waitForScene(page, "hud");
  await page.waitForTimeout(800);

  await tapObject(page, "hud", "home");
  await page.waitForTimeout(1200);
  expect(await activeScenes(page)).toContain("race");

  const { x, y } = await positionOf(page, "hud", "home");
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(1300);
  await page.mouse.up();
  await waitForScene(page, "garage");
  expect(await activeScenes(page)).toEqual(["garage"]);
});

test("picking things up keeps the ride going (sound, buzz and speech never stop it)", async ({
  page,
}) => {
  // Under parallel load software WebGL runs at a few frames a second: 80 m takes a while.
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openGarage(page);
  await tapObject(page, "garage", "card-ambulance");
  await waitForScene(page, "hud");
  // The first canister lies on the road somewhere in 70–110 m: driving takes it
  // (without it the tank would be below 0.6 at 120 m).
  await expect
    .poll(async () => (await ride(page)).distance, { timeout: 90_000 })
    .toBeGreaterThan(120);
  const taken = await ride(page);
  expect(taken.fuel).toBeGreaterThan(0.75);
  await expect
    .poll(async () => (await ride(page)).distance, { timeout: 10_000 })
    .toBeGreaterThan(taken.distance + 5);
  expect(errors).toEqual([]);
});
