# NETRUNNER // INTRUSION DEFENSE

Cyberpunk roguelike tower defense. Web-first, mobile-ready (PWA installable, Capacitor-ready).

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build for production

```bash
npm run build     # type-checks + builds to dist/
npm run preview   # serves dist/ on :4173
```

## Deploy

`dist/` is a static bundle. Drop it on any static host (Vercel, Netlify, GH Pages, Cloudflare Pages). PWA service worker + manifest are generated automatically.

## Eventually mobile

The app is a PWA and can be installed from a mobile browser. For native iOS/Android builds wrap the `dist/` output with [Capacitor](https://capacitorjs.com/):

```bash
npm i -D @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init netrunner com.yourco.netrunner --web-dir dist
npx cap add android && npx cap add ios
npm run build && npx cap sync
npx cap open android   # or ios
```

## Phase 1 MVP status

- [x] Core wave loop, tower targeting, enemy pathing
- [x] Wave-1 balance per spec §9.2 (winnable with starter tower, no damage)
- [x] Pause menu (spec §8.2 — no auto-restart)
- [x] 2 maps (GRID.01, NEXUS HUB) with easy/medium/hard
- [x] Card draft between waves (~25 cards)
- [x] 4 starter towers + 4 unlockable
- [x] 15 enemies including 5 bosses
- [x] Enemy intel on first encounter
- [x] localStorage save/load
- [x] Hand-drawn SVG sprites for every tower/enemy
- [x] Particle FX, screen shake, damage numbers, trails, portal rings
- [x] Procedural Web Audio SFX (no audio files)
- [x] PWA manifest + service worker

## Planned (Phase 2+)

All 10 maps · Challenge system · Survival mode · In-game tower upgrades UI · Stats screen · More card variety

See `CLAUDE_3.md` for the full design spec.
