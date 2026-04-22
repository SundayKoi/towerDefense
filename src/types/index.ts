// Core type definitions for NETRUNNER tower defense.

export type Vec2 = { x: number; y: number };

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export type TowerId =
  | 'firewall'
  | 'honeypot'
  | 'antivirus'
  | 'quantum'
  | 'ice'
  | 'mine'
  | 'chain'
  | 'railgun'
  | 'pulse'
  | 'sniper'
  | 'scrambler'
  | 'sentinel'
  | 'booster_node'
  | 'data_miner'
  | 'heat_sink';

export type EnemyId =
  | 'worm'
  | 'spider'
  | 'trojan'
  | 'rootkit'
  | 'phantom'
  | 'wraith'
  | 'leech'
  | 'bomber'
  | 'stealth'
  | 'kernel'
  | 'daemon'
  | 'leviathan'
  | 'voidlord'
  | 'swarm'
  | 'corruptor'
  | 'glitch'
  | 'juggernaut'
  | 'parasite';

export type Difficulty = 'easy' | 'medium' | 'hard';

// Damage classification — enemies may resist or be weak to each type.
export type DamageType = 'kinetic' | 'energy' | 'aoe' | 'chain' | 'pierce';

// Port/Protocol — a secondary "open vulnerability" tag on enemies + "exploit"
// tag on turrets. When a turret fires at an enemy with matching port, damage
// gains a bonus (see PORT_EXPLOIT_MULT in engine). This layer is orthogonal to
// damage types: it rewards diverse turret builds where each specialist has one
// enemy they're particularly lethal against, on top of the type-resist system.
export type Port = 'SSH' | 'HTTP' | 'DNS' | 'SMB' | 'ICMP';
export const ALL_PORTS: readonly Port[] = ['SSH', 'HTTP', 'DNS', 'SMB', 'ICMP'] as const;

// Per-tower target priority.
export type TargetMode = 'first' | 'strong' | 'weak' | 'close';

// Active debuff on a tower instance from enemy abilities.
export type TowerDebuff = { kind: 'jammed' | 'infected'; timeLeft: number };
// Per-tower grace-period cooldowns keyed by debuff kind. When a debuff expires
// the tower is immune to that same kind for ~2s, which stops cascading re-jams
// from phantom death bursts + rootkit aura + sector modifier firing in sequence.
export interface TowerDebuffCooldowns { jammed?: number; infected?: number }

// Packet-drop loot — drops from a small % of enemy kills. Tap within the
// window to claim a timed buff. Rewards attention during waves without
// punishing AFK play (missed packets just fade).
export type PacketKind = 'dmg' | 'rate' | 'xp' | 'hp';
export interface Packet {
  id: number;
  pos: Vec2;
  kind: PacketKind;
  timeLeft: number;
  maxTime: number;
}

// Persistent ground effect dropped by towers on hit.
export interface Puddle {
  pos: Vec2;
  radius: number;
  timeLeft: number;
  maxTime: number;
  slowPct: number;
  slowDuration: number;
  damagePerSec?: number; // acid/fire damage to enemies standing in puddle
  color?: string;        // override for non-honeypot puddles
  fromTower?: TowerId;   // source tower for damage tracking
}
export const TARGET_MODES: readonly TargetMode[] = ['first', 'strong', 'weak', 'close'] as const;

export interface TowerDef {
  id: TowerId;
  name: string;
  damage: number;
  range: number;
  fireRate: number;
  projectileSpeed: number;
  projectileColor: string;
  trailColor: string;
  baseColor: string;
  accentColor: string;
  damageType: DamageType;
  description: string;
  special?: string;
  slow?: { pct: number; duration: number };
  crit?: { chance: number; mult: number };
  aoe?: { radius: number };
  chain?: { jumps: number; falloff: number };
  pierce?: boolean;
  mine?: boolean;
}

export interface EnemyDef {
  id: EnemyId;
  name: string;
  threat: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' | 'BOSS' | 'MEGA' | 'FINAL';
  hp: number;
  speed: number;
  xp: number; // XP granted on kill
  damage: number;
  armor?: number;
  slowImmune?: boolean;
  // Soft slow resistance: 0 = no resistance (default), 0.5 = half-slow, 1.0 is
  // functionally equivalent to slowImmune. Applied by the applySlow helper in
  // engine.ts — lets an enemy take slows but feel sluggish rather than
  // unaffected (e.g. wraith resists 50% of the applied slow).
  slowResistPct?: number;
  invisChance?: number;
  bossScale?: boolean;
  color: string;
  accent: string;
  description: string;
  counterTip: string;
  size: number;
  // Multiplier per damage type. Missing keys = 1.0 (normal). 0 = immune, <1 = resistant, >1 = weak.
  resistances?: Partial<Record<DamageType, number>>;
  // Crit ignores non-zero resistance? (Phantoms historically)
  critIgnoresResist?: boolean;
  // Added to the render rotation so sprites drawn facing a non-east direction still point forward.
  // π/2 for NORTH-facing sprites (most humanoid/insect designs), 0 for EAST-facing (worm, leech).
  spriteAngleOffset?: number;
}

export interface CardDef {
  id: string;
  name: string;
  rarity: Rarity;
  description: string;
  category: 'deploy' | 'upgrade' | 'buff' | 'heal' | 'exotic';
  towerHint?: TowerId;   // for styling deploy/upgrade cards by tower color
  towerHint2?: TowerId;  // synergy cards: BOTH towers must be placed for card to appear
  requires?: string[];   // card IDs that must be in cardsPicked before this appears
  excludes?: string[];   // card IDs that LOCK this one out — used for branch commitment
  branch?: string;       // optional branch label (e.g. 'firewall.suppression') for UI grouping
  // Repeatable cards bypass the "already picked this run" filter. Used for a
  // handful of universal stat-bump cards that fill draft slots once the
  // tower-specific pool thins out (esp. on early maps with few unlocks).
  repeatable?: boolean;
  apply: (state: RunState) => void;
}

export interface MapPath {
  points: Vec2[];
}

export interface MapDef {
  id: string;
  name: string;
  fullName: string;
  order: number;
  cols: number;
  rows: number;
  paths: MapPath[];
  bgColor: string;
  accentColor: string;
  secondaryColor: string;
  difficulties: Record<Difficulty, {
    waves: number;
    startHp: number;
    hpScale: number;
    speedScale: number;
    rewardScale: number; // retained but unused after pivot
  }>;
  enemyPool: {
    phase1: EnemyId[];
    phase2: EnemyId[];
    phase3: EnemyId[];
  };
  bosses: Record<Difficulty, Record<number, EnemyId>>;
  rewards: {
    // unlock-branch id format: `{towerId}.{branchKey}` e.g. `firewall.brst`.
    // Grants every card in that branch (keystone + 4 + capstone = 6 cards).
    easyClear?: { type: 'unlock-card' | 'unlock-tower' | 'unlock-branch' | 'protocols'; id: string };
    mediumClear?: { type: 'unlock-card' | 'unlock-tower' | 'unlock-branch' | 'protocols'; id: string };
    hardClear?: { type: 'unlock-card' | 'unlock-tower' | 'unlock-branch' | 'protocols'; id: string };
  };
  // Sector index for grouping (1–7). Used for prestige tracking + start-screen badges.
  // Post-overhaul: aliased with `act` — each sector IS an act. Kept as `sector` for save compat.
  sector?: number;
  // Act metadata — surfaced in the map-select UI and act-briefing modal.
  act?: number;          // 1–7, mirrors sector
  actName?: string;      // display name shown on briefing/map-select header ("SYSTEM BOOT")
  actTag?: string;       // one-line tagline ("Learn the grid.")
  // Cyberattack modifiers applied to every enemy spawned on this map.
  // All optional; absent = vanilla behavior.
  modifiers?: {
    packetBursts?: number;     // chance (0–1) a spawn drops a second enemy 0.1s later
    encrypted?: number;        // initial shield as % of max HP (0–1) — absorbed before HP damage
    stealthChance?: number;    // chance (0–1) an enemy spawns permanently cloaked
    replication?: number;      // chance (0–1) a killed enemy spawns a worm offspring
    rootkit?: number;          // jam interval (sec) — every N seconds while a boss is alive, jam a random tower
    lagSpike?: number;         // intensity (0–1) of periodic 1s speed surges every 20s — adds this much to the speed multiplier
  };
}

// ---------- Runtime entities ----------

export interface TowerInstance {
  id: number;
  def: TowerId;
  grid: Vec2;
  pos: Vec2;
  level: 1 | 2 | 3; // kept for visual level dots, only bumped by specific cards
  cooldown: number;
  targetId: number | null;
  angle: number;
  fireFlash: number;
  // Recoil offset (pixels) applied opposite the fire direction, decays over ~80ms.
  // Read in drawTower to displace the sprite for physical-fire feel.
  recoil: number;
  targetMode: TargetMode;
  debuffs: TowerDebuff[];
  debuffCooldowns: TowerDebuffCooldowns; // grace-period immunity after a debuff expires
  extras: Record<string, number>; // flexible per-tower state (shot counters, charge timers, etc.)
}

export interface EnemyInstance {
  id: number;
  def: EnemyId;
  hp: number;
  maxHp: number;
  pathIndex: number;
  progress: number;
  pos: Vec2;
  baseSpeed: number;
  speedMult: number;
  slowTimer: number;
  armor: number;
  alive: boolean;
  isBoss: boolean;
  size: number;
  invisTimer: number;
  hitFlash: number;
  angle: number;
  debuffTimer?: number;   // used by Rootkit to pace debuff application, -1 = signal has revived
  marked?: number;        // seconds remaining on mark debuff (takes +30% from all sources)
  collapseTimer?: number; // seconds until quantum-collapse temp armor multiplier expires
  collapseMult?: number;  // temp armor multiplier from quantum COLLAPSE/UNCERTAINTY — 1.0 = unaffected, 0.5 = half armor applied at damage-calc time
  // ENCRYPTED PAYLOADS sector modifier: enemies have a regenerating shield.
  shield?: number;        // current shield value (absorbed before HP)
  maxShield?: number;     // max shield value, for regen
  shieldRegenTimer?: number; // seconds since last damage; regens after 2s of no damage
  crackedTimer?: number;  // seconds remaining on CRACKED EXPOSURE — HP damage +25% after a shield break
  // VOIDLORD mid-fight phase shift: every 12s, the boss becomes immune to a
  // different damage type. Forces the player to cycle builds mid-fight and is
  // the primary anti-snowball mechanic for the Act 7 finale.
  phaseShiftType?: DamageType; // current type being resisted (100% resist)
  phaseShiftTimer?: number;    // seconds elapsed since last rotation
  // BOMBER detonation telegraph: when the bomber is within 0.8 tiles of the
  // end, this counts UP from 0 to 0.8s. While > 0, drawEnemy pulses red→white.
  // On reaching 0.8s, the bomber detonates (handled in engine).
  detonateTimer?: number;
  // Boss mechanic state. `bossSpawnTimer` ticks for SWARM QUEEN's periodic
  // minion spawn. `bossTriggered` is a one-shot flag for HP-threshold events
  // like DAEMON's 50% worm spawn. `regenCooldown` gates LEVIATHAN's damage-free
  // regen so each new hit resets the timer.
  bossSpawnTimer?: number;
  bossTriggered?: boolean;
  regenCooldown?: number;
  // Multi-phase bosses (KERNEL) use a numeric phase counter since a single boolean
  // can't gate a 66% and a 33% trigger. Defaults to 0; incremented when a threshold
  // fires. Also drives enraged speed/resist multipliers on tick.
  bossPhase?: number;
  enraged?: boolean;
}

export interface Projectile {
  id: number;
  pos: Vec2;
  target: number;
  targetPos: Vec2;
  damage: number;
  speed: number;
  color: string;
  trailColor: string;
  fromTower: TowerId;
  damageType: DamageType;
  aoe?: number;
  isCrit?: boolean;
  pierce?: boolean;
  slow?: { pct: number; duration: number };
  chain?: { jumps: number; falloff: number; hit: Set<number> };
  trail: Vec2[];
  // True on projectiles spawned from a firewall ricochet to prevent infinite re-ricochet.
  ricochetDone?: boolean;
}

export interface Particle {
  pos: Vec2;
  vel: Vec2;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  fade?: number;
  gravity?: number;
}

export interface FloatingText {
  pos: Vec2;
  text: string;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  // Damage-number physics (optional). When set, floater arcs with gravity
  // and lateral drift instead of the flat upward float used by status text.
  vx?: number;
  gravity?: number;
  isCrit?: boolean;
  outline?: string;
}

// ---------- Save / meta ----------

export interface PeriodStats {
  runs: number;
  wins: number;
  mediumWins: number;
  hardWins: number;
  kills: number;
  bossKills: number;
  wavesCleared: number;
  protocolsEarned: number;
  xpEarned: number;
  legendaryDrafts: number;
  uniqueTowersDeployed: string[];  // track tower IDs deployed this period
}

export interface ShopUpgradeDef {
  id: string;
  name: string;
  description: string;
  icon: string;         // short SVG / glyph
  baseCost: number;     // cost of first stack
  stackStep: number;    // cost increase per additional stack
  maxStacks: number;    // 1 for one-shot items
  effect: (save: SaveData, stacks: number) => void; // applies to save.metaBoosts
  category: 'power' | 'economy' | 'utility' | 'loadout';
}

export interface MetaBoosts {
  globalDamagePct: number;       // additional % damage baked into every run
  globalCritChancePct: number;   // +% global crit chance per run
  globalRatePct: number;         // +% global fire rate per run
  globalRangePct: number;        // +% global range per run
  bonusStartingHp: number;       // extra starting HP
  bonusProtocolsPerWave: number; // protocols awarded per wave cleared
  startingLevel: number;         // extra starting level
  extraDraftCards: number;       // extra card options per draft
  extraRerolls: number;          // free rerolls granted per draft
  xpBoostPct: number;            // bonus XP from kills
  startingDeployTokens: Partial<Record<TowerId, number>>; // deploy tokens granted at run start
  // Augments
  hasRevive: boolean;            // survive one lethal hit per run
  enemySpeedDebuff: number;      // reduce all enemy speed by this fraction
  hpRegenPerWave: number;        // HP restored each wave cleared
  globalArmorReduction: number;  // subtract from every enemy's spawn armor
  bossProtocolBonus: number;     // extra protocols per boss kill
}

export interface SaveData {
  version: number;
  completed: Record<string, Partial<Record<Difficulty, boolean>>>;
  unlockedCards: string[];
  unlockedTowers: TowerId[];
  seenEnemies: EnemyId[];
  challengesCompleted: string[];
  protocols: number;                        // meta currency
  shopPurchased: Record<string, number>;    // upgradeId -> stack count
  metaBoosts: MetaBoosts;                   // derived from shop, cached for quick apply
  quests: { completed: string[] };          // quest IDs claimed
  tutorial: { seen: string[] };             // first-time popup IDs already shown
  prestigeStars: number;                    // count of sector hard-clear stars (0–6); each = +1% global damage
  sectorClears: Record<number, boolean>;    // sector index → all 5 maps hard-cleared

  contracts: {
    daily:   { period: string; offered: string[]; claimed: string[]; stats: PeriodStats };
    weekly:  { period: string; offered: string[]; claimed: string[]; stats: PeriodStats };
    monthly: { period: string; offered: string[]; claimed: string[]; stats: PeriodStats };
  };
  // Seeded daily contract. Same (map, difficulty, mutator) for all players on the
  // same local date. Tracks attempts + best wave reached + best clear time so
  // players have a personal leaderboard to push against each day.
  dailyContract?: {
    period: string;        // YYYY-MM-DD local
    mapId: string;
    difficulty: Difficulty;
    mutator: string;       // mutator id — rotates daily, defines flavor
    attempts: number;
    bestWave: number;
    bestTimeSec: number;   // 0 = not yet cleared
    completed: boolean;
  };
  // Selected runner persona for regular runs. Each runner applies a distinct
  // passive + banned tower at run start. Default 'glitch' for returning saves.
  selectedRunner?: import('@/data/runners').RunnerId;
  // BRUTAL MODE toggle — persists across runs once unlocked (all 7 sectors
  // hard-cleared). Applied to every regular-map run when true.
  brutalMode?: boolean;
  // Cosmetic chromas — unlocked via lifetime milestones, equipped per-tower.
  unlockedChromas?: string[];
  equippedChromas?: Partial<Record<TowerId, string>>;
  // Seeded weekly + monthly challenge runs. Same shape as dailyContract.
  // Gated behind "beat campaign or unlock all base turrets" (see start.ts).
  weeklyContract?: {
    period: string;
    mapId: string;
    difficulty: Difficulty;
    mutator: string;
    attempts: number;
    bestWave: number;
    bestTimeSec: number;
    completed: boolean;
  };
  monthlyContract?: {
    period: string;
    mapId: string;
    difficulty: Difficulty;
    mutator: string;
    attempts: number;
    bestWave: number;
    bestTimeSec: number;
    completed: boolean;
  };
  stats: {
    totalRuns: number;
    totalWins: number;
    totalKills: number;
    killsByTower: Partial<Record<TowerId, number>>;
    killsByEnemy: Partial<Record<EnemyId, number>>;
    bossKills: number;
    survivalBestWave: number;
    totalXpEarned: number;
    totalProtocolsEarned: number;
    towersEverDeployed: string[];  // all tower types ever placed across runs
    legendaryDrafts: number;       // total legendary cards ever picked
  };
  settings: {
    sfx: boolean;
    music: boolean;
    particleQuality: 'low' | 'medium' | 'high';
    speed: 1 | 2;
    pixelMode: boolean;
    pixelFactor: number;
  };
}

// ---------- Run state ----------

export type Phase = 'prep' | 'wave' | 'draft' | 'intel' | 'paused' | 'gameover' | 'victory';

export interface RunState {
  mapId: string;
  difficulty: Difficulty;
  wave: number;
  totalWaves: number;
  hp: number;
  maxHp: number;
  phase: Phase;
  // XP + level progression (replaces credits)
  xp: number;          // XP since last level up
  level: number;       // current level
  xpToNext: number;    // XP needed to hit next level (absolute value for current level)
  // Deploy tokens: how many of each tower type the player has in hand
  deployTokens: Partial<Record<TowerId, number>>;
  // Protocols earned this run (added to save on run end)
  protocolsEarned: number;
  towers: TowerInstance[];
  enemies: EnemyInstance[];
  projectiles: Projectile[];
  puddles: Puddle[];
  packets: Packet[];
  // Short-lived run buffs from picking up packets. Ticked down per frame.
  packetBuffs: { dmgMult: number; rateMult: number; xpMult: number; timeLeft: number };
  // Active behavioral upgrades per tower type, applied via card picks.
  towerEffects: Partial<Record<TowerId, Set<string>>>;
  particles: Particle[];
  floaters: FloatingText[];
  spawnQueue: { def: EnemyId; pathIndex: number; delay: number; boss?: boolean }[];
  spawnElapsed: number;
  // Global + tower-specific modifiers from cards
  mods: {
    globalDamagePct: number;
    globalRangePct: number;
    globalRatePct: number;
    globalCritChance: number;
    enemySpeedMult: number;
    xpMult: number;
    towerDmg: Partial<Record<TowerId, number>>;
    towerRange: Partial<Record<TowerId, number>>;
    towerRate: Partial<Record<TowerId, number>>;
    towerCrit: Partial<Record<TowerId, number>>;
    revive: boolean;
    globalArmorReduction: number;
    bossProtocolBonus: number;
  };
  // Draft state
  showDraft: boolean;
  draftOptions: string[];
  draftSource: 'level' | 'wave' | 'start';
  draftRerollsLeft: number;
  // Selection / placement state
  selection: { kind: 'none' } | { kind: 'tower'; towerId: number } | { kind: 'placing'; def: TowerId };
  // UI flags
  shakeTime: number;
  shakeAmp: number;
  timeScale: number;
  // Hit-pause: world frozen for this many seconds (decremented in updateRun).
  // Set by tryKillEnemy at tiered durations (30/80/200ms for normal/elite/boss).
  // Particles and floaters continue — only enemy movement + projectiles pause.
  hitPause: number;
  elapsed: number;
  // Pending level-ups queued for when player is idle
  pendingLevelUps: number;
  // Tower IDs locked out for this run (hard-mode random turret lock).
  // Cards granting deploy tokens for these towers are filtered from drafts, and
  // the deploy palette hides them. Always empty on easy/medium.
  lockedTurrets: TowerId[];
  // Log of cards drafted this run (in order).
  cardsPicked: string[];
  // Countdown (seconds) until next wave auto-starts. null = not counting.
  autoStartTimer: number | null;
  // Cumulative damage dealt this run, per tower type
  damageDealt: Partial<Record<TowerId, number>>;
  // Enemy types encountered this run (for intro popups)
  seenThisRun: Set<EnemyId>;
  // Run-scoped counters for contracts / period stats
  killsThisRun: number;
  bossKillsThisRun: number;
  xpThisRun: number;
  legendariesThisRun: number;
  // Daily-contract runs pipe their mutator modifiers through here. Merged with
  // the map's base modifiers at read time via getEffectiveModifiers(). Also
  // signals to the run-end hook to write bestWave/bestTime back to save.
  isDailyContract?: boolean;
  isWeeklyContract?: boolean;
  isMonthlyContract?: boolean;
  contractMutators?: MapDef['modifiers'];
  runStartMs?: number;   // performance.now() at run start, for daily best-time
  // Program deck: active abilities the player triggers with 1-4 hotkeys or by
  // clicking the program chip. Each entry pairs a program id with its current
  // cooldownLeft. Initialized in createRun with the starter deck.
  runnerId?: import('@/data/runners').RunnerId;
  // Brutal-mode enemy multipliers, folded in at spawn time. 1.0 = off.
  brutalHpMult?: number;
  brutalSpeedMult?: number;
  // Per-tower chroma color overrides (accent/projectile/trail) — read by the
  // renderer to tint turrets the player has cosmetically customized. Keyed on
  // TowerId; missing entry means vanilla colors.
  chromaColors?: Partial<Record<TowerId, { accent: string; projectile: string; trail: string }>>;
  // BRUTAL MODE: stacked late-game difficulty replacing NG+/Ascension.
  // Applies +100% enemy HP, +25% speed, 2 extra random turret locks (with a
  // guardrail that keeps at least one AOE/chain turret available), draft
  // size floor of 2, and all sector modifiers at 60% strength.
  brutalMode?: boolean;
}
