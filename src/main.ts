// Only the Latin and Czech (latin-ext) subsets, woff2: a small offline cache.
import "./fonts.css";
import * as Phaser from "phaser";
import { BootScene } from "./game/scenes/BootScene";
import { EndScene } from "./game/scenes/EndScene";
import { GarageScene } from "./game/scenes/GarageScene";
import { HudScene } from "./game/scenes/HudScene";
import { RaceScene } from "./game/scenes/RaceScene";
import { registerServiceWorker } from "./pwa/register";
import "./style.css";

// The canvas has `scale` device px per CSS px (capped at 2) and is shown at 1/scale:
// sharp on phones and tablets without drawing 9x the pixels on 3x screens.
const scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
const size = () => ({
  width: Math.round(window.innerWidth * scale),
  height: Math.round(window.innerHeight * scale),
});

// Text is drawn once the rounded font is ready (it is bundled, so this works offline).
await Promise.all([
  document.fonts.load("700 48px Fredoka", "Záchranáři 0123456789"),
  document.fonts.load("600 48px Fredoka", "Záchranáři"),
]).catch(() => undefined);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  backgroundColor: "#38a6f5",
  scale: { mode: Phaser.Scale.NONE, ...size(), zoom: 1 / scale },
  input: { activePointers: 3 },
  render: { antialias: true },
  scene: [BootScene, GarageScene, RaceScene, HudScene, EndScene],
});

const resize = () => {
  const { width, height } = size();
  game.scale.resize(width, height);
};
window.addEventListener("resize", resize);
// iOS reports the new size a moment after rotating.
window.addEventListener("orientationchange", () => setTimeout(resize, 250));

// Small fingers: no long-press menus, no pinch zoom, no pull-to-refresh.
document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("gesturestart", (e) => e.preventDefault());

if (import.meta.env.DEV) Object.assign(window, { __game: game });
registerServiceWorker();
