/**
 * One ride, as plain numbers. The car always drives forward on its own; the tank empties
 * a little faster the further it gets, so every ride ends by rolling to a gentle stop.
 * Nothing can crash or be lost: picking things up only adds fuel and points.
 */

export const TUNING = {
  /** Metres per second at the start and the cap later on. */
  startSpeed: 9,
  topSpeed: 15,
  /** The siren's push: cruise speed is this many times higher while it sounds. */
  boost: 1.4,
  /** Extra m/s gained per metre driven. */
  speedGrowth: 0.004,
  /** How fast the car reaches its target speed (m/s²) and stops with an empty tank. */
  accel: 6,
  brake: 3.5,
  /** Share of the tank used per second at the start; grows with distance. */
  drain: 1 / 32,
  drainDoublesAfter: 1600,
  /** Share of the tank one canister fills. */
  canister: 0.34,
  /** Points: one per metre, plus these. */
  treatPoints: 10,
  milestonePoints: 50,
  /** A milestone (a station along the road) every this many metres. */
  milestoneEvery: 250,
} as const;

export interface RunState {
  /** Metres driven. */
  distance: number;
  /** m/s. */
  speed: number;
  /** 0 – 1. */
  fuel: number;
  /** Points from pickups and milestones (distance points are added in `score`). */
  bonus: number;
  treats: number;
  milestones: number;
  /** The tank ran dry and the car has stopped. */
  finished: boolean;
}

export type RunEvent = "milestone" | "low-fuel" | "empty" | "stopped";

export const newRun = (): RunState => ({
  distance: 0,
  speed: 0,
  fuel: 1,
  bonus: 0,
  treats: 0,
  milestones: 0,
  finished: false,
});

export const score = (s: RunState): number => Math.floor(s.distance) + s.bonus;

/** Target cruising speed for a distance. */
export const cruise = (distance: number): number =>
  Math.min(TUNING.topSpeed, TUNING.startSpeed + distance * TUNING.speedGrowth);

/** Tank share used per second at a distance. */
export const drainAt = (distance: number): number =>
  TUNING.drain * (1 + distance / TUNING.drainDoublesAfter);

const LOW_FUEL = 0.25;

/** Advances the ride by `dt` seconds (faster while `boost`, the siren, is on). */
export function step(
  s: RunState,
  dt: number,
  boost = false,
): { state: RunState; events: RunEvent[] } {
  if (s.finished || dt <= 0) return { state: s, events: [] };
  const events: RunEvent[] = [];
  const next = { ...s };

  if (s.fuel > 0) {
    next.fuel = Math.max(0, s.fuel - drainAt(s.distance) * dt);
    const target = cruise(s.distance) * (boost ? TUNING.boost : 1);
    next.speed =
      s.speed < target
        ? Math.min(target, s.speed + TUNING.accel * dt)
        : Math.max(target, s.speed - TUNING.accel * dt);
    if (s.fuel >= LOW_FUEL && next.fuel < LOW_FUEL) events.push("low-fuel");
    if (next.fuel === 0) events.push("empty");
  } else {
    next.speed = Math.max(0, s.speed - TUNING.brake * dt);
  }

  next.distance = s.distance + ((s.speed + next.speed) / 2) * dt;

  const reached = Math.floor(next.distance / TUNING.milestoneEvery);
  if (reached > s.milestones) {
    next.milestones = reached;
    next.bonus += TUNING.milestonePoints * (reached - s.milestones);
    events.push("milestone");
  }

  if (next.fuel === 0 && next.speed === 0) {
    next.finished = true;
    events.push("stopped");
  }
  return { state: next, events };
}

/** A treat (heart, badge or water drop) was picked up. */
export const collectTreat = (s: RunState): RunState => ({
  ...s,
  treats: s.treats + 1,
  bonus: s.bonus + TUNING.treatPoints,
});

/** A canister was picked up. An empty tank that is still rolling starts again. */
export const collectFuel = (s: RunState): RunState =>
  s.finished ? s : { ...s, fuel: Math.min(1, s.fuel + TUNING.canister) };
