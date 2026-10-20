import * as Phaser from "phaser";
import { sfx } from "../../audio/sfx";
import { drawBeacon, drawHome } from "../ui";
import { fitCamera, label, type View } from "../view";
import type { RaceScene } from "./RaceScene";

const HOLD_SECONDS = 0.9;
const SIREN_RADIUS = 80;

/**
 * Over the ride: the score, the tank, the siren button and a home button that must be
 * held (so a stray tap never ends the ride). A tap anywhere else is a jump.
 */
export class HudScene extends Phaser.Scene {
  private race!: RaceScene;
  private view!: View;
  private scoreText!: Phaser.GameObjects.Text;
  private scorePill!: Phaser.GameObjects.Container;
  private fuelBar!: Phaser.GameObjects.Graphics;
  private fuelGroup!: Phaser.GameObjects.Container;
  private sirenButton!: Phaser.GameObjects.Container;
  private sirenRing!: Phaser.GameObjects.Graphics;
  private homeButton!: Phaser.GameObjects.Container;
  private homeRing!: Phaser.GameObjects.Graphics;
  private holding = -1;
  private shown = -1;
  private wasReady = true;

  constructor() {
    super("hud");
  }

  create(): void {
    this.race = this.scene.get("race") as RaceScene;
    this.holding = -1;
    this.shown = -1;
    this.wasReady = true;
    this.view = fitCamera(this);
    this.build();

    this.input.on(
      "pointerdown",
      (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        if (over.length === 0) this.race.jump();
      },
    );
    const keys = this.input.keyboard;
    keys?.on("keydown-SPACE", () => this.race.jump());
    keys?.on("keydown-UP", () => this.race.jump());
    keys?.on("keydown-S", () => this.pressSiren());

    this.race.events.on("treat", this.bumpScore, this);
    this.race.events.on("fuel-up", this.bumpFuel, this);
    this.events.once("shutdown", () => {
      this.race.events.off("treat", this.bumpScore, this);
      this.race.events.off("fuel-up", this.bumpFuel, this);
      this.scale.off("resize", this.relayout, this);
    });
    this.scale.on("resize", this.relayout, this);
  }

  private relayout(): void {
    this.children.removeAll(true);
    this.view = fitCamera(this);
    this.build();
  }

  private build(): void {
    const { width: w, height: h } = this.view;

    // Score: a star and the points.
    const pill = this.add.graphics();
    pill.fillStyle(0xffffff, 0.92).fillRoundedRect(-150, -42, 300, 84, 42);
    pill.lineStyle(6, 0xfacc15).strokeRoundedRect(-150, -42, 300, 84, 42);
    const star = this.add
      .star(-100, 0, 5, 16, 34, 0xfacc15)
      .setStrokeStyle(4, 0xa16207);
    this.scoreText = label(this, 20, 2, "0", {
      size: 56,
      color: "#1f2937",
      stroke: "#ffffff",
      strokeWidth: 0,
    });
    this.scorePill = this.add
      .container(w / 2, 62, [pill, star, this.scoreText])
      .setName("score");

    // Tank: a canister and a bar.
    const can = this.add.image(-112, 0, "fuel");
    can.setScale(70 / can.height);
    this.fuelBar = this.add.graphics();
    // Upright there is no room beside the score: the tank goes under it.
    const narrow = w < 900;
    this.fuelGroup = this.add
      .container(narrow ? w / 2 + 20 : w - 150, narrow ? 150 : 62, [
        this.fuelBar,
        can,
      ])
      .setName("fuel");

    // Home (hold), small and out of the way.
    this.homeRing = this.add.graphics();
    const homeG = this.add.graphics();
    homeG.fillStyle(0x0f172a, 0.55).fillCircle(0, 0, 40);
    drawHome(homeG, 40);
    this.homeButton = this.add
      .container(64, 62, [homeG, this.homeRing])
      .setName("home");
    this.homeButton.setSize(96, 96).setInteractive();
    this.homeButton.on("pointerdown", () => (this.holding = 0));
    const release = () => {
      this.holding = -1;
      this.homeRing.clear();
    };
    this.homeButton.on("pointerup", release);
    this.homeButton.on("pointerout", release);

    // Siren: the big button.
    // Low in the meadow, so it never hides the road ahead.
    const r = SIREN_RADIUS;
    const sirenG = this.add.graphics();
    sirenG.fillStyle(0x000000, 0.2).fillCircle(0, 8, r);
    sirenG.fillStyle(0x1d4ed8).fillCircle(0, 0, r);
    sirenG.lineStyle(10, 0xffffff).strokeCircle(0, 0, r - 6);
    drawBeacon(sirenG, r);
    this.sirenRing = this.add.graphics();
    this.sirenButton = this.add
      .container(w - r - 36, h - r - 12, [sirenG, this.sirenRing])
      .setName("siren");
    this.sirenButton
      .setSize(r * 2, r * 2)
      .setInteractive({ useHandCursor: true });
    this.sirenButton.on("pointerdown", () => this.pressSiren());
  }

  private pressSiren(): void {
    if (this.race.sirenNow()) {
      this.tweens.add({
        targets: this.sirenButton,
        scale: 0.85,
        duration: 80,
        yoyo: true,
      });
    } else {
      sfx.tap();
      this.tweens.add({
        targets: this.sirenButton,
        angle: { from: -8, to: 8 },
        duration: 60,
        yoyo: true,
        repeat: 2,
        onComplete: () => this.sirenButton.setAngle(0),
      });
    }
  }

  private bumpScore(): void {
    this.tweens.killTweensOf(this.scorePill);
    this.scorePill.setScale(1);
    this.tweens.add({
      targets: this.scorePill,
      scale: 1.15,
      duration: 90,
      yoyo: true,
    });
  }

  private bumpFuel(): void {
    this.tweens.killTweensOf(this.fuelGroup);
    this.fuelGroup.setScale(1);
    this.tweens.add({
      targets: this.fuelGroup,
      scale: 1.18,
      duration: 110,
      yoyo: true,
    });
  }

  override update(time: number, delta: number): void {
    const snap = this.race.snapshot();
    if (snap.score !== this.shown) {
      this.shown = snap.score;
      this.scoreText.setText(String(snap.score));
    }

    // Tank: green, then yellow, then red and blinking.
    const f = snap.fuel;
    const color = f > 0.5 ? 0x22c55e : f > 0.25 ? 0xfacc15 : 0xef4444;
    const blink = f <= 0.25 && Math.floor(time / 250) % 2 === 0;
    const g = this.fuelBar;
    g.clear();
    g.fillStyle(0xffffff, 0.92).fillRoundedRect(-80, -24, 210, 48, 24);
    if (f > 0)
      g.fillStyle(color, blink ? 0.45 : 1).fillRoundedRect(
        -72,
        -16,
        Math.max(32, 194 * f),
        32,
        16,
      );
    g.lineStyle(5, 0x1f2937).strokeRoundedRect(-80, -24, 210, 48, 24);

    // Siren: a ring fills while it cools down; it wiggles when ready again.
    const ready = snap.sirenReady;
    this.sirenRing.clear();
    if (ready < 1) {
      this.sirenRing.fillStyle(0x0f172a, 0.45).fillCircle(0, 0, SIREN_RADIUS);
      this.sirenRing.lineStyle(14, 0xfacc15);
      this.sirenRing.beginPath();
      this.sirenRing.arc(
        0,
        0,
        SIREN_RADIUS - 14,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * ready,
      );
      this.sirenRing.strokePath();
    } else if (!this.wasReady) {
      this.tweens.add({
        targets: this.sirenButton,
        scale: 1.15,
        duration: 150,
        yoyo: true,
        ease: "Quad.Out",
      });
    }
    this.wasReady = ready >= 1;

    // Home: hold to go back to the garage.
    if (this.holding >= 0) {
      this.holding += delta / 1000;
      const p = Math.min(1, this.holding / HOLD_SECONDS);
      this.homeRing.clear().lineStyle(10, 0xfacc15);
      this.homeRing.beginPath();
      this.homeRing.arc(0, 0, 46, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
      this.homeRing.strokePath();
      if (p >= 1) {
        this.holding = -1;
        this.race.scene.start("garage");
      }
    }
  }
}
