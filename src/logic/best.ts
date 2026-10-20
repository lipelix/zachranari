/** Best score per vehicle, kept in the browser. The storage is passed in for tests. */
export type Best = Record<string, number>;

const KEY = "zachranari.best.v1";

export function readBest(storage: Pick<Storage, "getItem">): Best {
  try {
    const raw: unknown = JSON.parse(storage.getItem(KEY) ?? "{}");
    if (typeof raw !== "object" || raw === null || Array.isArray(raw))
      return {};
    return Object.fromEntries(
      Object.entries(raw).filter(
        (e): e is [string, number] =>
          typeof e[1] === "number" && Number.isFinite(e[1]) && e[1] >= 0,
      ),
    );
  } catch {
    return {};
  }
}

/** Saves `points` when it beats the vehicle's best; tells whether it did. */
export function recordBest(
  storage: Pick<Storage, "getItem" | "setItem">,
  vehicle: string,
  points: number,
): boolean {
  const best = readBest(storage);
  if (points <= (best[vehicle] ?? 0)) return false;
  best[vehicle] = points;
  try {
    storage.setItem(KEY, JSON.stringify(best));
  } catch {
    // Private mode or a full disk: the ride still counts on screen.
  }
  return true;
}
