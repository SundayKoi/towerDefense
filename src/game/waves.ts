import type { EnemyId, MapDef, RunState, Difficulty } from '@/types';

// Per-difficulty profile. Difficulty = constraint change, not just stat inflation.
// Easy   : 4-card draft, +1 starting reroll, gentle enemy gates, soft HP curve.
// Medium : 3-card draft, 0 bonus rerolls, medium gates, moderate HP curve, composition skew.
// Hard   : 2-card draft, 0 bonus rerolls, aggressive gates, steep HP curve, random turret lock.
export interface DifficultyProfile {
  draftSize: number;               // card options per draft
  startingRerolls: number;         // rerolls granted on run start (added to shop bonus)
  phaseThresholds: [number, number]; // fractions of totalWaves when phase2/phase3 pool activates
  enemyGates: Record<string, number>; // enemy id -> earliest wave index it may appear
  turretLockCount: number;         // # of random non-FIREWALL turrets locked out at run start
}

export const DIFFICULTY_PROFILE: Record<Difficulty, DifficultyProfile> = {
  easy:   { draftSize: 4, startingRerolls: 1, phaseThresholds: [0.34, 0.67], enemyGates: { trojan: 4, rootkit: 8, phantom: 12 }, turretLockCount: 0 },
  medium: { draftSize: 3, startingRerolls: 0, phaseThresholds: [0.25, 0.55], enemyGates: { trojan: 3, rootkit: 6, phantom: 9  }, turretLockCount: 0 },
  hard:   { draftSize: 2, startingRerolls: 0, phaseThresholds: [0.18, 0.42], enemyGates: { trojan: 2, rootkit: 4, phantom: 6  }, turretLockCount: 1 },
};

// Compute number of enemies for a given wave.
export function waveCount(wave: number, difficulty: Difficulty = 'medium'): number {
  if (wave === 1) return 4;
  // Per-difficulty caps keep easy from flooding a player with limited turret variety.
  const cap = { easy: 18, medium: 22, hard: 25 }[difficulty];
  return Math.max(5, Math.min(cap, 5 + Math.floor(wave * 1.1)));
}

// Spawn delay in seconds per §9.6.
export function spawnDelay(wave: number): number {
  if (wave === 1) return 1.0;
  return Math.max(0.4, 1.05 - wave * 0.025);
}

// Reward multiplier per §9.7.
export function rewardMult(wave: number): number {
  return 1 + (wave - 1) * 0.06;
}

// End-of-wave bonus per §9.8.
export function waveBonus(wave: number): number {
  return 20 + wave * 4;
}

// HP scale per wave, softened across all tiers after the difficulty rebuild.
// Old easy (+15%/wave) hit 3.85× at wave 20; new easy (+10%/wave) hits 2.9× — winnable with a
// starter loadout. Medium/hard stay noticeably steeper so difficulty tiers feel distinct.
export function hpScale(wave: number, difficulty: Difficulty): number {
  // Easy bumped from 0.10 → 0.13/wave so later easy waves actually escalate.
  // Old wave 20 easy = 2.9× → new = 3.47×. Still winnable with a starter loadout,
  // but no longer so soft that a fresh draft trivializes it.
  const p = { easy: 0.13, medium: 0.17, hard: 0.24 }[difficulty];
  return 1 + (wave - 1) * p;
}

// Speed scale per wave — kept mild across all tiers; large speed swings feel unfair.
export function speedScale(wave: number, difficulty: Difficulty): number {
  const p = { easy: 0.02, medium: 0.04, hard: 0.06 }[difficulty];
  return 1 + (wave - 1) * p * 0.05;
}

// Boss HP formula — chunky floor so bosses don't get one-shot on easy, then
// an accelerating curve for later waves. Old formula: 1 + (w/10-1) * 0.6 meant
// wave-10 bosses rendered at 1.0x base HP and evaporated under any real build.
// New curve: wave 10 = 1.6x, wave 20 = 2.3x, wave 30 = 3.0x, wave 40 = 3.7x.
export function bossHpMult(wave: number): number {
  return 1.6 + (wave / 10 - 1) * 0.7;
}

// Determine if this wave has a boss.
export function bossForWave(map: MapDef, difficulty: Difficulty, wave: number): EnemyId | null {
  const map_bosses = map.bosses[difficulty];
  return (map_bosses[wave] as EnemyId | undefined) ?? null;
}

export function isMiniBossWave(wave: number): boolean {
  // §3.1 mini-bosses on 5, 15, 25, 35, 45
  return wave > 0 && wave % 10 === 5;
}

// Pick an enemy from the map's appropriate phase pool, factoring in difficulty composition
// bias (hard hits phase2/phase3 earlier) and per-difficulty enemy-availability gates.
function pickEnemyForWave(map: MapDef, difficulty: Difficulty, wave: number, total: number, rng: () => number): EnemyId {
  const prof = DIFFICULTY_PROFILE[difficulty];
  const progress = wave / total;
  let pool: EnemyId[];
  if (progress < prof.phaseThresholds[0]) pool = map.enemyPool.phase1;
  else if (progress < prof.phaseThresholds[1]) pool = map.enemyPool.phase2;
  else pool = map.enemyPool.phase3;

  pool = pool.filter((e) => {
    const gate = prof.enemyGates[e as string];
    if (gate !== undefined && wave < gate) return false;
    return true;
  });
  if (pool.length === 0) pool = ['worm'];
  return pool[Math.floor(rng() * pool.length)];
}

// Build the spawn queue for a wave.
export function buildWaveSpawnQueue(map: MapDef, difficulty: Difficulty, wave: number, totalWaves: number): RunState['spawnQueue'] {
  const rng = Math.random;
  const count = waveCount(wave, difficulty);
  const delay = spawnDelay(wave);
  // PACKET BURSTS sector modifier: chance each spawn drops a paired follow-up 0.1s later.
  const burstChance = map.modifiers?.packetBursts ?? 0;
  const maybeBurst = (entry: RunState['spawnQueue'][number]) => {
    if (burstChance > 0 && Math.random() < burstChance) {
      queue.push({ def: entry.def, pathIndex: entry.pathIndex, delay: 0.1, boss: entry.boss });
    }
  };

  const queue: RunState['spawnQueue'] = [];
  const boss = bossForWave(map, difficulty, wave);

  // Wave 1 hardcoded softness (§9.2): 4 worms, 20 HP each handled in enemy spawn.
  if (wave === 1) {
    for (let i = 0; i < 4; i++) {
      queue.push({ def: 'worm', pathIndex: 0, delay: i === 0 ? 0.3 : delay });
    }
    return queue;
  }

  if (boss) {
    // Boss waves: minion softener (40% of count) + 1 boss
    const softener = Math.max(3, Math.floor(count * 0.4));
    for (let i = 0; i < softener; i++) {
      const e = { def: pickEnemyForWave(map, difficulty, wave, totalWaves, rng), pathIndex: Math.floor(rng() * map.paths.length), delay: i === 0 ? 0.5 : delay * 0.9 };
      queue.push(e);
      maybeBurst(e);
    }
    // gap before boss (no burst on boss itself)
    queue.push({ def: boss, pathIndex: 0, delay: delay * 2.5, boss: true });
    return queue;
  }

  // Mini-boss wave
  if (isMiniBossWave(wave)) {
    const softener = Math.max(3, Math.floor(count * 0.5));
    for (let i = 0; i < softener; i++) {
      const e = { def: pickEnemyForWave(map, difficulty, wave, totalWaves, rng), pathIndex: Math.floor(rng() * map.paths.length), delay: i === 0 ? 0.4 : delay };
      queue.push(e);
      maybeBurst(e);
    }
    queue.push({ def: 'trojan', pathIndex: 0, delay: delay * 2.0, boss: true });
    return queue;
  }

  // Normal wave
  for (let i = 0; i < count; i++) {
    const e = { def: pickEnemyForWave(map, difficulty, wave, totalWaves, rng), pathIndex: Math.floor(rng() * map.paths.length), delay: i === 0 ? 0.5 : delay };
    queue.push(e);
    maybeBurst(e);
  }
  return queue;
}
