import * as Phaser from "phaser";
import { buzz, say, siren, sfx } from "../../audio/sfx";
import { recordBest } from "../../logic/best";
import {
  collectFuel,
  collectTreat,
  newRun,
  score,
  step,
  TUNING,
  type RunState,
} from "../../logic/run";
import { createSpawner, type Spawn } from "../../logic/spawner";
import { Backdrop, DEPTH } from "../backdrop";
import { Car } from "../car";
import { confettiBurst } from "../ui";
import { vehicleById, type Vehicle } from "../vehicles";
import { fitCamera, label, type View } from "../view";

/** View units per metre. */
export const PPM = 34;
const JUMP_SPEED = 980;
const GRAVITY = 2100;
/** Item centres above the road: on the road, and at jump height. */
const ITEM_LOW = 62;
const ITEM_HIGH = 262;
/** A tap this long before landing still jumps when the tyres touch down. */
const JUMP_BUFFER = 0.18;
export const SIREN_SECONDS = 2;
export const SIREN_COOLDOWN = 4.5;
/** First rides show the tapping hand when things float above the road. */
let hintsLeft = 3;

interface Item {
  spawn: Spawn;
  img: Phaser.GameObjects.Image;
  taken: boolean;
}

export interface RaceSnapshot {
  score: number;
  fuel: number;
  sirenReady: number;
  finished: boolean;
}

/**
 * The ride. The car stays put on the left and the world rolls by; a tap anywhere jumps,
 * the siren button gives a short push. Everything here only ever helps: there is nothing
 * to crash into. When the tank is dry the car rolls to a stop and the end card opens.
 */
export class RaceScene extends Phaser.Scene {
  private vehicle!: Vehicle;
  private run!: RunState;
  private spawner!: ReturnType<typeof createSpawner>;
  private backdrop!: Backdrop;
  private car!: Car;
  private view!: View;
  private items: Item[] = [];
  private stations = new Map<
    number,
    {
      station: Phaser.GameObjects.Image;
      flag: Phaser.GameObjects.Image;
      sign: Phaser.GameObjects.Text;
    }
  >();
  private carX = 0;
  private height = 0;
  private vy = 0;
  private buffered = 0;
  private sirenCooldown = 0;
  private combo = 0;
  private comboTimer = 0;
  private hand?: Phaser.GameObjects.Image;
  private ended = false;

  constructor() {
    super("race");
  }

  init(data: { vehicle: string }): void {
    this.vehicle = vehicleById(data.vehicle);
    this.run = newRun();
    this.spawner = createSpawner(Date.now() % 100_000);
    this.items = [];
    this.stations = new Map();
    this.height = 0;
    this.vy = 0;
    this.buffered = 0;
    this.sirenCooldown = 0;
    this.combo = 0;
    this.ended = false;
    this.hand = undefined;
  }

  create(): void {
    this.backdrop = new Backdrop(this);
    this.car = new Car(this, 0, 0, this.vehicle).setDepth(DEPTH.car);
    this.layout();
    this.scale.on("resize", this.layout, this);
    this.events.once("shutdown", () => {
      this.scale.off("resize", this.layout, this);
      this.scene.stop("hud");
      this.scene.stop("end");
    });
    this.scene.launch("hud", { vehicle: this.vehicle.id });
    this.cameras.main.fadeIn(300, 255, 255, 255);
    // Leave with the lights on.
    this.car.siren(1);
  }

  private layout(): void {
    this.view = fitCamera(this);
    this.backdrop.layout(this.view);
    this.carX = Math.max(200, this.view.width * 0.26);
    this.car.x = this.carX;
  }

  get groundY(): number {
    return this.backdrop.groundY;
  }

  snapshot(): RaceSnapshot {
    return {
      score: score(this.run),
      fuel: this.run.fuel,
      sirenReady: 1 - this.sirenCooldown / SIREN_COOLDOWN,
      finished: this.run.finished,
    };
  }

  /** A tap: jump now, or right on landing when already in the air. */
  jump(): void {
    if (this.run.finished || this.ended) return;
    if (this.height > 0 || this.vy > 0) {
      this.buffered = JUMP_BUFFER;
      return;
    }
    this.vy = JUMP_SPEED;
    sfx.jump();
    this.tweens.add({
      targets: this.car,
      scaleY: this.car.scaleX * 1.08,
      duration: 90,
      yoyo: true,
    });
    if (this.hand) {
      hintsLeft = Math.max(0, hintsLeft - 1);
      this.hideHand();
    }
  }

  /** The siren button: lights, sound and a push forward. False while it cools down. */
  sirenNow(): boolean {
    if (this.run.finished || this.sirenCooldown > 0 || this.run.fuel === 0)
      return false;
    this.sirenCooldown = SIREN_COOLDOWN;
    this.car.siren(SIREN_SECONDS);
    siren(this.vehicle.siren);
    return true;
  }

  override update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 1 / 20);
    this.car.tick(dt);
    if (this.ended) {
      this.backdrop.advance(0, dt);
      return;
    }
    this.sirenCooldown = Math.max(0, this.sirenCooldown - dt);

    const { state, events } = step(this.run, dt, this.car.sirenOn);
    const px = (state.distance - this.run.distance) * PPM;
    this.run = state;
    this.backdrop.advance(px, dt);
    this.car.roll(px);

    for (const e of events) {
      if (e === "milestone") this.milestone();
      if (e === "low-fuel") sfx.lowFuel();
      if (e === "stopped") this.finish();
    }
    if (this.ended) return;

    this.moveCar(dt);
    this.updateItems();
    this.updateStations();
    this.updateHint();
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.combo = 0;
  }

  private moveCar(dt: number): void {
    this.buffered = Math.max(0, this.buffered - dt);
    if (this.height > 0 || this.vy > 0) {
      this.vy -= GRAVITY * dt;
      this.height += this.vy * dt;
      if (this.height <= 0) {
        this.height = 0;
        this.vy = 0;
        this.land();
        if (this.buffered > 0) {
          this.buffered = 0;
          this.jump();
        }
      }
    }
    const bob =
      this.height === 0
        ? Math.sin(this.time.now / 55) *
          1.4 *
          (this.run.speed / TUNING.topSpeed)
        : 0;
    this.car.y = this.groundY - this.height + bob;
    this.car.angle = Phaser.Math.Clamp(-this.vy * 0.007, -7, 7);
  }

  private land(): void {
    sfx.land();
    this.tweens.add({
      targets: this.car,
      scaleY: this.car.scaleX * 0.9,
      duration: 70,
      yoyo: true,
      ease: "Quad.Out",
    });
    const dust = this.add.particles(
      this.carX - this.car.span * 0.3,
      this.groundY,
      "dot",
      {
        speed: { min: 40, max: 160 },
        angle: { min: 180, max: 260 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 0.6, end: 0 },
        tint: 0xd6d3d1,
        lifespan: 450,
        emitting: false,
      },
    );
    dust.setDepth(DEPTH.fx).explode(10);
    this.time.delayedCall(500, () => dust.destroy());
  }

  private screenX(metres: number): number {
    return this.carX + (metres - this.run.distance) * PPM;
  }

  private updateItems(): void {
    const ahead = this.run.distance + (this.view.width - this.carX) / PPM + 3;
    for (const spawn of this.spawner.until(ahead)) {
      const key = spawn.kind === "fuel" ? "fuel" : this.vehicle.treat.key;
      const img = this.add.image(0, 0, key).setDepth(DEPTH.items);
      img.setScale((spawn.kind === "fuel" ? 84 : 72) / img.height);
      this.tweens.add({
        targets: img,
        scale: img.scale * 1.12,
        yoyo: true,
        repeat: -1,
        duration: 380,
        ease: "Sine.InOut",
      });
      this.items.push({ spawn, img, taken: false });
    }

    const carCenterY = this.groundY - this.height - 82;
    const reach = this.car.span / 2 + 20;
    for (const item of this.items) {
      if (item.taken) continue;
      const x = this.screenX(item.spawn.at);
      const y = this.groundY - (item.spawn.air ? ITEM_HIGH : ITEM_LOW);
      item.img.setPosition(x, y);
      if (Math.abs(x - this.carX) < reach && Math.abs(y - carCenterY) < 110)
        this.take(item);
    }
    const gone = this.items.filter((i) => !i.taken && i.img.x < -120);
    for (const item of gone) item.img.destroy();
    this.items = this.items.filter((i) => !i.taken && i.img.active);
  }

  private take(item: Item): void {
    item.taken = true;
    const { img } = item;
    this.tweens.killTweensOf(img);
    const hud = this.view;
    if (item.spawn.kind === "fuel") {
      this.run = collectFuel(this.run);
      sfx.fuel();
      buzz(30);
      this.events.emit("fuel-up");
      this.tweens.add({
        targets: img,
        x: hud.width < 900 ? hud.width / 2 : hud.width - 260,
        y: hud.width < 900 ? 150 : 62,
        scale: img.scale * 0.5,
        duration: 450,
        ease: "Quad.In",
        onComplete: () => img.destroy(),
      });
    } else {
      this.run = collectTreat(this.run);
      this.combo += 1;
      this.comboTimer = 1;
      sfx.treat(this.combo);
      buzz(15);
      this.events.emit("treat");
      this.popText(img.x, img.y - 50, `+${TUNING.treatPoints}`, "#facc15");
      const sparkle = this.add.particles(img.x, img.y, "dot", {
        speed: { min: 80, max: 260 },
        scale: { start: 0.5, end: 0 },
        tint: [0xffffff, 0xfde047],
        lifespan: 400,
        emitting: false,
      });
      sparkle.setDepth(DEPTH.fx).explode(10);
      this.time.delayedCall(450, () => sparkle.destroy());
      this.tweens.add({
        targets: img,
        x: hud.width / 2 - 90,
        y: 60,
        scale: img.scale * 0.45,
        duration: 500,
        ease: "Quad.In",
        onComplete: () => img.destroy(),
      });
    }
    img.setDepth(DEPTH.fx + 1);
  }

  private popText(x: number, y: number, text: string, color: string): void {
    const t = label(this, x, y, text, { size: 46, color }).setDepth(
      DEPTH.fx + 2,
    );
    this.tweens.add({
      targets: t,
      y: y - 80,
      alpha: 0,
      duration: 700,
      ease: "Quad.Out",
      onComplete: () => t.destroy(),
    });
  }

  /** Stations stand in the roadside row at every milestone, with a flag. */
  private updateStations(): void {
    const every = TUNING.milestoneEvery;
    const factor = Backdrop.propsParallax;
    const next = Math.floor(this.run.distance / every) + 1;
    for (const n of [next - 1, next, next + 1]) {
      if (n < 1) continue;
      const x = this.carX + (n * every - this.run.distance) * PPM * factor;
      const existing = this.stations.get(n);
      if (!existing && x < this.view.width + 400 && x > -400) {
        const station = this.add
          .image(x, 0, this.vehicle.station.key)
          .setOrigin(0.5, 1)
          .setDepth(DEPTH.station);
        station.setScale(250 / station.height);
        const flag = this.add
          .image(x, 0, "flag")
          .setOrigin(0.15, 1)
          .setDepth(DEPTH.station);
        flag.setScale(200 / flag.height);
        const sign = label(this, x, 0, `${n * every} m`, {
          size: 34,
          color: "#1f2937",
          stroke: "#ffffff",
          strokeWidth: 6,
        }).setDepth(DEPTH.station);
        this.stations.set(n, { station, flag, sign });
      }
      const parts = this.stations.get(n);
      if (!parts) continue;
      const top = this.backdrop.roadTop + 6;
      parts.station.setPosition(x, top);
      parts.flag.setPosition(x + 150, top);
      parts.sign.setPosition(x, top - 275);
      if (x < -400) {
        Object.values(parts).forEach((p) => p.destroy());
        this.stations.delete(n);
      }
    }
  }

  private milestone(): void {
    sfx.milestone();
    buzz(60);
    confettiBurst(this, this.carX + 60, this.groundY - 160, 60, DEPTH.fx);
    this.popText(
      this.carX,
      this.groundY - 250,
      `+${TUNING.milestonePoints}`,
      "#f97316",
    );
    if (this.run.milestones === 1) say("Super!");
  }

  private updateHint(): void {
    if (hintsLeft === 0 || this.height > 0) return;
    const soon = this.items.find(
      (i) =>
        i.spawn.air &&
        !i.taken &&
        i.img.x > this.carX &&
        i.img.x - this.carX < 560,
    );
    if (soon && !this.hand) {
      this.hand = this.add
        .image(this.carX + 40, this.groundY - 270, "hand")
        .setDepth(DEPTH.fx + 3);
      this.hand.setScale(110 / this.hand.height).setName("hint-hand");
      this.tweens.add({
        targets: this.hand,
        y: this.hand.y + 36,
        scale: this.hand.scale * 0.9,
        yoyo: true,
        repeat: -1,
        duration: 320,
        ease: "Sine.InOut",
      });
    } else if (!soon && this.hand) {
      this.hideHand();
    }
  }

  private hideHand(): void {
    const hand = this.hand;
    this.hand = undefined;
    if (!hand) return;
    this.tweens.killTweensOf(hand);
    this.tweens.add({
      targets: hand,
      alpha: 0,
      duration: 200,
      onComplete: () => hand.destroy(),
    });
  }

  private finish(): void {
    this.ended = true;
    this.hideHand();
    const points = score(this.run);
    const newBest = recordBest(localStorage, this.vehicle.id, points);
    this.time.delayedCall(500, () => {
      this.scene.stop("hud");
      this.scene.launch("end", {
        vehicle: this.vehicle.id,
        score: points,
        distance: Math.floor(this.run.distance),
        treats: this.run.treats,
        newBest,
      });
    });
  }

  /** Test hook: the state of the ride. */
  get state(): RunState {
    return this.run;
  }
}
