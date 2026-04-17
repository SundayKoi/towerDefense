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
  | 'railgun';

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
  | 'corruptor';

export type Difficulty = 'easy' | 'medium' | 'hard';

// Damage classification — enemies may resist or be weak to each type.
export type DamageType = 'kinetic' | 'energy' | 'aoe' | 'chain' | 'pierce';

// Per-tower target priority.
export type TargetMode = 'first' | 'strong' | 'weak' | 'close';
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
}

export interface CardDef {
  id: string;
  name: string;
  rarity: Rarity;
  description: string;
  category: 'deploy' | 'upgrade' | 'buff' | 'heal' | 'exotic';
  towerHint?: TowerId;   // for styling deploy/upgrade cards by tower color
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
    easyClear?: { type: 'unlock-card' | 'unlock-tower'; id: string };
    mediumClear?: { type: 'unlock-card' | 'unlock-tower'; id: string };
    hardClear?: { type: 'unlock-card' | 'unlock-tower'; id: string };
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
  targetMode: TargetMode;
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
}

// ---------- Save / meta ----------

export interface ShopUpgradeDef {
  id: string;
  name: string;
  description: string;
  icon: string;         // short SVG / glyph
  baseCost: number;     // cost of first stack
  stackStep: number;    // cost increase per additional stack
  maxStacks: number;    // 1 for one-shot items
  effect: (save: SaveData, stacks: number) => void; // applies to save.metaBoosts
  category: 'power' | 'economy' | 'utility';
}

export interface MetaBoosts {
  globalDamagePct: number;       // additional % damage baked into every run
  startingLevel: number;         // extra starting level
  extraDraftCards: number;       // extra card options per draft
  extraRerolls: number;          // free rerolls granted per draft
  xpBoostPct: number;            // bonus XP from kills
  startingDeployTokens: Partial<Record<TowerId, number>>; // deploy tokens granted at run start
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
  };
  settings: {
    sfx: boolean;
    music: boolean;
    particleQuality: 'low' | 'medium' | 'high';
    speed: 1 | 2 | 3;
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
  elapsed: number;
  // Pending level-ups queued for when player is idle
  pendingLevelUps: number;
  // Log of cards drafted this run (in order).
  cardsPicked: string[];
  // Countdown (seconds) until next wave auto-starts. null = not counting.
  autoStartTimer: number | null;
}
