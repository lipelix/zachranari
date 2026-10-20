import * as Phaser from "phaser";

/** A round button that squashes when pressed and fires on release over it. */
export function roundButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
  color: number,
  draw: (g: Phaser.GameObjects.Graphics, r: number) => void,
  onTap: () => void,
): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.18).fillCircle(0, radius * 0.1, radius);
  g.fillStyle(color).fillCircle(0, 0, radius);
  g.lineStyle(radius * 0.1, 0xffffff).strokeCircle(0, 0, radius * 0.95);
  draw(g, radius);
  const button = scene.add.container(x, y, [g]);
  button
    .setSize(radius * 2, radius * 2)
    .setInteractive({ useHandCursor: true });
  button.on("pointerdown", () =>
    scene.tweens.add({ targets: button, scale: 0.88, duration: 70 }),
  );
  button.on("pointerout", () =>
    scene.tweens.add({ targets: button, scale: 1, duration: 120 }),
  );
  button.on("pointerup", () => {
    scene.tweens.add({
      targets: button,
      scale: 1,
      duration: 160,
      ease: "Back.Out",
    });
    onTap();
  });
  return button;
}

/** A replay arrow (a ring with a head) in white. */
export function drawReplay(g: Phaser.GameObjects.Graphics, r: number): void {
  g.lineStyle(r * 0.16, 0xffffff);
  g.beginPath();
  g.arc(0, 0, r * 0.45, Phaser.Math.DegToRad(-60), Phaser.Math.DegToRad(220));
  g.strokePath();
  const a = Phaser.Math.DegToRad(-60);
  const hx = Math.cos(a) * r * 0.45;
  const hy = Math.sin(a) * r * 0.45;
  g.fillStyle(0xffffff).fillTriangle(
    hx - r * 0.22,
    hy - r * 0.12,
    hx + r * 0.2,
    hy - r * 0.2,
    hx + r * 0.05,
    hy + r * 0.22,
  );
}

/** A little house. */
export function drawHome(g: Phaser.GameObjects.Graphics, r: number): void {
  g.fillStyle(0xffffff);
  g.fillTriangle(-r * 0.5, -r * 0.02, 0, -r * 0.48, r * 0.5, -r * 0.02);
  g.fillRect(-r * 0.36, -r * 0.04, r * 0.72, r * 0.46);
}

/** A beacon dome on a base. */
export function drawBeacon(g: Phaser.GameObjects.Graphics, r: number): void {
  g.fillStyle(0x93c5fd).fillCircle(0, r * 0.05, r * 0.42);
  g.fillStyle(0x1f2937).fillRoundedRect(
    -r * 0.55,
    r * 0.05,
    r * 1.1,
    r * 0.32,
    r * 0.08,
  );
  g.fillStyle(0xffffff, 0.8).fillCircle(-r * 0.15, -r * 0.12, r * 0.1);
  g.lineStyle(r * 0.08, 0xffffff);
  for (const a of [-150, -90, -30]) {
    const rad = Phaser.Math.DegToRad(a);
    g.lineBetween(
      Math.cos(rad) * r * 0.55,
      Math.sin(rad) * r * 0.55 + r * 0.05,
      Math.cos(rad) * r * 0.75,
      Math.sin(rad) * r * 0.75 + r * 0.05,
    );
  }
}

/** A speaker, crossed out when muted. */
export function drawSpeaker(
  g: Phaser.GameObjects.Graphics,
  r: number,
  muted: boolean,
): void {
  g.fillStyle(0xffffff);
  g.fillRect(-r * 0.45, -r * 0.18, r * 0.25, r * 0.36);
  g.fillTriangle(-r * 0.22, -r * 0.18, r * 0.12, -r * 0.45, r * 0.12, r * 0.45);
  g.fillTriangle(-r * 0.22, -r * 0.18, -r * 0.22, r * 0.18, r * 0.12, r * 0.45);
  g.lineStyle(r * 0.1, 0xffffff);
  if (muted) {
    g.lineBetween(r * 0.25, -r * 0.2, r * 0.55, r * 0.2);
    g.lineBetween(r * 0.55, -r * 0.2, r * 0.25, r * 0.2);
  } else {
    g.beginPath();
    g.arc(r * 0.12, 0, r * 0.28, -0.8, 0.8);
    g.strokePath();
    g.beginPath();
    g.arc(r * 0.12, 0, r * 0.46, -0.8, 0.8);
    g.strokePath();
  }
}

/** Bursts of confetti in every colour from a point. */
export function confettiBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  count: number,
  depth: number,
): void {
  const emitter = scene.add.particles(x, y, "confetti", {
    speed: { min: 260, max: 620 },
    angle: { min: 200, max: 340 },
    gravityY: 900,
    rotate: { start: 0, end: 720 },
    lifespan: 1600,
    scale: { min: 0.8, max: 1.5 },
    tint: [0xef4444, 0xfacc15, 0x22c55e, 0x3b82f6, 0xec4899, 0xf97316],
    emitting: false,
  });
  emitter.setDepth(depth);
  emitter.explode(count);
  scene.time.delayedCall(1800, () => emitter.destroy());
}
