import type { EnemyId, MapDef, RunState } from '@/types';

// Compute number of enemies for a given wave.
export function waveCount(wave: number): number {
  // Per spec §9.5: wave 1 is always 4. §9.4: count = clamp(5 + floor(wave*1.1), 5, 25)
  if (wave === 1) return 4;
  return Math.max(5, Math.min(25, 5 + Math.floor(wave * 1.1)));
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

// HP scale per wave based on difficulty.
export function hpScale(wave: number, difficulty: 'easy' | 'medium' | 'hard'): number {
  const p = { easy: 0.22, medium: 0.28, hard: 0.34 }[difficulty];
  return 1 + (wave - 1) * p;
}

// Speed scale per wave.
export function speedScale(wave: number, difficulty: 'easy' | 'medium' | 'hard'): number {
  const p = { easy: 0.02, medium: 0.04, hard: 0.06 }[difficulty];
  return 1 + (wave - 1) * p * 0.05; // Mild per-wave growth
}

// Boss HP formula (§9.3)
export function bossHpMult(wave: number): number {
  return 1 + (wave / 10 - 1) * 0.6;
}

// Determine if this wave has a boss.
export function bossForWave(map: MapDef, difficulty: 'easy' | 'medium' | 'hard', wave: number): EnemyId | null {
  const map_bosses = map.bosses[difficulty];
  return (map_bosses[wave] as EnemyId | undefined) ?? null;
}

export function isMiniBossWave(wave: number): boolean {
  // §3.1 mini-bosses on 5, 15, 25, 35, 45
  return wave > 0 && wave % 10 === 5;
}

// Pick an enemy from the map's appropriate phase pool.
function pickEnemyForWave(map: MapDef, wave: number, total: number, rng: () => number): EnemyId {
  const progress = wave / total;
  let pool: EnemyId[];
  if (progress < 0.34) pool = map.enemyPool.phase1;
  else if (progress < 0.67) pool = map.enemyPool.phase2;
  else pool = map.enemyPool.phase3;

  // Enforce progression ramps per spec §6.3
  pool = pool.filter((e) => {
    if (e === 'trojan' && wave < 4) return false;
    if (e === 'rootkit' && wave < 8) return false;
    if (e === 'phantom' && wave < 12) return false;
    return true;
  });
  if (pool.length === 0) pool = ['worm'];
  return pool[Math.floor(rng() * pool.length)];
}

// Build the spawn queue for a wave.
export function buildWaveSpawnQueue(map: MapDef, difficulty: 'easy' | 'medium' | 'hard', wave: number, totalWaves: number): RunState['spawnQueue'] {
  const rng = Math.random;
  const count = waveCount(wave);
  const delay = spawnDelay(wave);

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
      queue.push({
        def: pickEnemyForWave(map, wave, totalWaves, rng),
        pathIndex: Math.floor(rng() * map.paths.length),
        delay: i === 0 ? 0.5 : delay * 0.9,
      });
    }
    // gap before boss
    queue.push({ def: boss, pathIndex: 0, delay: delay * 2.5, boss: true });
    return queue;
  }

  // Mini-boss wave
  if (isMiniBossWave(wave)) {
    const softener = Math.max(3, Math.floor(count * 0.5));
    for (let i = 0; i < softener; i++) {
      queue.push({
        def: pickEnemyForWave(map, wave, totalWaves, rng),
        pathIndex: Math.floor(rng() * map.paths.length),
        delay: i === 0 ? 0.4 : delay,
      });
    }
    queue.push({ def: 'trojan', pathIndex: 0, delay: delay * 2.0, boss: true });
    return queue;
  }

  // Normal wave
  for (let i = 0; i < count; i++) {
    queue.push({
      def: pickEnemyForWave(map, wave, totalWaves, rng),
      pathIndex: Math.floor(rng() * map.paths.length),
      delay: i === 0 ? 0.5 : delay,
    });
  }
  return queue;
}
