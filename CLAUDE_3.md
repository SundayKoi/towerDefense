# NETRUNNER // INTRUSION DEFENSE

> A cyberpunk roguelike tower defense game. Path-based enemy waves, Slay-the-Spire-style card drafts between rounds, 10 themed maps with 3 difficulty tiers each, an infinite survival mode, and a deep meta-progression unlock system.

---

## 1. Project Overview

### 1.1 Elevator Pitch
You're a netrunner defending a corporate mainframe. Waves of hostile processes (worms, trojans, phantoms, kernel panics) flow along data paths toward your core. You place defensive ICE towers on the grid. Between waves you draft one of three random upgrade cards. Every 5 or 10 waves is a boss. Meta-progression unlocks new towers, cards, and maps.

### 1.2 Design Pillars
1. **Every placement matters.** Tight economy — you should feel credit-starved, not flush.
2. **You're not supposed to win every time.** Maps should feel fair-but-hard. Early runs teach, later runs test.
3. **Visible progression.** Even on loss, players unlock something — a challenge card, a new tower, something.
4. **Variable rewards hit every 30 seconds.** Between waves, on kills, on boss drops, on challenges completed.
5. **Sessions are bite-sized.** A single map should be 3–15 minutes depending on difficulty. The survival map is the "I have an hour" option.

### 1.3 Target Platform
- **Primary**: mobile web browser (portrait orientation, touch-first).
- **Secondary**: desktop browser.
- Built as a single HTML/CSS/JS bundle. No backend. All state in `localStorage`.

### 1.4 Tech Stack
- Vanilla JS + HTML Canvas for game rendering.
- CSS for UI chrome (HUD, modals, menus).
- `localStorage` for save data.
- Fonts: Orbitron (display), VT323 (terminal/retro), JetBrains Mono (body).
- **No frameworks required.** Keep the bundle tight and load-fast.

---

## 2. Core Gameplay Loop

### 2.1 One Round (Wave)
1. Player taps **START WAVE**.
2. Enemies spawn at the intrusion port and travel along the path toward the mainframe.
3. Towers auto-target and fire at enemies in range.
4. Enemies that reach the end deal damage to player Integrity (HP).
5. Killed enemies drop Credits.
6. Wave ends when all enemies are dead.
7. Game over when Integrity hits 0.

### 2.2 Between Waves
1. Wave bonus credits awarded (scales with wave number).
2. **Card draft modal** appears: choose 1 of 3 cards (see §4).
3. Player can place/sell towers, then start the next wave.

### 2.3 Map Completion
- Win: survive all waves on a map.
- Completion unlocks new content (see §7) and saves to meta-progression.

---

## 3. Maps

### 3.1 Structure
Each map has 3 difficulty tiers. You must complete the previous difficulty of a map to unlock the next. You must complete the **easy** tier of map N to unlock map N+1.

**Wave counts per difficulty:**
- **EASY**: 20 waves. Bosses on waves 10, 20. Mini-bosses on 5, 15.
- **MEDIUM**: 35 waves. Bosses on 10, 20, 30. Mini-bosses on 5, 15, 25, 35.
- **HARD**: 50 waves. Bosses on 10, 20, 30, 40, 50. Mini-bosses on 5, 15, 25, 35, 45.

### 3.2 Map List

| # | ID | Name | Theme | Paths | Notes |
|---|------|------|-------|-------|-------|
| 1 | `grid01` | **GRID.01** | Training subnet, blue/cyan | 1 | Tutorial map. Intel cards introduce mechanics. |
| 2 | `nexus` | **NEXUS HUB** | Corporate backbone, purple | 2 converging | Enemies from two directions merge into one path. |
| 3 | `blackice` | **BLACK ICE** | Deep system core, red | 3 converging | Triple intrusion points. |
| 4 | `mainframe` | **MAINFRAME** | Retro mainframe, green-on-black | 1 long winding | Very long path, rewards early slows. |
| 5 | `datalake` | **DATA LAKE** | Aquatic data storage, teal | 2 parallel | Two parallel paths, don't share towers well. |
| 6 | `crypto` | **CRYPTO VAULT** | Gold/black, vault | 1 spiral | Spiral path, great for AoE stacking. |
| 7 | `neondistrict` | **NEON DISTRICT** | Street-level cyberpunk, magenta | 2 crossing | Two paths cross — X intersection. |
| 8 | `orbital` | **ORBITAL NODE** | Space station, silver/blue | 3 from edges | Three entry points around a central core. |
| 9 | `infernet` | **INFERNET** | Hellish corrupted net, orange/red | 2 converging + 1 shortcut | A fast shortcut path carries elites. |
| 10 | `deeproot` | **DEEP ROOT** | Organic root system, dark green | 4 entries branching | Fractal branching paths. The endgame. |
| ∞ | `survival` | **SURVIVAL.EXE** | Glitched null zone | 1 long | Infinite waves, escalating forever. Unlocked after clearing `mainframe` easy. |

### 3.3 Map Properties (data schema)
```js
{
  id: 'grid01',
  name: 'GRID.01',
  fullName: 'TRAINING SUBNET',
  order: 1,                      // unlock order
  paths: [ [{x,y},{x,y}, ...] ], // array of paths (grid coords)
  cols: 9, rows: 11,             // grid size
  bgColor: '#020a14',            // map-specific background
  accentColor: '#00fff0',        // path + theme color
  difficulties: {
    easy: { waves: 20, startHp: 20, startCredits: 90, hpScale: 1.22, speedScale: 1.02, rewardScale: 1.0 },
    medium: { waves: 35, startHp: 18, startCredits: 80, hpScale: 1.28, speedScale: 1.04, rewardScale: 0.95 },
    hard: { waves: 50, startHp: 15, startCredits: 70, hpScale: 1.34, speedScale: 1.06, rewardScale: 0.9 },
  },
  enemyPool: {
    // phase 1 = first third of waves, phase 2 = middle, phase 3 = final third
    phase1: ['worm', 'spider'],
    phase2: ['worm', 'spider', 'trojan'],
    phase3: ['trojan', 'rootkit'],
  },
  bosses: {
    // wave → boss enemy id
    easy: { 10: 'kernel', 20: 'daemon' },
    medium: { 10: 'kernel', 20: 'daemon', 30: 'leviathan' },
    hard: { 10: 'kernel', 20: 'daemon', 30: 'leviathan', 40: 'daemon', 50: 'voidlord' },
  },
  rewards: {
    easyClear:    { type: 'unlock-card', id: 'firewall_basic' },
    mediumClear:  { type: 'unlock-tower', id: 'quantum' },
    hardClear:    { type: 'unlock-card', id: 'legendary_overclock' },
  },
}
```

### 3.4 Survival Mode (`survival`)
- **Unlocked after beating** `mainframe` on easy.
- Infinite waves. HP/speed/reward scaling continues forever.
- **Card draft every wave.** Player can draft from the **full pool of unlocked cards** (not just 3 — player can see the entire unlocked collection and pick one each wave).
- Every 10 waves = boss. Every 25 waves = mega boss. Every 50 waves = unique "null zone" event (e.g., all enemies invisible for 3 waves, double speed for 5 waves, etc.).
- Leaderboard saved to `localStorage` (best wave reached).
- Cosmetic title unlocks: Wave 25 → "Script Kiddie", 50 → "Netrunner", 100 → "Ghost", 150 → "Legend", 200 → "Null".

---

## 4. Card System (Slay-the-Spire style)

### 4.1 Card Draft Flow
- After every wave (except wave 1 on survival, which offers starter picks), show 3 cards.
- Each card has a **rarity**: Common / Rare / Epic / Legendary.
- Pick one, it applies immediately (buff, heal, credit, or tower unlock).
- **Skip option**: player can skip the draft for +40 credits. Adds strategic depth.

### 4.2 Rarity Weights
Base weights, modified by wave number (later waves = better odds):
```js
base = { common: 60, rare: 28, epic: 10, legendary: 2 }
per_wave_bonus = { rare: +0.5, epic: +0.3, legendary: +0.2 }
```

### 4.3 Card Pool (at minimum — expand freely)

**Tower unlock cards** (one-time effect per run):
- `FIREWALL CHIP` (C) — unlock Firewall tower
- `HONEYPOT CHIP` (C) — unlock Honeypot
- `ANTIVIRUS CHIP` (R) — unlock Antivirus
- `QUANTUM CHIP` (R) — unlock Quantum
- `ICE-BREAKER CHIP` (E) — unlock ICE (AoE)
- `MINE CHIP` (R) — unlock Logic Mine (triggered by proximity)
- `CHAIN CHIP` (E) — unlock Chain Lightning tower
- `RAILGUN CHIP` (L) — unlock Railgun (pierces all)

**Credit injections**:
- `CREDIT INJECT` (C) — +50¢
- `CRYPTO HEIST` (R) — +120¢
- `DARK POOL` (E) — +250¢
- `PRISM ACCOUNT` (L) — +500¢ + passive 3¢/sec

**Global damage buffs**:
- `OVERCLOCK v1/v2/v3/MAX` (C/R/E/L) — +12/22/40/75% damage

**Global range / fire rate / crit buffs** — similar tiers.

**Healing / max HP**:
- `INTEGRITY PATCH` (C) — restore 3 HP
- `SYSTEM RESTORE` (R) — restore 6 HP
- `HARDENED CORE` (E) — +4 Max HP and fully heal
- `IMMORTAL PROTOCOL` (L) — revive once on death with 5 HP

**Specialist cards** (buff one tower type):
- `FIREWALL SPECIALIST` (R) — Firewall towers +50% damage
- `SNIPER PROTOCOL` (E) — Antivirus towers +100% range
- `CRIT THEORIST` (E) — Quantum crit chance +15%

**Exotic / Legendary**:
- `TIME DILATION` (L) — all enemies -25% speed permanently
- `REPLICATOR` (L) — first tower placed each wave is free
- `GLASS CANNON` (L) — towers deal +100% damage, take -50% sell value
- `ECONOMIST` (L) — enemies drop 50% more credits

### 4.4 Unlocked Card Pool
- Each **unique card** has an "unlocked" flag in save data.
- On draft, only unlocked cards can appear.
- Starting pool: every Common card + `ANTIVIRUS CHIP` + `QUANTUM CHIP` + basic credit/heal rares. About 15 cards.
- Unlocks come from map clears and challenges.

---

## 5. Towers

### 5.1 Tower List

| Tower | Cost | DMG | Range | Fire | Special | Unlocked By |
|-------|------|-----|-------|------|---------|-------------|
| **Firewall** | 55 | 12 | 2.2 | 1.2/s | Reliable frontline | Starter (always available) |
| **Honeypot** | 65 | 3 | 1.9 | 1.8/s | 45% slow, 1.8s | `HONEYPOT CHIP` card |
| **Antivirus** | 95 | 55 | 3.6 | 0.55/s | Long-range sniper | `ANTIVIRUS CHIP` card or clear `grid01` medium |
| **Quantum** | 130 | 22 | 2.6 | 1.4/s | 35% crit, 3.5× | `QUANTUM CHIP` card or clear `nexus` medium |
| **ICE-Breaker** | 160 | 85 | 2.8 | 0.38/s | AoE radius 0.9 | `ICE-BREAKER CHIP` card or clear `blackice` easy |
| **Logic Mine** | 80 | 150 (one-shot) | 1.0 | N/A | Triggers when enemy enters range, destroys itself | Clear 3 challenges in `mainframe` |
| **Chain Lightning** | 175 | 40 | 2.4 | 0.7/s | Arcs to 3 nearest enemies | Clear `datalake` hard |
| **Railgun** | 220 | 200 | 5.0 | 0.25/s | Pierces all enemies in line | Clear `deeproot` medium |

### 5.2 Tower Upgrade System (per-tower, not global)
Each tower has up to **3 in-game upgrade levels** purchased with credits during a run:
- **Level 1 → 2**: cost = 0.8× base cost. +35% damage.
- **Level 2 → 3**: cost = 1.2× base cost. +50% damage + unique effect per tower type:
  - Firewall L3: adds small burn DoT
  - Honeypot L3: slow becomes AoE
  - Antivirus L3: first shot on a target deals 2× damage
  - Quantum L3: crit chance +15%
  - ICE-Breaker L3: AoE radius +30%
  - Chain Lightning L3: arcs to 5 instead of 3
  - Railgun L3: fires 2× per trigger

When a tower is selected, show an **UPGRADE** button alongside SELL. Upgrade button shows cost and what it'll do.

---

## 6. Enemies

### 6.1 Enemy List

| ID | Name | Threat | HP | Speed | Reward | DMG | Special |
|----|------|--------|-----|-------|--------|-----|---------|
| `worm` | WORM | LOW | 28 | 1.5 | 5¢ | 1 | Basic |
| `spider` | CRAWLER | LOW | 16 | 2.8 | 4¢ | 1 | Fast |
| `trojan` | TROJAN | MEDIUM | 70 | 1.1 | 14¢ | 2 | Armored |
| `rootkit` | ROOTKIT | HIGH | 180 | 0.85 | 28¢ | 3 | Heavy armor |
| `phantom` | PHANTOM | HIGH | 45 | 2.0 | 18¢ | 2 | 50% damage reduction except crits |
| `wraith` | WRAITH | EXTREME | 100 | 1.6 | 35¢ | 4 | Immune to slow |
| `leech` | LEECH | MEDIUM | 40 | 1.4 | 10¢ | 1 | Heals enemies behind it |
| `bomber` | BOMBER | HIGH | 60 | 1.3 | 20¢ | 5 on death | Explodes on death, AoE damage to towers |
| `stealth` | GHOST | HIGH | 50 | 1.8 | 22¢ | 2 | Invisible 50% of the time |
| `kernel` | KERNEL | BOSS | 900 | 0.75 | 120¢ | 5 | Standard boss — big HP sponge |
| `daemon` | DAEMON | BOSS | 650 | 1.2 | 100¢ | 4 | Spawns 3 worms at 50% HP |
| `leviathan` | LEVIATHAN | MEGA BOSS | 1800 | 0.6 | 250¢ | 8 | Heals nearby enemies every 2s, slow-immune |
| `voidlord` | VOID LORD | FINAL | 4500 | 0.8 | 500¢ | 15 | 30% damage reduction, all immunities |
| `swarm` | SWARM QUEEN | MEGA BOSS | 1200 | 0.9 | 200¢ | 6 | Spawns spider every 1.5s |
| `corruptor` | CORRUPTOR | MEGA BOSS | 2200 | 0.7 | 300¢ | 10 | Disables one random tower per 8s |

### 6.2 Enemy Intel Cards
First time a player encounters a specific enemy type (tracked in `meta.seenEnemies`), pause the game and show a full intel card:
- Animated preview render of the enemy
- Name, threat level, stats
- Description (lore blurb)
- **Counter tip** (green highlighted box: "Use QUANTUM crits to bypass armor")
- **ACKNOWLEDGED** button to dismiss and begin the wave.

### 6.3 Wave Composition Rules
- **Tight early game**: wave 1 should be 4–5 weakest enemies only, spaced to allow one tower placement to handle them. **The player must NOT take damage on wave 1 with a single starter tower.**
- Ramp enemy variety gradually. Don't introduce Trojans until wave 4 minimum, Rootkits until wave 8, Phantoms until wave 12.
- Boss waves include minion softener (5–10 weak enemies) before the boss spawns, giving time to build economy.

---

## 7. Meta-Progression & Unlocks

### 7.1 Save Data Schema (`localStorage` key: `netrunner_meta`)
```js
{
  version: 1,
  completed: {
    grid01: { easy: true, medium: false, hard: false },
    nexus:  { easy: false, ... },
    // ... all maps
  },
  unlockedCards: Set<string>,     // card IDs
  unlockedTowers: Set<string>,    // tower IDs — persistent starting tower pool
  seenEnemies: Set<string>,
  challengesCompleted: Set<string>,
  stats: {
    totalRuns: 0,
    totalWins: 0,
    totalKills: 0,
    killsByTower: { firewall: 0, antivirus: 0, ... },
    killsByEnemy: { worm: 0, ... },
    bossKills: 0,
    survivalBestWave: 0,
    totalCreditsEarned: 0,
  },
  settings: {
    sfx: true, music: true,
    particleQuality: 'high',
  },
}
```

### 7.2 Map Completion Rewards
Each map × difficulty combo rewards something unique:
- **Easy clear**: a new common/rare card
- **Medium clear**: a new tower OR a new epic card
- **Hard clear**: a new legendary card or cosmetic

### 7.3 Challenge System
Challenges are objectives tracked across all runs. When unlocked, they award specific cards.

**Tower challenges**:
- `firewall_killer` — Kill 500 enemies with Firewall towers → unlocks `FIREWALL SPECIALIST` card
- `antivirus_sniper` — Kill 100 enemies from max range with Antivirus → unlocks `SNIPER PROTOCOL`
- `quantum_crit` — Land 300 crits → unlocks `CRIT THEORIST`
- `ice_wiper` — Kill 10 enemies with a single ICE-Breaker shot → unlocks `CHAIN CHIP`
- `mine_slayer` — Kill 50 enemies with Logic Mines → unlocks `MINE SPECIALIST`

**Enemy kill challenges**:
- `pest_control` — Kill 1000 Worms → `ECONOMIST` card
- `armor_piercer` — Kill 100 Rootkits → `HARDENED CORE` pre-unlocked
- `ghost_buster` — Kill 50 Phantoms → `GLASS CANNON`
- `boss_hunter` — Kill 25 bosses → `TIME DILATION`
- `final_blow` — Kill the Void Lord → `IMMORTAL PROTOCOL`

**Run challenges**:
- `flawless` — Clear a map without losing any HP → `REPLICATOR`
- `minimalist` — Clear a map with 3 or fewer towers → `RAILGUN CHIP`
- `speedrun` — Clear `grid01` easy in under 5 minutes (real time) → cosmetic
- `full_stack` — Win with at least one of every tower type placed → `PRISM ACCOUNT`
- `no_legendaries` — Win `blackice` hard without drafting any legendary → `DARK POOL` pre-unlocked

**Survival challenges**:
- `survivor_25` — Reach wave 25 in survival → title "Script Kiddie"
- `survivor_50` — Reach wave 50 → title "Netrunner" + new survival-only starter
- `survivor_100` — Reach wave 100 → legendary card + title "Ghost"

### 7.4 Unlock Flow
- Challenges tracked silently during play.
- On unlock, pop a **non-blocking toast** in the corner: `🏆 CHALLENGE: firewall_killer`
- On main menu, a **Challenges** tab shows locked/unlocked challenges with progress bars.

---

## 8. UI / UX

### 8.1 Screens
1. **Start screen** — logo, "JACK IN" button, links to Challenges, Stats, Settings
2. **Map select** — scrollable list of 10 maps + survival. Each map shows its 3 difficulty rows. Unreached difficulties are locked with reason ("Clear EASY to unlock").
3. **Game screen** — HUD top, canvas middle, action bar bottom (pause/speed/start wave)
4. **Pause menu** (see §8.2)
5. **Card draft modal** — 3 cards + skip button (+40¢)
6. **Enemy intel modal** — new enemy introduction
7. **Tower upgrade popup** — info + upgrade + sell
8. **Game over / Victory screen** — stats, unlocks earned, challenges completed, retry / map select

### 8.2 Pause Menu (CRITICAL FIX)
When the player taps the **menu button** (☰) during play, show a pause overlay that **freezes the game** (pauses all updates). Options:
- **RESUME** — close overlay, unpause
- **RESTART RUN** — confirm, reset current map run
- **MAIN MENU** — confirm, return to map select
- **SETTINGS** — toggle sound, particle quality
- **HOW TO PLAY** — brief rules recap

The menu button must NOT auto-restart. It only opens this overlay.

### 8.3 HUD (top bar)
- Integrity (HP) — red theme
- Credits — yellow
- Wave (current/total) — cyan
- Map name — magenta

### 8.4 Bottom Action Bar
- ☰ Menu (opens pause menu)
- ⏩ Speed toggle: 1× / 2× / 3×
- CANCEL (only visible while placing a tower)
- START WAVE (primary, magenta glow)

### 8.5 Tower Placement Flow
1. Tap empty valid cell → tower palette slides up from bottom
2. Tap a tower in palette → palette closes, placement mode active, ghost tower follows cursor
3. Tap valid cell → tower placed, credits deducted
4. CANCEL button aborts placement

### 8.6 Tower Interaction
- Tap existing tower → info popup: stats, upgrade button (if affordable), sell button
- Upgrade cost scales per level (see §5.2)
- Sell returns 70% of total invested cost

### 8.7 Visual Juice (keep high)
- Damage numbers flying off enemies with variance
- Crits render yellow, bigger, with `!` suffix
- Screen shake on boss hits and damage taken
- Particle explosions on AoE
- Homing projectiles with trails
- Wave banner animation (glitchy letter spacing at entry)
- Legendary cards pulse with golden glow
- HUD values pulse-scale on change
- Portal rings at path endpoints

---

## 9. Balancing — CRITICAL (this is the biggest current pain point)

### 9.1 Golden Rule
> **Wave 1 with a single starter Firewall tower must be winnable without taking damage, on every map's easy difficulty.**

### 9.2 Wave 1 Specification (easy)
- 4–5 `worm` enemies max, HP **20 each** (not 28 — wave 1 is softer than base).
- Spawn delay 1.0s (slow trickle — tower can shoot them one at a time).
- Starting Firewall (55 credits, 12 dmg, 1.2 fire rate = ~14.4 DPS).
- Time to kill one worm ≈ 1.4s. Wave 1 should take ~8–10 seconds of combat.
- Starting credits should allow **one Firewall at the start** AND leave 15–25¢ buffer. E.g., 90 starting credits → one Firewall (55¢), 35¢ leftover.

### 9.3 HP Scaling
```
easy:   hp_mult(wave) = 1 + (wave - 1) * 0.22
medium: hp_mult(wave) = 1 + (wave - 1) * 0.28
hard:   hp_mult(wave) = 1 + (wave - 1) * 0.34
```
A worm on wave 10 easy = 28 × (1 + 9×0.22) = 28 × 2.98 ≈ **83 HP**.
A worm on wave 20 easy = 28 × (1 + 19×0.22) = 28 × 5.18 ≈ **145 HP**.

Boss HP uses a separate formula with steeper scaling (see §6.1 base values × (1 + (wave/10 - 1) × 0.6)).

### 9.4 Enemy Count per Wave
```
count(wave) = clamp(5 + floor(wave * 1.1), 5, 25)   // normal waves
```
Boss waves = 40% of normal count as minion softener + 1 boss.

### 9.5 Wave 1 Enemy Count Override
Hard-code: **wave 1 = 4 enemies.** Always. No scaling formula.

### 9.6 Spawn Delay
```
delay(wave) = max(0.4, 1.05 - wave * 0.025)   // seconds between spawns
```
Wave 1 = 1.0s. Wave 20 = 0.55s. Wave 50 = 0.4s (capped).

### 9.7 Reward Scaling
```
reward_mult(wave) = 1 + (wave - 1) * 0.06
```
Slight reward growth — enough that killing wave 20 enemies feels meaningfully better than wave 5, but not so much that late-game credits trivialize tower purchases.

### 9.8 Wave Bonus (end of wave)
```
wave_bonus = 20 + wave * 4
```
Wave 1 clear → 24¢. Wave 20 clear → 100¢. Wave 50 clear → 220¢.

### 9.9 Difficulty Economy Tuning
- **Easy**: starting HP 20, credits 90. Player has breathing room.
- **Medium**: 18 HP, 80 credits. Tighter, requires planning.
- **Hard**: 15 HP, 70 credits. One mistake can cascade. No wave 1 tower = auto-lose.

### 9.10 Critical Balancing Rule
**Playtesting checklist before ship**:
1. Can a player clear `grid01` easy with no card luck and optimal play? (Yes — always.)
2. Can a player clear `grid01` medium on first attempt? (Maybe — 30% chance.)
3. Can a player clear `grid01` hard on first attempt? (No — requires learned strategy.)
4. Is wave 1 surviveable without taking a hit on every map's easy? (YES, always.)
5. Does it take at least 20 runs to unlock all content? (Yes.)

---

## 10. File / Code Structure

Keep it clean and modular. Proposed file layout:

```
/
├── index.html              # entry point, minimal HTML shell
├── CLAUDE.md               # this file
├── README.md               # player-facing how-to-play
├── /css
│   └── main.css            # all styles
├── /js
│   ├── main.js             # game bootstrap, main loop
│   ├── state.js            # game state + save/load
│   ├── maps.js             # map definitions
│   ├── enemies.js          # enemy definitions + behaviors
│   ├── towers.js           # tower definitions + behaviors
│   ├── cards.js            # card pool + draft logic
│   ├── challenges.js       # challenge definitions + tracking
│   ├── waves.js            # wave generator
│   ├── render.js           # canvas rendering (towers, enemies, effects)
│   ├── ui.js               # modals, menus, HUD DOM
│   ├── input.js            # touch/mouse input handling
│   └── audio.js            # sfx/music (optional, placeholder ok)
└── /assets
    └── /fonts              # if self-hosting, else Google Fonts
```

Or keep single-file for v1, split later.

---

## 11. Implementation Priorities (Build Order)

### Phase 1 — Core Loop Fix (MUST SHIP)
1. Fix wave 1 balancing (see §9.2 — player must not lose HP on wave 1 with starter tower).
2. Implement pause menu (§8.2) — menu button must pause, not auto-restart.
3. Ensure map select shows all 10 maps (locked/unlocked) + survival.

### Phase 2 — Difficulty Tiers
4. Implement easy/medium/hard difficulty selection per map.
5. Update save schema to track completion per difficulty.
6. Gate map N unlock on clearing map N-1 easy.

### Phase 3 — Content Expansion
7. Build out all 10 maps with paths + themes.
8. Add new enemies (leech, bomber, stealth, swarm queen, corruptor).
9. Add new towers (logic mine, chain lightning, railgun).
10. Expand card pool to 40+ cards.

### Phase 4 — Meta-Progression
11. Challenge system with tracking + toast notifications.
12. Challenges tab on main menu.
13. Tower per-run upgrade system (§5.2).

### Phase 5 — Survival Mode
14. Infinite survival map.
15. Full-pool card draft (pick from all unlocked).
16. Leaderboard + titles.

### Phase 6 — Polish
17. Audio (tower fire, enemy death, card draft chime, boss warning).
18. Settings menu.
19. Stats tab showing career numbers.
20. Cosmetic themes unlocked by hard clears.

---

## 12. Open Design Questions (for future iteration)

- Should card draft offer a **re-roll** button for 30¢?
- Should towers have a **rotation/facing** that player can set manually?
- Should there be **map modifiers** (e.g., "fog of war — towers have -20% range") for extra challenge?
- Should survival have a **death save** via `IMMORTAL PROTOCOL` that resurrects player once?
- Should completing all hard difficulties unlock a **NIGHTMARE** 4th tier with special modifiers?
- Should there be **synergy cards** that only appear if certain conditions are met (e.g., "CRIT SURGE — epic, only appears if you have 2+ Quantum towers placed")?

---

## 13. Non-Goals (explicit scope cuts)

- **No online multiplayer.** Single-player only.
- **No monetization hooks.** No ads, no IAP, no gacha.
- **No voice acting or cutscenes.** Lore lives in enemy intel cards and flavor text.
- **No procedural map generation** for v1. Hand-designed maps only.
- **No tower variants / skins** for v1. Theme variety comes from the cards/towers themselves.

---

## 14. Visual / Aesthetic Direction

### 14.1 Mood Board
- **Dominant**: deep blacks and cyans, hot magenta accents
- **Typography**: Orbitron for display, VT323 for terminal/retro HUD, JetBrains Mono for body
- **Texture**: scanlines overlay + film grain, subtle
- **Motion**: everything has a slight glitch/jitter, nothing is completely static
- **Inspiration**: Ghost in the Shell, Blade Runner 2049, Hotline Miami UI, Hackmud

### 14.2 Color Palette (CSS variables)
```css
--bg: #05060a;
--bg-panel: #0a0e18;
--bg-raised: #121826;
--cyan: #00fff0;
--magenta: #ff2d95;
--yellow: #ffd600;
--green: #00ff88;
--red: #ff3355;
--purple: #b847ff;
--orange: #ff6600;
--text: #e0f4f7;
--text-dim: #6b8090;
/* Rarity */
--common: #7a8a9a;
--rare: #00aaff;
--epic: #b847ff;
--legendary: #ffae00;
```

### 14.3 Rendering Rules
- All towers and enemies drawn on canvas with geometric primitives + glow (shadowBlur).
- No sprite assets in v1 — procedural art only, keeps bundle tiny.
- Each enemy type has a **unique silhouette** (worm = segmented, spider = legs, trojan = hex, rootkit = spiked, phantom = wispy, wraith = trailed, bosses = rotating rings).
- Each tower type has a **unique animated element** (firewall = rotating cage, antivirus = long scoped barrel, honeypot = orbiting dots, ice = 4 prongs, quantum = orbiting particles).

---

## 15. Definition of Done

A feature is "done" when:
1. It works on both mobile and desktop browsers (portrait + landscape).
2. It has no console errors.
3. It saves/loads correctly to `localStorage`.
4. It passes the balancing playtests in §9.10.
5. It matches the visual direction in §14.
6. The code is commented at the function level.
