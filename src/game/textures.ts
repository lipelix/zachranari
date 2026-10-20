import type * as Phaser from "phaser";

/**
 * Textures drawn in code: the sky-less scenery bands that tile sideways (hills, road,
 * grass) and small particle shapes. Hills use whole sine waves over the tile width so
 * the seams match.
 */
export const TILE = 1024;

function hills(
  scene: Phaser.Scene,
  key: string,
  height: number,
  color: string,
  waves: readonly [number, number, number][],
): void {
  const tex = scene.textures.createCanvas(key, TILE, height);
  if (!tex) throw new Error(`Cannot create texture ${key}`);
  const ctx = tex.getContext();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let x = 0; x <= TILE; x += 4) {
    const y = waves.reduce(
      (sum, [amp, cycles, phase]) =>
        sum + amp * Math.sin((x / TILE) * Math.PI * 2 * cycles + phase),
      height * 0.45,
    );
    ctx.lineTo(x, y);
  }
  ctx.lineTo(TILE, height);
  ctx.closePath();
  ctx.fill();
  tex.refresh();
}

function road(scene: Phaser.Scene): void {
  const w = 512;
  const h = 150;
  const tex = scene.textures.createCanvas("road", w, h);
  if (!tex) throw new Error("Cannot create texture road");
  const ctx = tex.getContext();
  // Pavement and kerb.
  ctx.fillStyle = "#d6d3d1";
  ctx.fillRect(0, 0, w, 16);
  for (let x = 0; x < w; x += 64) {
    ctx.fillStyle = "#a8a29e";
    ctx.fillRect(x, 0, 3, 16);
  }
  ctx.fillStyle = "#78716c";
  ctx.fillRect(0, 16, w, 6);
  // Asphalt with a dashed centre line.
  ctx.fillStyle = "#4b5563";
  ctx.fillRect(0, 22, w, 112);
  ctx.fillStyle = "#f8fafc";
  for (let x = 0; x < w; x += 128) ctx.fillRect(x + 24, 64, 72, 8);
  ctx.fillStyle = "#facc15";
  ctx.fillRect(0, 128, w, 6);
  // Verge.
  ctx.fillStyle = "#65a30d";
  ctx.fillRect(0, 134, w, 16);
  tex.refresh();
}

function grass(scene: Phaser.Scene): void {
  const w = 512;
  const h = 120;
  const tex = scene.textures.createCanvas("grass", w, h);
  if (!tex) throw new Error("Cannot create texture grass");
  const ctx = tex.getContext();
  ctx.fillStyle = "#84cc16";
  ctx.fillRect(0, 0, w, h);
  const flowers = ["#f472b6", "#fde047", "#ffffff", "#fb923c"];
  for (let i = 0; i < 18; i++) {
    const x = (i * 157) % w;
    const y = 18 + ((i * 53) % (h - 30));
    ctx.fillStyle = "#4d7c0f";
    ctx.fillRect(x - 1, y, 3, 10);
    ctx.fillStyle = flowers[i % flowers.length] ?? "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  tex.refresh();
}

function dot(scene: Phaser.Scene, key: string, size: number): void {
  const g = scene.make.graphics({}, false);
  g.fillStyle(0xffffff).fillCircle(size / 2, size / 2, size / 2);
  g.generateTexture(key, size, size);
  g.destroy();
}

function glow(scene: Phaser.Scene): void {
  const size = 128;
  const tex = scene.textures.createCanvas("glow", size, size);
  if (!tex) throw new Error("Cannot create texture glow");
  const ctx = tex.getContext();
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.2, "rgba(147,197,253,1)");
  g.addColorStop(0.5, "rgba(59,130,246,0.55)");
  g.addColorStop(1, "rgba(37,99,235,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
}

function confetti(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);
  g.fillStyle(0xffffff).fillRect(0, 0, 14, 8);
  g.generateTexture("confetti", 14, 8);
  g.destroy();
}

export function makeTextures(scene: Phaser.Scene): void {
  hills(scene, "hills-far", 300, "#a7d3a0", [
    [40, 2, 0.4],
    [22, 5, 1.3],
    [8, 11, 2.1],
  ]);
  hills(scene, "hills-near", 240, "#6fbf5f", [
    [34, 3, 2.2],
    [18, 7, 0.2],
    [6, 13, 1.1],
  ]);
  road(scene);
  grass(scene);
  dot(scene, "dot", 24);
  glow(scene);
  confetti(scene);
}
