import { describe, expect, it } from "vitest";
import { cacheName, precacheList, serviceWorkerSource } from "./sw-template";

describe("service worker", () => {
  it("precaches the page first, then the build and public files, without maps or itself", () => {
    expect(
      precacheList(
        [
          "assets/index-abc.js",
          "assets/index-abc.js.map",
          "assets/fire-1.svg",
          "sw.js",
        ],
        ["manifest.webmanifest", "icons/icon-192.png"],
      ),
    ).toEqual([
      "./",
      "./assets/fire-1.svg",
      "./assets/index-abc.js",
      "./icons/icon-192.png",
      "./index.html",
      "./manifest.webmanifest",
    ]);
  });

  it("uses only paths relative to the worker, so it works in a sub-folder", () => {
    const list = precacheList(["assets/a.js"], ["icons/x.png"]);
    for (const path of list) expect(path.startsWith("./")).toBe(true);
    const source = serviceWorkerSource("c", list);
    expect(source).not.toMatch(/["']\/(assets|index\.html|sw\.js)/);
  });

  it("names the cache per release and inlines it into a valid script", () => {
    const name = cacheName("0.1.0", "abc1234");
    expect(name).toBe("zachranari-0.1.0-abc1234");
    const source = serviceWorkerSource(name, ["./", "./index.html"]);
    expect(source).toContain('const CACHE = "zachranari-0.1.0-abc1234"');
    expect(() => new Function(source)).not.toThrow();
  });
});
