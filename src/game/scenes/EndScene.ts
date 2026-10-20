import * as Phaser from "phaser";
import { say, sfx } from "../../audio/sfx";
import { confettiBurst, drawReplay, roundButton } from "../ui";
import { vehicleById } from "../vehicles";
import { fitCamera, label } from "../view";

export interface EndData {
  vehicle: string;
  score: number;
  distance: number;
  treats: number;
  newBest: boolean;
}

/** Taps right after the stop are ignored: small hands keep tapping. */
const BUTTON_DELAY = 1300;

/**
 * Always a celebration: confetti, the points counting up, a crown for a new best. Two
 * big buttons: ride again with the same car, or go back to pick another.
 */
export class EndScene extends Phaser.Scene {
  constructor() {
    super("end");
  }

  create(data: EndData): void {
    const { width: w, height: h } = fitCamera(this);
    const v = vehicleById(data.vehicle);
    sfx.finish();
    say(data.newBest ? "Nový rekord!" : "Výborně!");

    this.add
      .rectangle(0, 0, w, h, 0x0f172a, 0.35)
      .setOrigin(0)
      .setInteractive();
    const cw = Math.min(680, w - 80);
    const ch = 520;
    const cy = Math.min(h / 2, h - ch / 2 - 40);
    const card = this.add.container(w / 2, cy).setName("end-card");
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.2).fillRoundedRect(
      -cw / 2 + 10,
      -ch / 2 + 14,
      cw,
      ch,
      48,
    );
    g.fillStyle(0xffffff).fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 48);
    g.lineStyle(14, v.color).strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 48);
    card.add(g);

    const star = this.add
      .star(0, -ch / 2 + 110, 5, 44, 92, 0xfacc15)
      .setStrokeStyle(8, 0xa16207);
    card.add(star);
    this.tweens.add({ targets: star, angle: 360, duration: 6000, repeat: -1 });
    if (data.newBest) {
      const crown = this.add.graphics();
      crown.fillStyle(0xf59e0b).lineStyle(6, 0x92400e);
      const pts = [-60, 20, -60, -30, -30, 0, 0, -44, 30, 0, 60, -30, 60, 20];
      const shape = new Phaser.Geom.Polygon(pts);
      crown.fillPoints(shape.points, true).strokePoints(shape.points, true);
      crown.setPosition(0, -ch / 2 - 10);
      card.add(crown);
      const banner = label(this, 0, -ch / 2 + 220, "Nový rekord!", {
        size: 44,
        color: "#f97316",
        stroke: "#ffffff",
        strokeWidth: 0,
      });
      card.add(banner);
      this.tweens.add({
        targets: [crown, banner],
        scale: 1.12,
        yoyo: true,
        repeat: -1,
        duration: 420,
      });
    }

    const scoreText = label(this, 0, -ch / 2 + 300, "0", {
      size: 110,
      color: "#1f2937",
      stroke: "#fde047",
      strokeWidth: 10,
    }).setName("end-score");
    card.add(scoreText);
    const counter = { value: 0 };
    let lastTick = 0;
    this.tweens.add({
      targets: counter,
      value: data.score,
      duration: Math.min(1800, 500 + data.score * 2),
      ease: "Quad.Out",
      onUpdate: () => {
        const v2 = Math.round(counter.value);
        scoreText.setText(String(v2));
        if (this.time.now - lastTick > 70) {
          lastTick = this.time.now;
          sfx.tap();
        }
      },
    });

    const flag = this.add.image(-cw * 0.2 - 40, -ch / 2 + 390, "flag");
    flag.setScale(56 / flag.height);
    const metres = label(
      this,
      -cw * 0.2 + 20,
      -ch / 2 + 392,
      `${data.distance} m`,
      { size: 36, color: "#334155", stroke: "#ffffff", strokeWidth: 0 },
    );
    const treat = this.add.image(cw * 0.16, -ch / 2 + 390, v.treat.key);
    treat.setScale(52 / treat.height);
    const treats = label(
      this,
      cw * 0.16 + 60,
      -ch / 2 + 392,
      `${data.treats}`,
      { size: 36, color: "#334155", stroke: "#ffffff", strokeWidth: 0 },
    );
    card.add([flag, metres, treat, treats]);

    card.setScale(0.3).setAlpha(0);
    this.tweens.add({
      targets: card,
      scale: 1,
      alpha: 1,
      duration: 450,
      ease: "Back.Out",
    });
    confettiBurst(this, w / 2, cy - ch / 2, 90, 50);
    this.time.delayedCall(700, () => confettiBurst(this, w * 0.25, cy, 50, 50));
    this.time.delayedCall(1000, () =>
      confettiBurst(this, w * 0.75, cy, 50, 50),
    );

    this.time.delayedCall(BUTTON_DELAY, () => {
      const by = cy + ch / 2;
      const again = roundButton(
        this,
        w / 2 + 100,
        by,
        78,
        0x16a34a,
        drawReplay,
        () => {
          sfx.tap();
          this.scene.stop();
          this.scene.get("race").scene.restart({ vehicle: v.id });
        },
      ).setName("again");
      const garage = roundButton(
        this,
        w / 2 - 100,
        by,
        66,
        0x2563eb,
        () => undefined,
        () => {
          sfx.tap();
          this.scene.stop();
          this.scene.get("race").scene.start("garage");
        },
      ).setName("garage");
      const mini = this.add.image(0, 4, v.id);
      mini.setScale(96 / mini.width);
      garage.add(mini);
      for (const b of [again, garage]) {
        b.setScale(0);
        this.tweens.add({
          targets: b,
          scale: 1,
          duration: 350,
          ease: "Back.Out",
        });
      }
      this.tweens.add({
        targets: again,
        angle: { from: -6, to: 6 },
        yoyo: true,
        repeat: -1,
        duration: 500,
        delay: 400,
        ease: "Sine.InOut",
      });
    });
  }
}
