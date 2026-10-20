import { between, seededRandom } from "./rng";

export type ItemKind = "treat" | "fuel";

/** One thing on the road: where (metres) and whether it floats at jump height. */
export interface Spawn {
  kind: ItemKind;
  at: number;
  air: boolean;
}

/** The road before the first item: time to see the car drive off. */
export const LEAD_IN = 35;
/** Metres between items of one row. */
export const ROW_GAP = 2.2;

/**
 * Lays out the road ahead, one pattern at a time: rows of treats on the road (picked up
 * by just driving) or in the air (a tap to jump), and canisters at a steady rhythm,
 * alternating road and air, the first on the road so it is found without trying.
 */
export function createSpawner(seed: number): {
  until: (distance: number) => Spawn[];
} {
  const rnd = seededRandom(seed);
  let cursor = LEAD_IN;
  let nextFuel = 70;
  let fuelInAir = false;

  const pattern = (): Spawn[] => {
    if (cursor >= nextFuel) {
      const fuel: Spawn = { kind: "fuel", at: cursor, air: fuelInAir };
      fuelInAir = !fuelInAir;
      nextFuel = cursor + between(rnd, 95, 130);
      cursor += between(rnd, 14, 22);
      return [fuel];
    }
    const air = rnd() < 0.5;
    const count = 3 + Math.floor(rnd() * 3);
    const row = Array.from({ length: count }, (_, i): Spawn => ({
      kind: "treat",
      at: cursor + i * ROW_GAP,
      air,
    }));
    cursor += count * ROW_GAP + between(rnd, 12, 26);
    return row;
  };

  return {
    /** Everything placed before `distance` that was not handed out yet. */
    until(distance) {
      const out: Spawn[] = [];
      while (cursor < distance) out.push(...pattern());
      return out;
    },
  };
}
