import { describe, expect, it } from "vitest";
import { createSpawner, LEAD_IN } from "./spawner";

describe("spawner", () => {
  it("is the same road for the same seed", () => {
    expect(createSpawner(7).until(800)).toEqual(createSpawner(7).until(800));
    expect(createSpawner(7).until(800)).not.toEqual(
      createSpawner(8).until(800),
    );
  });

  it("hands every item out once, in order, after the lead-in", () => {
    const spawner = createSpawner(3);
    const items = [...spawner.until(300), ...spawner.until(600)];
    const at = items.map((i) => i.at);
    expect(at).toEqual([...at].sort((a, b) => a - b));
    expect(at[0]).toBeGreaterThanOrEqual(LEAD_IN);
    expect(spawner.until(300)).toEqual([]);
  });

  it("brings canisters at a steady rhythm, first on the road, then alternating", () => {
    const fuel = createSpawner(11)
      .until(2000)
      .filter((i) => i.kind === "fuel");
    expect(fuel[0]?.air).toBe(false);
    fuel.forEach((f, i) => expect(f.air).toBe(i % 2 === 1));
    for (let i = 1; i < fuel.length; i++) {
      const gap = (fuel[i]?.at ?? 0) - (fuel[i - 1]?.at ?? 0);
      expect(gap).toBeGreaterThan(90);
      expect(gap).toBeLessThan(160);
    }
  });

  it("mixes treats on the road and in the air", () => {
    const treats = createSpawner(5)
      .until(1000)
      .filter((i) => i.kind === "treat");
    expect(treats.some((t) => t.air)).toBe(true);
    expect(treats.some((t) => !t.air)).toBe(true);
  });
});
