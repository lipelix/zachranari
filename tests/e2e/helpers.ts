import { expect, type Page } from "@playwright/test";

/** The running scenes, top last. */
export const activeScenes = (page: Page): Promise<string[]> =>
  page.evaluate(() =>
    // The game starts once the font is loaded: nothing runs before that.
    "__game" in window
      ? window.__game.scene.getScenes(true).map((s) => s.scene.key)
      : [],
  );

export async function waitForScene(page: Page, key: string): Promise<void> {
  await expect
    .poll(() => activeScenes(page), { timeout: 10_000 })
    .toContain(key);
}

/** CSS position of a named top-level object of a scene (view units → page px). */
export async function positionOf(
  page: Page,
  scene: string,
  name: string,
): Promise<{ x: number; y: number }> {
  return page.evaluate(
    ([sceneKey, objectName]) => {
      const s = window.__game.scene.getScene(sceneKey);
      if (!s) throw new Error(`No scene ${sceneKey}`);
      const o = s.children.getByName(objectName) as unknown as {
        x: number;
        y: number;
      } | null;
      if (!o) throw new Error(`No ${objectName} in ${sceneKey}`);
      const cam = s.cameras.main;
      const ratio = window.__game.scale.width / window.innerWidth;
      return { x: (o.x * cam.zoom) / ratio, y: (o.y * cam.zoom) / ratio };
    },
    [scene, name] as const,
  );
}

export async function tapObject(
  page: Page,
  scene: string,
  name: string,
): Promise<void> {
  const { x, y } = await positionOf(page, scene, name);
  await page.mouse.click(x, y);
}

export interface Ride {
  distance: number;
  speed: number;
  fuel: number;
  bonus: number;
  treats: number;
  finished: boolean;
}

export const ride = (page: Page): Promise<Ride> =>
  page.evaluate(() => {
    const race = window.__game.scene.getScene("race") as unknown as {
      state: Ride;
    };
    return race.state;
  });

/** Empties the tank so the ride ends within a few seconds. */
export const drainTank = (page: Page): Promise<void> =>
  page.evaluate(() => {
    const race = window.__game.scene.getScene("race") as unknown as {
      run: Ride;
    };
    race.run = { ...race.run, fuel: 0.005 };
  });

export async function openGarage(page: Page): Promise<void> {
  await page.goto("/");
  await waitForScene(page, "garage");
  // Cards pop in one after another.
  await page.waitForTimeout(800);
}
