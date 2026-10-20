import * as Phaser from "phaser";
import type { Vehicle } from "./vehicles";

/** SVGs are rasterised at this many texture px per SVG unit, so they stay sharp zoomed in. */
export const TEX = 2;
/** View units per SVG unit: the ambulance is 340 view units long. */
export const CAR_UNIT = 340 / 420;

/**
 * A vehicle as a container whose origin is where the tyres touch the road, in the middle
 * of its length: wheels that roll, and blue beacons that flash (brighter with the siren).
 */
export class Car extends Phaser.GameObjects.Container {
  readonly shell: Phaser.GameObjects.Image;
  private readonly wheels: Phaser.GameObjects.Image[];
  private readonly beacons: Phaser.GameObjects.Image[];
  private flashClock = 0;
  private sirenLeft = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly vehicle: Vehicle,
  ) {
    super(scene, x, y);
    const { width, height } = vehicle.viewBox;
    this.shell = scene.add
      .image(0, 0, vehicle.id)
      .setOrigin(0.5, vehicle.ground / height)
      .setScale(1 / TEX);
    this.wheels = vehicle.wheels.map((w) =>
      scene.add
        .image(w.x - width / 2, w.y - vehicle.ground, "wheel")
        .setScale(((w.r / 31) * (68 / 2 / 34)) / TEX),
    );
    this.beacons = vehicle.beacons.map((b) =>
      scene.add
        .image(b.x - width / 2, b.y - vehicle.ground, "glow")
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.6)
        .setAlpha(0),
    );
    this.add([...this.wheels, this.shell, ...this.beacons]);
    this.setScale(CAR_UNIT);
    scene.add.existing(this);
  }

  /** Length in view units. */
  get span(): number {
    return this.vehicle.viewBox.width * this.scaleX;
  }

  /** Roll the wheels for `px` view units of road. */
  roll(px: number): void {
    const r = (this.vehicle.wheels[0]?.r ?? 30) * this.scaleX;
    for (const w of this.wheels) w.rotation += px / r;
  }

  siren(seconds: number): void {
    this.sirenLeft = seconds;
  }

  get sirenOn(): boolean {
    return this.sirenLeft > 0;
  }

  /** Beacons blink in turn: softly always, big and bright while the siren sounds. */
  tick(dt: number): void {
    this.flashClock += dt;
    this.sirenLeft = Math.max(0, this.sirenLeft - dt);
    const loud = this.sirenLeft > 0;
    const period = loud ? 0.18 : 0.5;
    const phase = Math.floor(this.flashClock / period) % 2;
    this.beacons.forEach((b, i) => {
      const on = i % 2 === phase;
      b.setAlpha(on ? (loud ? 1 : 0.55) : 0.05);
      b.setScale(on && loud ? 1.15 : 0.6);
    });
  }
}
