# NETRUNNER — itch.io Upload Guide

End-to-end instructions for getting the game up on itch.io for sale at
$2-5. Assumes you already have the repo building locally on Windows.

## 1. Build the upload package

```bash
npm run itch
```

This produces `netrunner-itch.zip` in the repo root. The script:

- Sets `ITCH_BUILD=1` which disables the PWA service worker (SW caching in
  itch's sandboxed iframe causes "I'm seeing an old version" reports).
- Strips sourcemaps (cuts upload size roughly in half).
- Zips `dist/` contents at the zip root (itch expects `index.html` at the
  top level, not inside a subdirectory).

Current zip size: ~120 KB. Loads instantly in any browser.

## 2. itch.io account + project setup

**Sign up** at https://itch.io if you haven't — free, no credit check.

Hit **Upload new project** (top-right user menu). Fill out the form:

- **Title**: `NETRUNNER // Intrusion Defense` (or whatever you want on the
  page header; `short_name` in the PWA manifest is still `NETRUNNER`).
- **Project URL**: `netrunner` or `netrunner-td` — this becomes the public
  slug: `https://<yourname>.itch.io/netrunner`.
- **Short description**: 1 sentence. Something like:
  *"A cyberpunk roguelike tower defense. 14 turrets, 18 enemies, deep
  card drafts, Brutal Mode endgame."*
- **Classification**: Games
- **Kind of project**: **HTML** (this is critical — `Downloadable` is for
  native downloads only, `HTML` is for browser-playable games).
- **Release status**: `Released` (or `In Development` if you want a beta
  tag on the page).
- **Pricing**: `$ Paid` → set the minimum between $2 and $5. You can
  also toggle **"Allow players to pay more"** — some will tip.

## 3. Upload the zip

Scroll to **Uploads** section, hit **Upload files**, pick
`netrunner-itch.zip`.

After upload finishes:

1. Check the **"This file will be played in the browser"** checkbox. A
   new config block appears.
2. **Viewport dimensions**: `1280 × 720`. This is the default iframe size
   players see. The game's canvas auto-resizes so it works at any aspect
   ratio, but 1280×720 is a good landscape default.
3. Check **Fullscreen button**: on. Lets players expand to their full
   browser viewport — critical for immersion.
4. Check **Mobile friendly**: on. The game is landscape-responsive and
   touch-works — itch will show it in mobile browsers.
5. **Orientation**: Landscape.

## 4. Page design / assets

These matter a lot for conversion at paid pricing. Budget a couple hours.

- **Cover image** (required): 630 × 500 px recommended. This is the
  thumbnail on the itch front page and store results. Needs to convey
  the game's vibe in one glance — neon, cyberpunk, TD grid. A screenshot
  of a dense mid-game moment works; a custom logo-over-screenshot works
  better.
- **Screenshots** (3-5 minimum): 1280 × 720 or the game's native aspect.
  Show variety — a quiet pre-wave setup, a chaotic boss wave, the card
  draft UI, the databank. Each screenshot is a sales pitch; don't waste
  one on a blank menu.
- **GIF or video** (optional but huge): itch lets you embed a YouTube
  trailer or upload a short GIF. 15-30 seconds of gameplay at 60 fps
  converts better than static screenshots. Tools: ShareX or ScreenToGif
  on Windows.
- **Tags**: pick 10+ relevant — `tower-defense`, `roguelike`, `cyberpunk`,
  `pixel-art`, `indie`, `strategy`, `hacking`, `deck-builder`, `singleplayer`,
  `browser`.
- **Genre**: Strategy.
- **Made with**: TypeScript, HTML5.
- **Average session**: About a half hour.
- **Languages**: English.
- **Inputs**: Mouse + keyboard, touch.
- **Accessibility**: Color-blind friendly / textured colors (roughly true —
  your resistance chips have text labels too).

## 5. Description block (Markdown)

The big description field supports Markdown. Template to start from:

```markdown
# NETRUNNER // Intrusion Defense

A **cyberpunk roguelike tower defense**. Deploy turrets, draft cards,
commit to build paths, and survive 7 acts of escalating intrusions.

## Features

- **14 turrets**, each with 3 branching upgrade paths (84 upgrade cards)
- **18 enemies** with full damage-type resistance matchups
- **Runners** — pick a persona with unique passives and a banned turret
- **Port/Protocol exploits** — match turret specialties against enemy
  open ports for +25% damage
- **Brutal Mode** endgame — unlocked after all 7 acts cleared on Hard
- **Seeded daily / weekly / monthly challenges** with personal-best tracking
- **Cosmetic chromas** unlocked via lifetime milestones — one per turret

## How to play

Tap a grid cell to place a turret. Tap a placed turret to change targeting,
trigger OVERDRIVE, or remove it. Between waves, pick a card from the
level-up draft. Adjacent turrets form SUBNET links — mix types for bonus damage.

Full **HOW TO PLAY** inside the game.

## Controls

- Mouse / touch: everything
- `Space`: start wave
- `[O]` (with turret selected): trigger OVERDRIVE

## Technical

Plays in any modern browser. No account, no ads, no nags. Progress saved
locally — clearing browser data resets it. Works on mobile in landscape.
```

## 6. Community + visibility tab

- **Community**: enable comments (players leave bug reports + feedback).
- **Visibility**: start as **Public**. Itch doesn't have a review gate, so
  the game appears immediately in search / browse results.
- **Publish!** (bottom of page).

## 7. After publish

- Browse to your game's page in a logged-out window. Verify the "buy now"
  button is clear, screenshots load, and the play iframe actually launches.
- **Post to `r/tower_defense`** (about 30k subscribers, allows self-promo
  Fridays) with a short post: "I just released a cyberpunk roguelike TD on
  itch for $X — let me know what you think." Link back to the itch page.
- **Post to `r/incremental_games`** if you want that audience.
- **Post to `r/webgames`** for visibility.
- **Update the itch Devlog** with patches — players see devlog entries in
  their feed if they follow or bought the game.

## 8. Updating the build later

Every change gets the same pipeline:

```bash
npm run itch
```

Then on the itch Edit page, Uploads section, delete the old zip and
upload the new one. Itch handles version-bumping the iframe URL so
players get the new version on their next load (no cache issues since we
disabled the SW).

## Pricing strategy notes

- itch lets you set a **minimum** price (e.g. $3) but also **suggested** and
  **allow-more** prices. Minimum = hard gate, higher tiers = tipping. Most
  revenue at $2-5 comes from the floor.
- **Launch discount**: itch supports sales. A "15% off launch week" on a
  $4 base = $3.40 and gets you into itch's sales browser. Free visibility.
- **Bundles**: itch occasionally runs charity bundles that bring huge
  exposure. Getting accepted is competitive — more of a year-two thing.
- **itch takes 10% by default** (you can lower to 0% or raise higher).
  On a $3 sale at 10% you net ~$2.55 after itch but before payment
  processor fees (~2-3%) and currency conversion.

## Gotchas

- **Save data is per-browser origin.** Players who switch browsers lose
  progress. Add cloud save later if it becomes a complaint. For now, the
  PWA installable option does reduce this (installed games share storage
  across sessions), but that's not available inside the itch iframe.
- **Audio autoplay**: the game already waits for a user gesture before
  starting audio (tap-to-begin). This works inside the itch iframe.
- **Mobile browsers**: game is landscape. Players on a phone in portrait
  see the landscape prompt. iOS Safari inside the itch iframe has some
  audio quirks — testing there is worth it before launch.

Ready: just run `npm run itch`, grab `netrunner-itch.zip`, and you're
30 minutes of page-decoration away from selling.
