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
// Scales by wave AND by map act — later acts in a campaign flood harder than
// early acts, so a wave-10 Act-1 run and a wave-10 Act-7 run feel noticeably
// different. The previous cap of 22 on medium was being hit by wave ~16 and
// never grew, which made mid-and-late-game rounds feel short.
//
// New growth curve (examples, medium):
//   Act 1 wave  5: ~14       (was 10)
//   Act 1 wave 20: ~36       (was capped 22)
//   Act 4 wave 10: ~30       (was 16)
//   Act 7 wave 20: ~55-70    (was capped 22)
export function waveCount(wave: number, difficulty: Difficulty = 'medium', mapAct = 1): number {
  if (wave === 1) return 4;
  const actMult = 1 + (mapAct - 1) * 0.15;              // act1=1x, act7=1.9x
  const base = 6 + Math.floor(wave * 1.5);               // faster growth than old 1.1
  const baseCap = { easy: 30, medium: 40, hard: 50 }[difficulty];
  const cap = Math.floor(baseCap * actMult);             // act scales cap too
  return Math.max(5, Math.min(cap, Math.floor(base * actMult)));
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

// Preview data for the upcoming wave — no RNG commit. Used by the pre-wave HUD so
// players can see what's coming and retool before starting. Returns the pool of
// enemies that CAN spawn (given gates + phase), approximate count, boss id if any,
// and active map modifiers as readable tags.
export interface WavePreview {
  wave: number;
  totalWaves: number;
  approxCount: number;
  boss: EnemyId | null;
  isMiniBoss: boolean;
  pool: EnemyId[];
  modifiers: string[];
}
export function getWavePreview(map: MapDef, difficulty: Difficulty, wave: number, totalWaves: number): WavePreview {
  const prof = DIFFICULTY_PROFILE[difficulty];
  const progress = wave / totalWaves;
  let pool: EnemyId[];
  if (progress < prof.phaseThresholds[0]) pool = [...map.enemyPool.phase1];
  else if (progress < prof.phaseThresholds[1]) pool = [...map.enemyPool.phase2];
  else pool = [...map.enemyPool.phase3];
  pool = pool.filter((e) => {
    const gate = prof.enemyGates[e as string];
    return gate === undefined || wave >= gate;
  });
  const modTags: string[] = [];
  const mods = map.modifiers;
  if (mods?.packetBursts) modTags.push(`PACKET BURSTS ${Math.round(mods.packetBursts * 100)}%`);
  if (mods?.lagSpike) modTags.push(`LAG SPIKE (${Math.round((1 + mods.lagSpike) * 100)}% / 2s every 25s)`);
  if (mods?.encrypted) modTags.push(`ENCRYPTED +${Math.round(mods.encrypted * 100)}% HP SHIELD (+25% vs EXPOSED)`);
  if (mods?.stealthChance) modTags.push(`STEALTH ${Math.round(mods.stealthChance * 100)}%`);
  if (mods?.replication) modTags.push(`REPLICATION ${Math.round(mods.replication * 100)}%`);
  if (mods?.rootkit) modTags.push(`ROOTKIT JAM ${mods.rootkit}s`);
  return {
    wave,
    totalWaves,
    approxCount: waveCount(wave, difficulty, map.act ?? 1),
    boss: bossForWave(map, difficulty, wave),
    isMiniBoss: isMiniBossWave(wave),
    pool,
    modifiers: modTags,
  };
}

// Build the spawn queue for a wave. `extraMods` are merged on top of the map's
// own modifiers — daily-contract mutators pass through this path.
export function buildWaveSpawnQueue(map: MapDef, difficulty: Difficulty, wave: number, totalWaves: number, extraMods?: MapDef['modifiers']): RunState['spawnQueue'] {
  const rng = Math.random;
  const count = waveCount(wave, difficulty, map.act ?? 1);
  const delay = spawnDelay(wave);
  // PACKET BURSTS sector modifier: chance each spawn drops a paired follow-up 0.1s later.
  const burstChance = (map.modifiers?.packetBursts ?? 0) + (extraMods?.packetBursts ?? 0);
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
