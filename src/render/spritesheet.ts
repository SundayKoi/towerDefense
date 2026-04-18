// ─────────────────────────────────────────────────────────────────────
// NETRUNNER ASSET PACK — sprite index
// Auto-generated. Do not edit by hand.
// ─────────────────────────────────────────────────────────────────────

export const SPRITE_SIZE = 32;
export const SHEET_COLS = 8;
export const SHEET_ROWS = 8;
export const SHEET_WIDTH = 256;
export const SHEET_HEIGHT = 256;
// Vite serves /public at the site root, so the runtime URL is `/sprites.png`.
export const SHEET_URL = '/sprites.png';

export interface SpriteFrame {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly col: number;
  readonly row: number;
}

export type TurretCategory = 'dps' | 'support' | 'passive';
export type TurretTier = 'starter' | 'act1' | 'act2' | 'act3' | 'act4';
export type DamageType = 'kinetic' | 'energy' | 'pierce' | 'aoe' | 'chain';
export type ThreatTier = 'low' | 'medium' | 'high' | 'extreme' | 'boss' | 'mega' | 'final';

export interface TurretDef {
  readonly id: TurretId;
  readonly display: string;
  readonly category: TurretCategory;
  readonly tier: TurretTier;
  readonly damage: number;
  readonly range: number;
  readonly rate: number | null;    // shots/sec, null = passive
  readonly dmgType: DamageType | null;
  readonly unlock: string | null;
  readonly sprite: SpriteFrame;
}

export interface EnemyDef {
  readonly id: EnemyId;
  readonly display: string;
  readonly threat: ThreatTier;
  readonly hp: number;
  readonly speed: number;
  readonly damage: number;
  readonly armor: number;
  readonly tags: readonly string[];
  readonly sprite: SpriteFrame;
}

export interface AssetDef {
  readonly id: string;
  readonly sprite: SpriteFrame;
}

export type TurretId = 'firewall' | 'antivirus' | 'quantum' | 'chain_lightning' | 'ice_breaker' | 'artillery' | 'overwatch' | 'railgun' | 'honeypot' | 'emp_array' | 'disruptor' | 'sentinel' | 'booster' | 'decrypt';
export type EnemyId = 'worm' | 'crawler' | 'trojan' | 'leech' | 'glitch' | 'rootkit' | 'phantom' | 'bomber' | 'ghost' | 'juggernaut' | 'parasite' | 'wraith' | 'kernel' | 'daemon' | 'leviathan' | 'swarm_queen' | 'corruptor' | 'void_lord';
export type ProjectileId = 'proj_kinetic' | 'proj_energy' | 'proj_pierce' | 'proj_aoe' | 'proj_chain';
export type EffectId = 'fx_hit' | 'fx_explosion' | 'fx_slow' | 'fx_freeze' | 'fx_shock' | 'fx_heal';
export type UIIconId = 'ui_damage_kinetic' | 'ui_damage_energy' | 'ui_damage_pierce' | 'ui_damage_aoe' | 'ui_damage_chain' | 'ui_threat_low' | 'ui_threat_med' | 'ui_threat_high' | 'ui_threat_boss' | 'ui_health' | 'ui_currency' | 'ui_menu' | 'ui_pause' | 'ui_speed';

export const TURRETS: Readonly<Record<TurretId, TurretDef>> = {
  firewall: {
    id: 'firewall',
    display: "Firewall",
    category: 'dps',
    tier: 'starter',
    damage: 14,
    range: 2.4,
    rate: 1.3,
    dmgType: 'kinetic',
    unlock: null,
    sprite: { x: 0, y: 0, w: 32, h: 32, col: 0, row: 0 },
  },
  antivirus: {
    id: 'antivirus',
    display: "Antivirus",
    category: 'dps',
    tier: 'starter',
    damage: 60,
    range: 3.8,
    rate: 0.55,
    dmgType: 'pierce',
    unlock: null,
    sprite: { x: 32, y: 0, w: 32, h: 32, col: 1, row: 0 },
  },
  quantum: {
    id: 'quantum',
    display: "Quantum",
    category: 'dps',
    tier: 'act1',
    damage: 24,
    range: 2.8,
    rate: 1.4,
    dmgType: 'energy',
    unlock: 'act1-m2',
    sprite: { x: 64, y: 0, w: 32, h: 32, col: 2, row: 0 },
  },
  chain_lightning: {
    id: 'chain_lightning',
    display: "Chain Lightning",
    category: 'dps',
    tier: 'act1',
    damage: 42,
    range: 2.5,
    rate: 0.75,
    dmgType: 'chain',
    unlock: 'act1-m3',
    sprite: { x: 96, y: 0, w: 32, h: 32, col: 3, row: 0 },
  },
  ice_breaker: {
    id: 'ice_breaker',
    display: "Ice-Breaker",
    category: 'dps',
    tier: 'act1',
    damage: 90,
    range: 2.8,
    rate: 0.4,
    dmgType: 'aoe',
    unlock: 'act1-m4',
    sprite: { x: 128, y: 0, w: 32, h: 32, col: 4, row: 0 },
  },
  artillery: {
    id: 'artillery',
    display: "Artillery",
    category: 'dps',
    tier: 'act2',
    damage: 60,
    range: 5.5,
    rate: 0.55,
    dmgType: 'aoe',
    unlock: 'act2-m8',
    sprite: { x: 160, y: 0, w: 32, h: 32, col: 5, row: 0 },
  },
  overwatch: {
    id: 'overwatch',
    display: "Overwatch",
    category: 'dps',
    tier: 'act3',
    damage: 380,
    range: 6.5,
    rate: 0.18,
    dmgType: 'pierce',
    unlock: 'act3-m9',
    sprite: { x: 192, y: 0, w: 32, h: 32, col: 6, row: 0 },
  },
  railgun: {
    id: 'railgun',
    display: "Railgun",
    category: 'dps',
    tier: 'act3',
    damage: 220,
    range: 5.0,
    rate: 0.25,
    dmgType: 'pierce',
    unlock: 'act3-m11',
    sprite: { x: 224, y: 0, w: 32, h: 32, col: 7, row: 0 },
  },
  honeypot: {
    id: 'honeypot',
    display: "Honeypot",
    category: 'support',
    tier: 'starter',
    damage: 4,
    range: 2.0,
    rate: 1.8,
    dmgType: 'energy',
    unlock: null,
    sprite: { x: 0, y: 32, w: 32, h: 32, col: 0, row: 1 },
  },
  emp_array: {
    id: 'emp_array',
    display: "EMP Array",
    category: 'support',
    tier: 'act2',
    damage: 55,
    range: 2.2,
    rate: 0.4,
    dmgType: 'energy',
    unlock: 'act2-m7',
    sprite: { x: 32, y: 32, w: 32, h: 32, col: 1, row: 1 },
  },
  disruptor: {
    id: 'disruptor',
    display: "Disruptor",
    category: 'support',
    tier: 'act2',
    damage: 10,
    range: 2.4,
    rate: 2.8,
    dmgType: 'energy',
    unlock: 'act2-m5',
    sprite: { x: 64, y: 32, w: 32, h: 32, col: 2, row: 1 },
  },
  sentinel: {
    id: 'sentinel',
    display: "Sentinel Node",
    category: 'support',
    tier: 'act3',
    damage: 12,
    range: 2.8,
    rate: null,
    dmgType: 'energy',
    unlock: 'act3-m12',
    sprite: { x: 96, y: 32, w: 32, h: 32, col: 3, row: 1 },
  },
  booster: {
    id: 'booster',
    display: "Booster Node",
    category: 'passive',
    tier: 'act1',
    damage: 0,
    range: 1.5,
    rate: null,
    dmgType: null,
    unlock: 'act1-m1',
    sprite: { x: 128, y: 32, w: 32, h: 32, col: 4, row: 1 },
  },
  decrypt: {
    id: 'decrypt',
    display: "Decrypt Node",
    category: 'passive',
    tier: 'act4',
    damage: 0,
    range: 2.0,
    rate: null,
    dmgType: null,
    unlock: 'act4-m13',
    sprite: { x: 160, y: 32, w: 32, h: 32, col: 5, row: 1 },
  },
};

export const ENEMIES: Readonly<Record<EnemyId, EnemyDef>> = {
  worm: {
    id: 'worm',
    display: "Worm",
    threat: 'low',
    hp: 28,
    speed: 1.5,
    damage: 1,
    armor: 0,
    tags: [] as const,
    sprite: { x: 192, y: 32, w: 32, h: 32, col: 6, row: 1 },
  },
  crawler: {
    id: 'crawler',
    display: "Crawler",
    threat: 'low',
    hp: 16,
    speed: 2.8,
    damage: 1,
    armor: 0,
    tags: ['fast'] as const,
    sprite: { x: 224, y: 32, w: 32, h: 32, col: 7, row: 1 },
  },
  trojan: {
    id: 'trojan',
    display: "Trojan",
    threat: 'medium',
    hp: 70,
    speed: 1.1,
    damage: 2,
    armor: 2,
    tags: [] as const,
    sprite: { x: 0, y: 64, w: 32, h: 32, col: 0, row: 2 },
  },
  leech: {
    id: 'leech',
    display: "Leech",
    threat: 'medium',
    hp: 40,
    speed: 1.4,
    damage: 1,
    armor: 0,
    tags: ['priority', 'heals'] as const,
    sprite: { x: 32, y: 64, w: 32, h: 32, col: 1, row: 2 },
  },
  glitch: {
    id: 'glitch',
    display: "Glitch",
    threat: 'medium',
    hp: 55,
    speed: 1.6,
    damage: 2,
    armor: 0,
    tags: ['splits'] as const,
    sprite: { x: 64, y: 64, w: 32, h: 32, col: 2, row: 2 },
  },
  rootkit: {
    id: 'rootkit',
    display: "Rootkit",
    threat: 'high',
    hp: 180,
    speed: 0.85,
    damage: 3,
    armor: 5,
    tags: [] as const,
    sprite: { x: 96, y: 64, w: 32, h: 32, col: 3, row: 2 },
  },
  phantom: {
    id: 'phantom',
    display: "Phantom",
    threat: 'high',
    hp: 45,
    speed: 2.0,
    damage: 2,
    armor: 0,
    tags: ['phase'] as const,
    sprite: { x: 128, y: 64, w: 32, h: 32, col: 4, row: 2 },
  },
  bomber: {
    id: 'bomber',
    display: "Bomber",
    threat: 'high',
    hp: 60,
    speed: 1.3,
    damage: 5,
    armor: 0,
    tags: ['detonate'] as const,
    sprite: { x: 160, y: 64, w: 32, h: 32, col: 5, row: 2 },
  },
  ghost: {
    id: 'ghost',
    display: "Ghost",
    threat: 'high',
    hp: 50,
    speed: 1.8,
    damage: 2,
    armor: 0,
    tags: ['stealth'] as const,
    sprite: { x: 192, y: 64, w: 32, h: 32, col: 6, row: 2 },
  },
  juggernaut: {
    id: 'juggernaut',
    display: "Juggernaut",
    threat: 'high',
    hp: 280,
    speed: 0.6,
    damage: 4,
    armor: 14,
    tags: [] as const,
    sprite: { x: 224, y: 64, w: 32, h: 32, col: 7, row: 2 },
  },
  parasite: {
    id: 'parasite',
    display: "Parasite",
    threat: 'high',
    hp: 35,
    speed: 2.2,
    damage: 0,
    armor: 0,
    tags: ['priority', 'fast', 'infects'] as const,
    sprite: { x: 0, y: 96, w: 32, h: 32, col: 0, row: 3 },
  },
  wraith: {
    id: 'wraith',
    display: "Wraith",
    threat: 'extreme',
    hp: 100,
    speed: 1.6,
    damage: 4,
    armor: 0,
    tags: ['slow_immune'] as const,
    sprite: { x: 32, y: 96, w: 32, h: 32, col: 1, row: 3 },
  },
  kernel: {
    id: 'kernel',
    display: "Kernel",
    threat: 'boss',
    hp: 900,
    speed: 0.75,
    damage: 5,
    armor: 4,
    tags: ['boss'] as const,
    sprite: { x: 64, y: 96, w: 32, h: 32, col: 2, row: 3 },
  },
  daemon: {
    id: 'daemon',
    display: "Daemon",
    threat: 'boss',
    hp: 650,
    speed: 1.2,
    damage: 4,
    armor: 2,
    tags: ['boss', 'spawner'] as const,
    sprite: { x: 96, y: 96, w: 32, h: 32, col: 3, row: 3 },
  },
  leviathan: {
    id: 'leviathan',
    display: "Leviathan",
    threat: 'mega',
    hp: 1800,
    speed: 0.6,
    damage: 8,
    armor: 6,
    tags: ['mega', 'slow_immune', 'regen'] as const,
    sprite: { x: 128, y: 96, w: 32, h: 32, col: 4, row: 3 },
  },
  swarm_queen: {
    id: 'swarm_queen',
    display: "Swarm Queen",
    threat: 'mega',
    hp: 1200,
    speed: 0.9,
    damage: 6,
    armor: 0,
    tags: ['mega', 'spawner'] as const,
    sprite: { x: 160, y: 96, w: 32, h: 32, col: 5, row: 3 },
  },
  corruptor: {
    id: 'corruptor',
    display: "Corruptor",
    threat: 'mega',
    hp: 2200,
    speed: 0.7,
    damage: 10,
    armor: 8,
    tags: ['mega', 'chain_immune'] as const,
    sprite: { x: 192, y: 96, w: 32, h: 32, col: 6, row: 3 },
  },
  void_lord: {
    id: 'void_lord',
    display: "Void Lord",
    threat: 'final',
    hp: 4500,
    speed: 0.8,
    damage: 15,
    armor: 10,
    tags: ['final', 'slow_immune', 'phase_shift'] as const,
    sprite: { x: 224, y: 96, w: 32, h: 32, col: 7, row: 3 },
  },
};

export const PROJECTILES: Readonly<Record<ProjectileId, AssetDef>> = {
  proj_kinetic: { id: 'proj_kinetic', sprite: { x: 0, y: 128, w: 32, h: 32, col: 0, row: 4 } },
  proj_energy: { id: 'proj_energy', sprite: { x: 32, y: 128, w: 32, h: 32, col: 1, row: 4 } },
  proj_pierce: { id: 'proj_pierce', sprite: { x: 64, y: 128, w: 32, h: 32, col: 2, row: 4 } },
  proj_aoe: { id: 'proj_aoe', sprite: { x: 96, y: 128, w: 32, h: 32, col: 3, row: 4 } },
  proj_chain: { id: 'proj_chain', sprite: { x: 128, y: 128, w: 32, h: 32, col: 4, row: 4 } },
};

export const EFFECTS: Readonly<Record<EffectId, AssetDef>> = {
  fx_hit: { id: 'fx_hit', sprite: { x: 160, y: 128, w: 32, h: 32, col: 5, row: 4 } },
  fx_explosion: { id: 'fx_explosion', sprite: { x: 192, y: 128, w: 32, h: 32, col: 6, row: 4 } },
  fx_slow: { id: 'fx_slow', sprite: { x: 224, y: 128, w: 32, h: 32, col: 7, row: 4 } },
  fx_freeze: { id: 'fx_freeze', sprite: { x: 0, y: 160, w: 32, h: 32, col: 0, row: 5 } },
  fx_shock: { id: 'fx_shock', sprite: { x: 32, y: 160, w: 32, h: 32, col: 1, row: 5 } },
  fx_heal: { id: 'fx_heal', sprite: { x: 64, y: 160, w: 32, h: 32, col: 2, row: 5 } },
};

export const UI_ICONS: Readonly<Record<UIIconId, AssetDef>> = {
  ui_damage_kinetic: { id: 'ui_damage_kinetic', sprite: { x: 96, y: 160, w: 32, h: 32, col: 3, row: 5 } },
  ui_damage_energy: { id: 'ui_damage_energy', sprite: { x: 128, y: 160, w: 32, h: 32, col: 4, row: 5 } },
  ui_damage_pierce: { id: 'ui_damage_pierce', sprite: { x: 160, y: 160, w: 32, h: 32, col: 5, row: 5 } },
  ui_damage_aoe: { id: 'ui_damage_aoe', sprite: { x: 192, y: 160, w: 32, h: 32, col: 6, row: 5 } },
  ui_damage_chain: { id: 'ui_damage_chain', sprite: { x: 224, y: 160, w: 32, h: 32, col: 7, row: 5 } },
  ui_threat_low: { id: 'ui_threat_low', sprite: { x: 0, y: 192, w: 32, h: 32, col: 0, row: 6 } },
  ui_threat_med: { id: 'ui_threat_med', sprite: { x: 32, y: 192, w: 32, h: 32, col: 1, row: 6 } },
  ui_threat_high: { id: 'ui_threat_high', sprite: { x: 64, y: 192, w: 32, h: 32, col: 2, row: 6 } },
  ui_threat_boss: { id: 'ui_threat_boss', sprite: { x: 96, y: 192, w: 32, h: 32, col: 3, row: 6 } },
  ui_health: { id: 'ui_health', sprite: { x: 128, y: 192, w: 32, h: 32, col: 4, row: 6 } },
  ui_currency: { id: 'ui_currency', sprite: { x: 160, y: 192, w: 32, h: 32, col: 5, row: 6 } },
  ui_menu: { id: 'ui_menu', sprite: { x: 192, y: 192, w: 32, h: 32, col: 6, row: 6 } },
  ui_pause: { id: 'ui_pause', sprite: { x: 224, y: 192, w: 32, h: 32, col: 7, row: 6 } },
  ui_speed: { id: 'ui_speed', sprite: { x: 0, y: 224, w: 32, h: 32, col: 0, row: 7 } },
};

/** Convenience: map a damage type to the projectile to fire. */
export const PROJECTILE_FOR_DAMAGE_TYPE: Readonly<Record<DamageType, ProjectileId>> = {
  kinetic: 'proj_kinetic',
  energy:  'proj_energy',
  pierce:  'proj_pierce',
  aoe:     'proj_aoe',
  chain:   'proj_chain',
};

/** Convenience: map a damage type to its UI badge. */
export const UI_ICON_FOR_DAMAGE_TYPE: Readonly<Record<DamageType, UIIconId>> = {
  kinetic: 'ui_damage_kinetic',
  energy:  'ui_damage_energy',
  pierce:  'ui_damage_pierce',
  aoe:     'ui_damage_aoe',
  chain:   'ui_damage_chain',
};

/** Convenience: map a threat tier to its UI badge. */
export const UI_ICON_FOR_THREAT: Readonly<Record<ThreatTier, UIIconId>> = {
  low:     'ui_threat_low',
  medium:  'ui_threat_med',
  high:    'ui_threat_high',
  extreme: 'ui_threat_high',
  boss:    'ui_threat_boss',
  mega:    'ui_threat_boss',
  final:   'ui_threat_boss',
};
