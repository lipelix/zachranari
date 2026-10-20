import * as Phaser from "phaser";
import { TILE } from "./textures";
import type { View } from "./view";

export const DEPTH = {
  sky: 0,
  sun: 1,
  clouds: 2,
  hills: 3,
  props: 4,
  station: 5,
  road: 6,
  items: 7,
  car: 8,
  fx: 9,
} as const;

const PROPS = ["house-a", "tree", "house-b", "pine", "tree", "house-c", "pine"];
const PROP_HEIGHT: Record<string, number> = { tree: 210, pine: 230 };

/** How fast each layer moves compared with the road. */
const PARALLAX = { clouds: 0.06, far: 0.15, near: 0.35, props: 0.85 } as const;

/**
 * Sky, sun, clouds, two hill bands, roadside houses and trees, the road and the meadow.
 * `advance(px)` moves everything by what the road moved; `layout` places it all for a
 * view and returns the road line the tyres touch.
 */
export class Backdrop {
  groundY = 0;
  private readonly sky: Phaser.GameObjects.Graphics;
  private readonly sun: Phaser.GameObjects.Container;
  private readonly clouds: Phaser.GameObjects.Image[] = [];
  private readonly far: Phaser.GameObjects.TileSprite;
  private readonly near: Phaser.GameObjects.TileSprite;
  private readonly road: Phaser.GameObjects.TileSprite;
  private readonly grass: Phaser.GameObjects.TileSprite;
  private readonly meadow: Phaser.GameObjects.Rectangle;
  private props: Phaser.GameObjects.Image[] = [];
  private nextProp = 0;
  private view: View = { width: 1000, height: 720, zoom: 1 };

  constructor(private readonly scene: Phaser.Scene) {
    this.sky = scene.add.graphics().setDepth(DEPTH.sky);

    const rays = scene.add.graphics();
    rays.fillStyle(0xfde047, 0.55);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      rays.fillTriangle(
        Math.cos(a - 0.12) * 70,
        Math.sin(a - 0.12) * 70,
        Math.cos(a + 0.12) * 70,
        Math.sin(a + 0.12) * 70,
        Math.cos(a) * 112,
        Math.sin(a) * 112,
      );
    }
    const disc = scene.add
      .circle(0, 0, 62, 0xfacc15)
      .setStrokeStyle(6, 0xf59e0b);
    this.sun = scene.add.container(0, 0, [rays, disc]).setDepth(DEPTH.sun);
    scene.tweens.add({
      targets: rays,
      angle: 360,
      duration: 40_000,
      repeat: -1,
    });

    for (let i = 0; i < 5; i++)
      this.clouds.push(
        scene.add
          .image(0, 0, "cloud")
          .setDepth(DEPTH.clouds)
          .setScale(Phaser.Math.FloatBetween(0.25, 0.42)),
      );

    this.far = scene.add
      .tileSprite(0, 0, 10, 300, "hills-far")
      .setOrigin(0, 1)
      .setDepth(DEPTH.hills);
    this.near = scene.add
      .tileSprite(0, 0, 10, 240, "hills-near")
      .setOrigin(0, 1)
      .setDepth(DEPTH.hills);
    this.road = scene.add
      .tileSprite(0, 0, 10, 150, "road")
      .setOrigin(0, 0)
      .setDepth(DEPTH.road);
    this.grass = scene.add
      .tileSprite(0, 0, 10, 120, "grass")
      .setOrigin(0, 0)
      .setDepth(DEPTH.road);
    this.meadow = scene.add
      .rectangle(0, 0, 10, 10, 0x84cc16)
      .setOrigin(0, 0)
      .setDepth(DEPTH.road);
  }

  /** Where the road's top edge is for a ground line (houses stand on it). */
  get roadTop(): number {
    return this.groundY - 100;
  }

  layout(view: View): number {
    const first = this.view.width === 1000 && this.props.length === 0;
    this.view = view;
    const { width: w, height: h } = view;
    this.groundY = h - 150;
    const top = this.roadTop;

    this.sky.clear();
    this.sky.fillGradientStyle(0x38a6f5, 0x38a6f5, 0xd4f0ff, 0xd4f0ff, 1);
    this.sky.fillRect(0, 0, w, top + 20);
    this.sun.setPosition(w - 150, Math.max(120, top * 0.22));

    this.clouds.forEach((c, i) => {
      if (first || c.x === 0) c.x = ((i + 0.5) / this.clouds.length) * w;
      c.y = 70 + ((i * 97) % Math.max(60, top - 330));
    });

    this.far.setPosition(0, top - 40).setSize(w, 300);
    this.near.setPosition(0, top + 10).setSize(w, 240);
    this.road.setPosition(0, top).setSize(w, 150);
    this.grass.setPosition(0, top + 150).setSize(w, 120);
    this.meadow
      .setPosition(0, top + 270)
      .setSize(w, Math.max(0, h - top - 270));

    for (const p of this.props) p.y = top + 6;
    if (this.props.length === 0) {
      let x = Phaser.Math.Between(40, 200);
      while (x < w + 400) {
        this.addProp(x);
        x += Phaser.Math.Between(170, 360);
      }
    }
    return this.groundY;
  }

  private addProp(x: number): void {
    const key = PROPS[this.nextProp++ % PROPS.length] ?? "tree";
    const img = this.scene.add
      .image(x, this.roadTop + 6, key)
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.props);
    img.setScale((PROP_HEIGHT[key] ?? 170) / img.height);
    this.props.push(img);
  }

  /** Moves every layer by `px` of road and lets the clouds drift by `dt` seconds. */
  advance(px: number, dt: number): void {
    const w = this.view.width;
    for (const c of this.clouds) {
      c.x -= px * PARALLAX.clouds + 8 * dt;
      if (c.x < -c.displayWidth)
        c.x = w + c.displayWidth * Phaser.Math.FloatBetween(0.5, 1.5);
    }
    this.far.tilePositionX =
      (this.far.tilePositionX + px * PARALLAX.far) % TILE;
    this.near.tilePositionX =
      (this.near.tilePositionX + px * PARALLAX.near) % TILE;
    this.road.tilePositionX = (this.road.tilePositionX + px) % 512;
    this.grass.tilePositionX = (this.grass.tilePositionX + px) % 512;

    for (const p of this.props) p.x -= px * PARALLAX.props;
    const gone = this.props.filter((p) => p.x < -p.displayWidth);
    gone.forEach((p) => p.destroy());
    if (gone.length) this.props = this.props.filter((p) => p.active);
    const last = this.props.at(-1);
    if (!last || last.x < w + 200)
      this.addProp((last?.x ?? w) + Phaser.Math.Between(170, 360));
  }

  /** The roadside layer's speed, for things that stand among the houses. */
  static readonly propsParallax = PARALLAX.props;
}
