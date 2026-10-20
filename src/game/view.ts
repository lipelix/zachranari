import type * as Phaser from "phaser";

/**
 * Every scene works in "view units": at least 1000 wide (640 upright) and 720 tall,
 * whatever the screen. The camera zooms so that box fits; the longer side of the screen simply shows
 * more sky (portrait) or more road (wide phones).
 */
export const MIN_WIDTH = 1000;
/** Held upright the road is narrower, so the car stays big enough for small eyes. */
export const MIN_WIDTH_PORTRAIT = 640;
export const MIN_HEIGHT = 720;
export const FONT = "Fredoka, 'Arial Rounded MT Bold', Arial, sans-serif";

export interface View {
  width: number;
  height: number;
  zoom: number;
}

export function fitCamera(scene: Phaser.Scene): View {
  const cw = scene.scale.width;
  const ch = scene.scale.height;
  const minWidth = ch > cw ? MIN_WIDTH_PORTRAIT : MIN_WIDTH;
  const zoom = Math.min(ch / MIN_HEIGHT, cw / minWidth);
  const width = cw / zoom;
  const height = ch / zoom;
  scene.cameras.main.setZoom(zoom).centerOn(width / 2, height / 2);
  return { width, height, zoom };
}

export interface LabelStyle {
  size: number;
  color?: string;
  stroke?: string;
  strokeWidth?: number;
  weight?: 600 | 700;
}

/** Rounded, outlined text, rendered sharp at the camera's zoom. */
export function label(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  style: LabelStyle,
): Phaser.GameObjects.Text {
  const t = scene.add.text(x, y, text, {
    fontFamily: FONT,
    fontStyle: String(style.weight ?? 700),
    fontSize: `${style.size}px`,
    color: style.color ?? "#ffffff",
    stroke: style.stroke ?? "#1f2937",
    strokeThickness: style.strokeWidth ?? Math.round(style.size / 7),
    align: "center",
  });
  t.setResolution(Math.max(1, scene.cameras.main.zoom));
  return t.setOrigin(0.5);
}
