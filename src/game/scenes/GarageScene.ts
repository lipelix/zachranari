import * as Phaser from "phaser";
import {
  isMuted,
  say,
  setMuted,
  siren,
  sfx,
  unlockAudio,
} from "../../audio/sfx";
import { readBest } from "../../logic/best";
import { Backdrop } from "../backdrop";
import { Car } from "../car";
import { drawSpeaker, roundButton } from "../ui";
import { VEHICLES, type Vehicle } from "../vehicles";
import { fitCamera, label } from "../view";

/** Ask for fullscreen on phones and tablets (not when installed: it already is). */
function goFullscreen(scene: Phaser.Scene): void {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const standalone = window.matchMedia(
    "(display-mode: fullscreen), (display-mode: standalone)",
  ).matches;
  if (coarse && !standalone && !scene.scale.isFullscreen) {
    try {
      scene.scale.startFullscreen();
    } catch {
      // iPhone Safari has no fullscreen for pages; the game fits the window anyway.
    }
  }
}

/** The start: three big vehicle cards. One tap picks a car and drives off. */
export class GarageScene extends Phaser.Scene {
  private cars: Car[] = [];
  private leaving = false;

  constructor() {
    super("garage");
  }

  create(): void {
    this.leaving = false;
    this.cars = [];
    const view = fitCamera(this);
    const backdrop = new Backdrop(this);
    backdrop.layout(view);
    const { width: w, height: h } = view;

    const title = label(this, w / 2, 0, "Záchranáři", {
      size: 96,
      stroke: "#1e3a8a",
      strokeWidth: 16,
    });
    title.setDepth(30);
    this.tweens.add({
      targets: title,
      scale: 1.05,
      yoyo: true,
      repeat: -1,
      duration: 900,
      ease: "Sine.InOut",
    });

    const portrait = h > w * 1.05;
    const best = readBest(localStorage);
    if (portrait) {
      const gap = 32;
      const ch = Math.min(w * 0.82 * 0.86, (h - 220 - 2 * gap) / 3);
      const cw = ch / 0.86;
      const top = 190 + Math.max(0, (h - 220 - (3 * ch + 2 * gap)) / 3);
      title.setY(top - 95);
      VEHICLES.forEach((v, i) =>
        this.card(
          v,
          w / 2,
          top + ch / 2 + i * (ch + gap),
          cw,
          ch,
          best[v.id] ?? 0,
        ),
      );
    } else {
      const gap = 36;
      const cw = Math.min((w - 120 - 2 * gap) / 3, 440);
      const ch = cw * 0.92;
      const cy = Math.min(h * 0.52, h - 150 - ch / 2 - 20);
      title.setY(Math.max(80, (cy - ch / 2) / 2));
      VEHICLES.forEach((v, i) =>
        this.card(v, w / 2 + (i - 1) * (cw + gap), cy, cw, ch, best[v.id] ?? 0),
      );
    }

    const muteButton = (): void => {
      const button = roundButton(
        this,
        w - 70,
        70,
        44,
        0x0f172a,
        (g, r) => drawSpeaker(g, r, isMuted()),
        () => {
          unlockAudio();
          setMuted(!isMuted());
          button.destroy();
          muteButton();
          sfx.tap();
        },
      );
      button.setAlpha(0.75).setName("mute");
    };
    muteButton();

    this.scale.on("resize", this.relayout, this);
    this.events.once("shutdown", () =>
      this.scale.off("resize", this.relayout, this),
    );
    this.cameras.main.fadeIn(250, 255, 255, 255);
  }

  private relayout(): void {
    if (!this.leaving) this.scene.restart();
  }

  private card(
    v: Vehicle,
    x: number,
    y: number,
    cw: number,
    ch: number,
    best: number,
  ): void {
    const g = this.add.graphics();
    const r = cw * 0.09;
    g.fillStyle(0x000000, 0.18).fillRoundedRect(
      -cw / 2 + 8,
      -ch / 2 + 12,
      cw,
      ch,
      r,
    );
    g.fillStyle(0xffffff).fillRoundedRect(-cw / 2, -ch / 2, cw, ch, r);
    g.fillStyle(v.color, 0.16).fillRoundedRect(
      -cw / 2,
      ch * 0.08,
      cw,
      ch * 0.42,
      { tl: 0, tr: 0, bl: r, br: r },
    );
    g.lineStyle(cw * 0.025, v.color).strokeRoundedRect(
      -cw / 2,
      -ch / 2,
      cw,
      ch,
      r,
    );
    // A strip of road under the car.
    g.fillStyle(0x4b5563).fillRect(-cw * 0.44, ch * 0.08, cw * 0.88, cw * 0.05);

    const badgeR = cw * 0.1;
    const bx = -cw / 2 + badgeR + cw * 0.05;
    const by = -ch / 2 + badgeR + cw * 0.05;
    const badge = this.add.graphics();
    badge.fillStyle(v.color).fillCircle(bx, by, badgeR);
    badge.lineStyle(cw * 0.012, 0xffffff).strokeCircle(bx, by, badgeR * 0.88);
    const phone = label(this, bx, by, v.phone, {
      size: badgeR * 0.8,
      strokeWidth: 0,
    });

    const car = new Car(this, cw * 0.04, ch * 0.08, v);
    car.setScale(car.scaleX * ((cw * 0.76) / car.span));
    this.cars.push(car);
    this.tweens.add({
      targets: car,
      y: car.y - cw * 0.012,
      yoyo: true,
      repeat: -1,
      duration: 260 + Math.random() * 80,
      ease: "Sine.InOut",
    });

    const name = label(this, 0, ch * 0.24, v.name, {
      size: cw * 0.12,
      stroke: "#ffffff",
      strokeWidth: 0,
      color: "#1f2937",
    });
    const parts: Phaser.GameObjects.GameObject[] = [g, car, badge, phone, name];
    if (best > 0) {
      const star = this.add
        .star(-cw * 0.12, ch * 0.38, 5, cw * 0.025, cw * 0.055, 0xfacc15)
        .setStrokeStyle(3, 0xa16207);
      const score = label(this, cw * 0.04, ch * 0.38, String(best), {
        size: cw * 0.075,
        color: "#a16207",
        stroke: "#ffffff",
        strokeWidth: 0,
      }).setOrigin(0, 0.5);
      parts.push(star, score);
    }

    const card = this.add
      .container(x, y, parts)
      .setDepth(20)
      .setName(`card-${v.id}`);
    card.setSize(cw, ch).setInteractive({ useHandCursor: true });
    card.setScale(0);
    this.tweens.add({
      targets: card,
      scale: 1,
      duration: 420,
      delay: 120 * VEHICLES.indexOf(v),
      ease: "Back.Out",
    });
    card.on("pointerdown", () => {
      if (!this.leaving)
        this.tweens.add({ targets: card, scale: 0.94, duration: 80 });
    });
    card.on("pointerout", () => {
      if (!this.leaving)
        this.tweens.add({ targets: card, scale: 1, duration: 120 });
    });
    card.on("pointerup", () => this.choose(v, card, car));
  }

  private choose(
    v: Vehicle,
    card: Phaser.GameObjects.Container,
    car: Car,
  ): void {
    if (this.leaving) return;
    this.leaving = true;
    unlockAudio();
    goFullscreen(this);
    siren(v.siren);
    say(v.name);
    car.siren(2);
    this.tweens.killTweensOf(car);
    this.tweens.add({
      targets: card,
      scale: 1.08,
      duration: 160,
      yoyo: true,
      ease: "Quad.Out",
    });
    for (const other of this.children.list)
      if (
        other instanceof Phaser.GameObjects.Container &&
        other.name.startsWith("card-") &&
        other !== card
      )
        this.tweens.add({
          targets: other,
          alpha: 0,
          scale: 0.8,
          duration: 300,
        });
    this.tweens.add({
      targets: car,
      x: card.width,
      duration: 900,
      delay: 350,
      ease: "Quad.In",
    });
    this.time.delayedCall(1100, () => {
      this.cameras.main.fadeOut(250, 255, 255, 255);
      this.cameras.main.once("camerafadeoutcomplete", () =>
        this.scene.start("race", { vehicle: v.id }),
      );
    });
  }

  override update(_time: number, delta: number): void {
    for (const car of this.cars) {
      car.tick(delta / 1000);
      car.roll(this.leaving ? delta : 0);
    }
  }
}
