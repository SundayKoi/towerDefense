import type { Difficulty, RunState, SaveData, TowerId } from '@/types';
import { getMap } from '@/data/maps';
import { CARDS_BY_ID, STARTING_UNLOCKED_CARDS } from '@/data/cards';
import { recomputeMetaBoosts } from '@/data/shop';
import { emptyPeriodStats } from '@/data/contracts';

// Bumped from netrunner_meta_v1 to v2 to wipe everyone's progress as a clean slate
// after the progression overhaul (new map-reward tree, unlock notifications, the
// contracts system, and the starter-card-pool cleanup). Old v1 data is explicitly
// removed below so it doesn't sit abandoned in the browser's localStorage.
export const SAVE_KEY = 'netrunner_meta_v2';

// Purge any pre-reset save data. Safe no-op if the key doesn't exist.
try { localStorage.removeItem('netrunner_meta_v1'); } catch { /* storage disabled */ }

// XP threshold for reaching (level+1). Exponential-ish so early levels come fast, late ones earn more.
export function xpForLevel(level: number): number {
  return Math.round(40 + level * 16);
}

export function defaultSave(): SaveData {
  return {
    version: 3,
    completed: {},
    unlockedCards: STARTING_UNLOCKED_CARDS.slice(),
    // Two starter towers — firewall provides damage, honeypot provides slow+puddles.
    // A single turret type per run (singleton rule) wasn't enough to beat Map 1 easy.
    unlockedTowers: ['firewall', 'honeypot'],
    seenEnemies: [],
    challengesCompleted: [],
    protocols: 0,
    shopPurchased: {},
    metaBoosts: {
      globalDamagePct: 0,
      globalCritChancePct: 0,
      globalRatePct: 0,
      globalRangePct: 0,
      bonusStartingHp: 0,
      bonusProtocolsPerWave: 0,
      startingLevel: 0,
      extraDraftCards: 0,
      extraRerolls: 0,
      xpBoostPct: 0,
      startingDeployTokens: {},
      hasRevive: false,
      enemySpeedDebuff: 0,
      hpRegenPerWave: 0,
      globalArmorReduction: 0,
      bossProtocolBonus: 0,
    },
    quests: { completed: [] },
    tutorial: { seen: [] },
    contracts: {
      daily:   { period: '', offered: [], claimed: [], stats: emptyPeriodStats() },
      weekly:  { period: '', offered: [], claimed: [], stats: emptyPeriodStats() },
      monthly: { period: '', offered: [], claimed: [], stats: emptyPeriodStats() },
    },
    stats: {
      totalRuns: 0,
      totalWins: 0,
      totalKills: 0,
      killsByTower: {},
      killsByEnemy: {},
      bossKills: 0,
      survivalBestWave: 0,
      totalXpEarned: 0,
      totalProtocolsEarned: 0,
      towersEverDeployed: [],
      legendaryDrafts: 0,
    },
    settings: { sfx: true, music: true, particleQuality: 'high', speed: 1, pixelMode: false, pixelFactor: 3 },
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    const d = defaultSave();
    const s: SaveData = {
      ...d,
      ...parsed,
      metaBoosts: { ...d.metaBoosts, ...(parsed.metaBoosts ?? {}) },
      shopPurchased: parsed.shopPurchased ?? {},
      quests: parsed.quests ?? { completed: [] },
      tutorial: parsed.tutorial ?? { seen: [] },
      contracts: parsed.contracts ?? d.contracts,
      stats: { ...d.stats, ...(parsed.stats ?? {}) },
      settings: { ...d.settings, ...(parsed.settings ?? {}) },
    };
    // Migrate speed setting: clamp 3x→2x
    if ((s.settings.speed as number) > 2) s.settings.speed = 2;
    // Migrate pre-v2 saves: old card IDs no longer exist in the pool. Reset unlocks to starter set
    // while preserving map completion, stats, shop purchases, and settings.
    if (!parsed.version || parsed.version < 2) {
      s.unlockedCards = d.unlockedCards.slice();
      s.version = 2;
    } else {
      // For v2+ saves, ensure any missing starter cards are added (forward-compat).
      const starters = new Set(d.unlockedCards);
      const existing = new Set(s.unlockedCards);
      for (const id of starters) if (!existing.has(id)) s.unlockedCards.push(id);
    }
    // Also ensure default starter towers are present (forward-compat — adding a
    // new starter tower like honeypot retroactively grants it to existing saves).
    const starterT = new Set(d.unlockedTowers);
    const existingT = new Set(s.unlockedTowers);
    for (const id of starterT) if (!existingT.has(id)) s.unlockedTowers.push(id);
    // Migrate pre-v3 saves: before the map reward overhaul, the starter card pool
    // included deploy + upgrade cards for 7 towers regardless of whether the player
    // had actually unlocked them. Trim the card list to only cards that belong to
    // towers the player has unlocked (plus heals/exotics which are tower-agnostic).
    if ((parsed.version ?? 0) < 3) {
      const unlockedT = new Set(s.unlockedTowers);
      s.unlockedCards = s.unlockedCards.filter((id) => {
        const c = CARDS_BY_ID[id];
        if (!c) return false;
        if (c.category === 'heal' || c.category === 'exotic') return true;
        if (c.towerHint && !unlockedT.has(c.towerHint)) return false;
        if (c.towerHint2 && !unlockedT.has(c.towerHint2)) return false;
        return true;
      });
      s.version = 3;
    }
    recomputeMetaBoosts(s);
    return s;
  } catch {
    return defaultSave();
  }
}

export function writeSave(s: SaveData): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(s));
}

export function createRun(mapId: string, difficulty: Difficulty, save: SaveData): RunState {
  const map = getMap(mapId);
  const d = map.difficulties[difficulty];
  const level = 1 + (save.metaBoosts.startingLevel ?? 0);

  // Starting deploy tokens: always grant 1 Firewall minimum + any meta-boost starters.
  // Other turrets come via draft (deploy cards for unlocked towers appear in the pool).
  const tokens: Partial<Record<TowerId, number>> = { firewall: 1 };
  for (const [k, v] of Object.entries(save.metaBoosts.startingDeployTokens ?? {})) {
    tokens[k as TowerId] = (tokens[k as TowerId] ?? 0) + (v as number);
  }

  const startHp = d.startHp + (save.metaBoosts.bonusStartingHp ?? 0);

  return {
    mapId,
    difficulty,
    wave: 0,
    totalWaves: d.waves,
    hp: startHp,
    maxHp: startHp,
    phase: 'prep',
    xp: 0,
    level,
    xpToNext: xpForLevel(level),
    deployTokens: tokens,
    protocolsEarned: 0,
    towers: [],
    enemies: [],
    projectiles: [],
    particles: [],
    floaters: [],
    spawnQueue: [],
    spawnElapsed: 0,
    mods: {
      globalDamagePct: save.metaBoosts.globalDamagePct ?? 0,
      globalRangePct: save.metaBoosts.globalRangePct ?? 0,
      globalRatePct: save.metaBoosts.globalRatePct ?? 0,
      globalCritChance: save.metaBoosts.globalCritChancePct ?? 0,
      enemySpeedMult: 1 - (save.metaBoosts.enemySpeedDebuff ?? 0),
      xpMult: 1 + (save.metaBoosts.xpBoostPct ?? 0),
      towerDmg: {},
      towerRange: {},
      towerRate: {},
      towerCrit: {},
      revive: save.metaBoosts.hasRevive ?? false,
      globalArmorReduction: save.metaBoosts.globalArmorReduction ?? 0,
      bossProtocolBonus: save.metaBoosts.bossProtocolBonus ?? 0,
    },
    showDraft: false,
    draftOptions: [],
    draftSource: 'start',
    draftRerollsLeft: save.metaBoosts.extraRerolls ?? 0,
    selection: { kind: 'none' },
    shakeTime: 0,
    shakeAmp: 0,
    timeScale: 1,
    elapsed: 0,
    // NEURAL BOOSTER: each startingLevel stack grants an immediate pending level-up so the
    // player actually gets the promised draft options at run start, not when they hit level+2.
    pendingLevelUps: save.metaBoosts.startingLevel ?? 0,
    cardsPicked: [],
    autoStartTimer: null,
    puddles: [],
    towerEffects: {},
    damageDealt: {},
    seenThisRun: new Set(),
    killsThisRun: 0,
    bossKillsThisRun: 0,
    xpThisRun: 0,
    legendariesThisRun: 0,
  };
}
