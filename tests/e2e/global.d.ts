import type * as Phaser from "phaser";

declare global {
  interface Window {
    /** The game, exposed in development builds only (see src/main.ts). */
    __game: Phaser.Game;
  }
}
