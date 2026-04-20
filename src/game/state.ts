import type { Difficulty, RunState, SaveData, TowerId } from '@/types';
import { getMap } from '@/data/maps';
import { CARDS_BY_ID, STARTING_UNLOCKED_CARDS } from '@/data/cards';
import { recomputeMetaBoosts } from '@/data/shop';
import { emptyPeriodStats, DAILY_MUTATORS_BY_ID } from '@/data/contracts';
import { RUNNERS } from '@/data/runners';
import { CHROMAS_BY_ID } from '@/data/chromas';
import { DIFFICULTY_PROFILE } from '@/game/waves';

// v4 key rotation = hard reset. The 15-feature overhaul (program deck,
// runners, ascension, NG+, chromas, ports, packet loot, kernel phases, wave
// preview, heat buildup, support visuals, daily contract, etc.) restructures
// enough run-state and save fields that forward-migrating existing players
// onto the new shape was messier than just cutting a clean slate. Old keys
// are cleared so localStorage doesn't leak abandoned data.
export const SAVE_KEY = 'netrunner_meta_v4';

try {
  localStorage.removeItem('netrunner_meta_v1');
  localStorage.removeItem('netrunner_meta_v2');
  localStorage.removeItem('netrunner_meta_v3');
} catch { /* storage disabled */ }

// XP threshold for reaching (level+1). Exponential-ish so early levels come fast, late ones earn more.
export function xpForLevel(level: number): number {
  return Math.round(40 + level * 16);
}

export function defaultSave(): SaveData {
  return {
    version: 6,
    completed: {},
    unlockedCards: STARTING_UNLOCKED_CARDS.slice(),
    // Three starter turrets — firewall (kinetic frontline), honeypot (slow + goo),
    // antivirus (long-range pierce sniper). Gives the player a proper damage-dealer
    // trio from wave 1. BOOSTER NODE moves to the Map 1 easy reward slot.
    unlockedTowers: ['firewall', 'honeypot', 'antivirus'],
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
    prestigeStars: 0,
    sectorClears: {},
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
    // Pixel mode on at 2× factor is the intended look — chunky pixels without
    // over-blurring. Players can still toggle it off in SETTINGS.
    settings: { sfx: true, music: true, particleQuality: 'high', speed: 1, pixelMode: true, pixelFactor: 2 },
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
      prestigeStars: parsed.prestigeStars ?? 0,
      sectorClears: parsed.sectorClears ?? {},
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
    // v3 → v4: flip pixel mode on at 2× factor as the new default look. Only
    // touches the pixel settings; audio/speed/particleQuality are preserved.
    if ((parsed.version ?? 0) < 4) {
      s.settings.pixelMode = true;
      s.settings.pixelFactor = 2;
      s.version = 4;
    }
    // v4 → v5: 28-map 7-act overhaul. The set of map IDs in MAPS changed (NEONSPRAWL and
    // OBLITERATOR were removed, several maps moved between acts). Prune completion entries
    // for removed maps so the map-select grid doesn't reference dead IDs, and clear
    // sectorClears — sector→act boundaries shifted, so existing stars would be miscounted.
    // prestigeStars is kept because it's a cosmetic damage bonus and wiping it feels punishing.
    if ((parsed.version ?? 0) < 5) {
      const removedMapIds = new Set(['neonsprawl', 'obliterator']);
      for (const id of Object.keys(s.completed)) {
        if (removedMapIds.has(id)) delete s.completed[id];
      }
      s.sectorClears = {};
      s.version = 5;
    }
    // v5 → v6: daily contract infrastructure added. No migration needed — field
    // is optional and lazy-initialized by ensureDailyContract() on first read.
    if ((parsed.version ?? 0) < 6) {
      s.version = 6;
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

export function createRun(mapId: string, difficulty: Difficulty, save: SaveData, options?: { dailyContract?: boolean; weeklyContract?: boolean; monthlyContract?: boolean; brutalMode?: boolean; mutator?: string }): RunState {
  const map = getMap(mapId);
  const d = map.difficulties[difficulty];
  const prof = DIFFICULTY_PROFILE[difficulty];
  const level = 1 + (save.metaBoosts.startingLevel ?? 0);
  // Challenge runs (daily/weekly/monthly) force GLITCH so the seeded
  // leaderboard stays on a single axis — same challenge, same passive.
  const isChallenge = options?.dailyContract || options?.weeklyContract || options?.monthlyContract;
  const runnerId = isChallenge ? 'glitch' : (save.selectedRunner ?? 'glitch');
  const runner = RUNNERS[runnerId];
  const brutal = options?.brutalMode ?? false;

  // Hard-mode turret lock: pick N random non-starter, non-FIREWALL unlocked turrets to lock
  // out this run. FIREWALL stays available because every run begins with a firewall token;
  // locking it would make the run unwinnable. Only triggers if the player has enough
  // unlocked turrets that losing one is a real constraint rather than a death sentence.
  const lockedTurrets: TowerId[] = [];
  const lockable = save.unlockedTowers.filter((t) => t !== 'firewall');
  if (prof.turretLockCount > 0 && lockable.length >= 5) {
    const shuffled = lockable.slice().sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(prof.turretLockCount, shuffled.length); i++) {
      lockedTurrets.push(shuffled[i]);
    }
  }
  // Runner ban: also lock this runner's banned tower, unless it's firewall (never
  // lockable since every run starts with a firewall token).
  if (runner.bannedTower !== 'firewall' && !lockedTurrets.includes(runner.bannedTower)) {
    lockedTurrets.push(runner.bannedTower);
  }
  // BRUTAL MODE: +2 random turret locks with two guardrails —
  // (a) always keep at least 2 viable turrets total; (b) always keep at
  // least one AOE or CHAIN turret unlocked so cloaked-spawn modifiers
  // stay counterable.
  if (brutal && lockable.length >= 5) {
    const aoeChainIds = ['ice', 'mine', 'chain'] as const;
    const remaining = lockable.filter((t) => !lockedTurrets.includes(t));
    const shuffled = remaining.slice().sort(() => Math.random() - 0.5);
    const maxAdditional = Math.min(2, Math.max(0, lockable.length - 2 - lockedTurrets.length));
    for (const candidate of shuffled) {
      if (lockedTurrets.length - (prof.turretLockCount + (runner.bannedTower !== 'firewall' ? 1 : 0)) >= maxAdditional) break;
      // Guard: would this lock remove the last AOE/chain turret?
      const unlockedAoeChain = lockable.filter((t) =>
        (aoeChainIds as readonly TowerId[]).includes(t) && !lockedTurrets.includes(t) && t !== candidate);
      if ((aoeChainIds as readonly TowerId[]).includes(candidate) && unlockedAoeChain.length === 0) continue;
      lockedTurrets.push(candidate);
    }
  }

  // Starting deploy tokens: always grant 1 Firewall minimum + any meta-boost
  // starters. Capped to 1 per turret type — singleton rule makes extras dead
  // weight. Runner bonus tokens were removed in v2 for the same reason.
  const tokens: Partial<Record<TowerId, number>> = { firewall: 1 };
  for (const [k, v] of Object.entries(save.metaBoosts.startingDeployTokens ?? {})) {
    if (lockedTurrets.includes(k as TowerId)) continue;
    const current = tokens[k as TowerId] ?? 0;
    tokens[k as TowerId] = Math.max(current, Math.min(1, current + (v as number)));
  }

  const startHp = d.startHp + (save.metaBoosts.bonusStartingHp ?? 0) + runner.bonusStartingHp;

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
      globalDamagePct: (save.metaBoosts.globalDamagePct ?? 0) + runner.passiveDamagePct,
      globalRangePct: save.metaBoosts.globalRangePct ?? 0,
      globalRatePct: (save.metaBoosts.globalRatePct ?? 0) + runner.passiveRatePct,
      globalCritChance: (save.metaBoosts.globalCritChancePct ?? 0) + runner.passiveCritPct,
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
    draftRerollsLeft: (save.metaBoosts.extraRerolls ?? 0) + prof.startingRerolls,
    selection: { kind: 'none' },
    shakeTime: 0,
    shakeAmp: 0,
    timeScale: 1,
    hitPause: 0,
    elapsed: 0,
    // NEURAL BOOSTER: each startingLevel stack grants an immediate pending level-up so the
    // player actually gets the promised draft options at run start, not when they hit level+2.
    // Runner architect adds its own starting level-up on top.
    pendingLevelUps: (save.metaBoosts.startingLevel ?? 0) + runner.bonusStartingLevels,
    lockedTurrets,
    cardsPicked: [],
    autoStartTimer: null,
    puddles: [],
    packets: [],
    packetBuffs: { dmgMult: 1, rateMult: 1, xpMult: 1, timeLeft: 0 },
    towerEffects: {},
    damageDealt: {},
    seenThisRun: new Set(),
    killsThisRun: 0,
    bossKillsThisRun: 0,
    xpThisRun: 0,
    legendariesThisRun: 0,
    isDailyContract: options?.dailyContract ?? false,
    isWeeklyContract: options?.weeklyContract ?? false,
    isMonthlyContract: options?.monthlyContract ?? false,
    // Mutator sources stack multiplicatively on the map's base modifiers via
    // getEffectiveModifiers. Brutal layers all 5 at 60% strength; a challenge
    // run's single mutator uses its own full modifier.
    contractMutators: (() => {
      if (brutal) {
        return {
          lagSpike:     0.6,   // +60% speed during spikes (max-stacked, not additive)
          encrypted:    0.3 * 0.6,
          stealthChance:0.25 * 0.6,
          replication:  0.15 * 0.6,
          rootkit:      4.0 / 0.6,  // interval — smaller is stronger; divide to ease
        };
      }
      return options?.mutator ? DAILY_MUTATORS_BY_ID[options.mutator]?.modifier : undefined;
    })(),
    runStartMs: typeof performance !== 'undefined' ? performance.now() : 0,
    brutalMode: brutal,
    brutalHpMult: brutal ? 2.0 : 1.0,
    brutalSpeedMult: brutal ? 1.25 : 1.0,
    chromaColors: (() => {
      const out: Partial<Record<TowerId, { accent: string; projectile: string; trail: string }>> = {};
      for (const [towerId, chromaId] of Object.entries(save.equippedChromas ?? {})) {
        if (!chromaId) continue;
        const c = CHROMAS_BY_ID[chromaId];
        if (!c) continue;
        out[towerId as TowerId] = { accent: c.accent, projectile: c.projectile, trail: c.trail };
      }
      return out;
    })(),
    runnerId,
  };
}
