import { describe, expect, it } from "vitest";
import {
  collectFuel,
  collectTreat,
  cruise,
  newRun,
  score,
  step,
  TUNING,
  type RunEvent,
  type RunState,
} from "./run";

/** Drives at 60 fps until the ride ends (or `maxSeconds` pass), collecting the events. */
function drive(
  s: RunState,
  maxSeconds: number,
  each?: (s: RunState, t: number) => RunState,
) {
  const events: RunEvent[] = [];
  let t = 0;
  while (!s.finished && t < maxSeconds) {
    const r = step(s, 1 / 60);
    events.push(...r.events);
    t += 1 / 60;
    s = each ? each(r.state, t) : r.state;
  }
  return { state: s, events, seconds: t };
}

describe("run", () => {
  it("drives off on its own and speeds up to cruise", () => {
    const { state } = drive(newRun(), 3);
    expect(state.speed).toBeCloseTo(cruise(state.distance), 1);
    expect(state.distance).toBeGreaterThan(15);
  });

  it("ends with a gentle stop when nobody taps", () => {
    const { state, events, seconds } = drive(newRun(), 600);
    expect(state.finished).toBe(true);
    expect(state.speed).toBe(0);
    expect(events.filter((e) => e === "empty")).toHaveLength(1);
    expect(events.at(-1)).toBe("stopped");
    expect(events).toContain("low-fuel");
    // Long enough to enjoy, short enough for a three-year-old.
    expect(seconds).toBeGreaterThan(25);
    expect(seconds).toBeLessThan(60);
  });

  it("goes further with canisters, and further means more points", () => {
    const alone = drive(newRun(), 600).state;
    let next = 10;
    const fed = drive(newRun(), 900, (s, t) => {
      if (t < next) return s;
      next += 12;
      return collectFuel(s);
    }).state;
    expect(fed.finished).toBe(true);
    expect(fed.distance).toBeGreaterThan(alone.distance * 2);
    expect(score(fed)).toBeGreaterThan(score(alone));
  });

  it("scores a point a metre plus pickups and milestones", () => {
    let s: RunState = { ...newRun(), distance: 99.9 };
    s = collectTreat(collectTreat(s));
    expect(s.treats).toBe(2);
    expect(score(s)).toBe(99 + 2 * TUNING.treatPoints);
  });

  it("pays each milestone once", () => {
    const s: RunState = {
      ...newRun(),
      distance: TUNING.milestoneEvery - 0.01,
      speed: 10,
    };
    const first = step(s, 0.1);
    expect(first.events).toContain("milestone");
    expect(first.state.bonus).toBe(TUNING.milestonePoints);
    const again = step(first.state, 0.1);
    expect(again.events).not.toContain("milestone");
  });

  it("caps the tank and ignores pickups after the stop", () => {
    expect(collectFuel(newRun()).fuel).toBe(1);
    const done = drive(newRun(), 600).state;
    expect(collectFuel(done)).toBe(done);
  });

  it("drives faster with the siren and settles back after", () => {
    let s = drive(newRun(), 4).state;
    const cruising = s.speed;
    for (let i = 0; i < 120; i++) s = step(s, 1 / 60, true).state;
    expect(s.speed).toBeGreaterThan(cruising * 1.3);
    for (let i = 0; i < 120; i++) s = step(s, 1 / 60).state;
    expect(s.speed).toBeCloseTo(cruise(s.distance), 1);
  });

  it("restarts a rolling car with an empty tank", () => {
    const rolling: RunState = { ...newRun(), fuel: 0, speed: 5 };
    const r = step(collectFuel(rolling), 0.5);
    expect(r.state.speed).toBeGreaterThan(5);
    expect(r.state.finished).toBe(false);
  });
});
