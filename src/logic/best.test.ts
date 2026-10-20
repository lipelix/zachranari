import { describe, expect, it } from "vitest";
import { readBest, recordBest } from "./best";

const memory = (initial?: string) => {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set("zachranari.best.v1", initial);
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
};

describe("best", () => {
  it("records only improvements, per vehicle", () => {
    const s = memory();
    expect(recordBest(s, "police", 120)).toBe(true);
    expect(recordBest(s, "police", 80)).toBe(false);
    expect(recordBest(s, "police", 120)).toBe(false);
    expect(recordBest(s, "fire", 10)).toBe(true);
    expect(readBest(s)).toEqual({ police: 120, fire: 10 });
  });

  it("survives broken storage", () => {
    expect(readBest(memory("{nope"))).toEqual({});
    expect(readBest(memory("[1,2]"))).toEqual({});
    expect(readBest(memory('{"fire":"x","police":5}'))).toEqual({ police: 5 });
  });
});
