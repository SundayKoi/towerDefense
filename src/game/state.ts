import type { Difficulty, RunState, SaveData, TowerId } from '@/types';
import { getMap } from '@/data/maps';
import { STARTING_UNLOCKED_CARDS } from '@/data/cards';
import { recomputeMetaBoosts } from '@/data/shop';

export const SAVE_KEY = 'netrunner_meta_v1';

// XP threshold for reaching (level+1). Exponential-ish so early levels come fast, late ones earn more.
export function xpForLevel(level: number): number {
  return Math.round(40 + level * 16);
}

export function defaultSave(): SaveData {
  return {
    version: 2,
    completed: {},
    unlockedCards: STARTING_UNLOCKED_CARDS.slice(),
    unlockedTowers: ['firewall'],
    seenEnemies: [],
    challengesCompleted: [],
    protocols: 0,
    shopPurchased: {},
    metaBoosts: {
      globalDamagePct: 0,
      startingLevel: 0,
      extraDraftCards: 0,
      extraRerolls: 0,
      xpBoostPct: 0,
      startingDeployTokens: {},
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
      stats: { ...d.stats, ...(parsed.stats ?? {}) },
      settings: { ...d.settings, ...(parsed.settings ?? {}) },
    };
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
  const tokens: Partial<Record<TowerId, number>> = { firewall: 1 };
  for (const [k, v] of Object.entries(save.metaBoosts.startingDeployTokens ?? {})) {
    tokens[k as TowerId] = (tokens[k as TowerId] ?? 0) + (v as number);
  }

  return {
    mapId,
    difficulty,
    wave: 0,
    totalWaves: d.waves,
    hp: d.startHp,
    maxHp: d.startHp,
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
      globalRangePct: 0,
      globalRatePct: 0,
      globalCritChance: 0,
      enemySpeedMult: 1,
      xpMult: 1 + (save.metaBoosts.xpBoostPct ?? 0),
      towerDmg: {},
      towerRange: {},
      towerRate: {},
      towerCrit: {},
      revive: false,
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
    pendingLevelUps: 0,
    cardsPicked: [],
    autoStartTimer: null,
    puddles: [],
    towerEffects: {},
    seenThisRun: new Set(),
  };
}
