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
      "/",
      "/assets/fire-1.svg",
      "/assets/index-abc.js",
      "/icons/icon-192.png",
      "/index.html",
      "/manifest.webmanifest",
    ]);
  });

  it("names the cache per release and inlines it into a valid script", () => {
    const name = cacheName("0.1.0", "abc1234");
    expect(name).toBe("zachranari-0.1.0-abc1234");
    const source = serviceWorkerSource(name, ["/", "/index.html"]);
    expect(source).toContain('const CACHE = "zachranari-0.1.0-abc1234"');
    expect(() => new Function(source)).not.toThrow();
  });
});
