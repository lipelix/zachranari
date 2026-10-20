import * as Phaser from "phaser";
import cloudUrl from "../../art/cloud.svg?url";
import flagUrl from "../../art/flag.svg?url";
import fuelUrl from "../../art/fuel.svg?url";
import handUrl from "../../art/hand.svg?url";
import houseAUrl from "../../art/house-a.svg?url";
import houseBUrl from "../../art/house-b.svg?url";
import houseCUrl from "../../art/house-c.svg?url";
import pineUrl from "../../art/pine.svg?url";
import treeUrl from "../../art/tree.svg?url";
import wheelUrl from "../../art/wheel.svg?url";
import { TEX } from "../car";
import { makeTextures } from "../textures";
import { VEHICLES } from "../vehicles";

const ART: Record<string, string> = {
  cloud: cloudUrl,
  flag: flagUrl,
  fuel: fuelUrl,
  hand: handUrl,
  "house-a": houseAUrl,
  "house-b": houseBUrl,
  "house-c": houseCUrl,
  pine: pineUrl,
  tree: treeUrl,
  wheel: wheelUrl,
};

/** Loads the art (SVG rasterised at TEX px per unit) and draws the generated textures. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload(): void {
    const svg = (key: string, url: string) =>
      this.load.svg(key, url, { scale: TEX });
    for (const [key, url] of Object.entries(ART)) svg(key, url);
    for (const v of VEHICLES) {
      svg(v.id, v.url);
      svg(v.treat.key, v.treat.url);
      svg(v.station.key, v.station.url);
    }
  }

  create(): void {
    makeTextures(this);
    this.scene.start("garage");
  }
}
