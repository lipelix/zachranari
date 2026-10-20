# zachranari

Racing game for children from 3 years: pick an ambulance (155), police car (158) or fire
engine (150), the car drives by itself, a tap anywhere jumps, the siren button gives a
short push. Nothing can crash; the ride ends when the tank is empty. Phaser 4 + Vite +
TypeScript, shipped as an offline PWA.

Live: https://lipelix.github.io/zachranari/ (GitHub Pages, deployed by `ci.yml` on every
push to `main` after the checks pass). The build uses relative URLs (`base: "./"`), so the
same `dist/` also serves from a host's root (Docker).

## Commands

```bash
npm run dev            # http://localhost:5173 (window.__game exposed in dev only)
npm run check          # prettier + eslint + tsc + vitest
npm run build          # dist/ with a generated sw.js (needs git or GAME_COMMIT)
npm run test:e2e       # Playwright: phone landscape/portrait, tablet, pwa (offline, in /zachranari/)
npm run pwa:icons      # re-render public/icons/*.png from icon.svg (-- --check: compare; PNGs differ per OS, so local only)
docker build --build-arg GAME_COMMIT=$(git rev-parse --short HEAD) -t zachranari .
```

## Layout

- `src/logic/` pure ride rules (fuel, speed, points, item layout, best score); no Phaser.
- `src/game/scenes/` Boot → Garage (pick a car) → Race + Hud → End.
- `src/game/view.ts` every scene works in view units, at least 1000×720 (640 wide upright).
- `src/art/*.svg` hand-written art, rasterised at 2× by the loader; `src/audio/sfx.ts`
  synthesises every sound with Web Audio (no audio files).
- `src/pwa/` service worker generated at build time (`vite.config.ts`).

## Rules for changes

- Small children: one kind of input (tap), big targets, no failure states, no text needed
  to play. The home button must be held; end-card buttons appear after a pause.
- Keep the ride length for a passive player between 25 and 60 s (`run.test.ts`).
