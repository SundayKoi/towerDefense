import type { DamageType, EnemyId, EnemyInstance, Projectile, RunState, TowerId, TowerInstance, Vec2 } from '@/types';
import { ENEMIES } from '@/data/enemies';
import { TOWERS } from '@/data/towers';
import { getMap, pathLength, posOnPath } from '@/data/maps';
import {
  bossForWave,
  bossHpMult,
  buildWaveSpawnQueue,
  hpScale,
} from './waves';
import { audio } from '@/audio/sfx';
import { xpForLevel } from './state';

let entityIdSeq = 1;
export const nextId = () => entityIdSeq++;

function hasEffect(s: RunState, tower: TowerId, tag: string): boolean {
  return s.towerEffects[tower]?.has(tag) ?? false;
}

// ======================= Wave flow =======================

export function startWave(s: RunState): void {
  s.wave += 1;
  const map = getMap(s.mapId);
  s.spawnQueue = buildWaveSpawnQueue(map, s.difficulty, s.wave, s.totalWaves);
  s.spawnElapsed = 0;
  s.phase = 'wave';
  audio.play('wave_start');
}

export interface EngineEvents {
  onGameOver: () => void;
  onVictory: () => void;
  onLevelUp: () => void;       // fires when s.pendingLevelUps goes from 0 → >0
  onWaveCleared: () => void;   // optional end-of-wave bonus hook
  onAutoStart: () => void;     // fires when the 10s countdown expires
  onNewEnemy?: (defId: EnemyId) => void; // first encounter this run
}

export function endWave(s: RunState, events: EngineEvents): void {
  const bonus = 25 + s.wave * 8;
  grantXp(s, bonus);
  const isBoss = bossForWave(getMap(s.mapId), s.difficulty, s.wave) != null;
  const bossBonus = isBoss ? (s.mods.bossProtocolBonus ?? 0) : 0;
  const proto = (isBoss ? 3 : 1) + bossBonus;
  s.protocolsEarned += proto;
  s.floaters.push({ pos: { x: 0, y: -0.5 }, text: `+${proto} \u2b22 PROTOCOL`, vy: -18, life: 2, maxLife: 2, color: '#ffd600', size: 16 });
  s.floaters.push({ pos: { x: 0, y: 0 }, text: `+${bonus} XP`, vy: -20, life: 2, maxLife: 2, color: '#00fff0', size: 28 });
  if (s.wave >= s.totalWaves) {
    s.phase = 'victory';
    events.onVictory();
    return;
  }
  s.phase = 'prep';
  s.autoStartTimer = 10;
  events.onWaveCleared();
}

// ======================= Spawning =======================

function spawnEnemy(s: RunState, defId: keyof typeof ENEMIES, pathIndex: number, isBoss = false, events?: EngineEvents): void {
  const def = ENEMIES[defId];
  const map = getMap(s.mapId);
  let hp = def.hp;
  if (isBoss || def.bossScale) {
    hp *= bossHpMult(Math.max(10, s.wave));
  } else {
    if (s.wave === 1 && defId === 'worm') {
      hp = 20;
    } else {
      hp *= hpScale(s.wave, s.difficulty);
    }
  }
  const speed = def.speed * (s.mods.enemySpeedMult) * (1 + Math.min(0.3, (s.wave - 1) * 0.01));
  const path = map.paths[pathIndex] ?? map.paths[0];
  const start = path.points[0];

  // First-encounter detection for enemy intro popups
  if (events?.onNewEnemy && !s.seenThisRun.has(defId)) {
    s.seenThisRun.add(defId);
    events.onNewEnemy(defId);
  }

  s.enemies.push({
    id: nextId(),
    def: defId,
    hp,
    maxHp: hp,
    pathIndex,
    progress: 0,
    pos: { x: start.x, y: start.y },
    baseSpeed: speed,
    speedMult: 1,
    slowTimer: 0,
    armor: Math.max(0, (def.armor ?? 0) - (s.mods.globalArmorReduction ?? 0)),
    alive: true,
    isBoss: isBoss || def.threat === 'BOSS' || def.threat === 'MEGA' || def.threat === 'FINAL',
    size: def.size,
    invisTimer: 0,
    hitFlash: 0,
    angle: 0,
  });
}

// ======================= XP / Level =======================

function grantXp(s: RunState, amount: number): void {
  const gain = Math.round(amount * s.mods.xpMult);
  s.xp += gain;
  s.xpThisRun += gain;
  while (s.xp >= s.xpToNext) {
    s.xp -= s.xpToNext;
    s.level += 1;
    s.xpToNext = xpForLevel(s.level);
    s.pendingLevelUps += 1;
  }
}

// ======================= Puddles =======================

function updatePuddles(s: RunState, dt: number): void {
  for (const pu of s.puddles) {
    pu.timeLeft -= dt;
    for (const e of s.enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.pos.x - pu.pos.x, e.pos.y - pu.pos.y) <= pu.radius) {
        const slowPct = pu.slowPct + (hasEffect(s, 'sentinel', 'contamination') ? 0.25 : 0);
        if (slowPct > 0 && !ENEMIES[e.def].slowImmune) {
          e.speedMult = Math.min(e.speedMult, 1 - slowPct);
          e.slowTimer = Math.max(e.slowTimer, pu.slowDuration);
        }
        if (pu.damagePerSec) {
          let dps = pu.damagePerSec;
          // Brittle: slowed/frozen enemies take +15% from all sources
          if (hasEffect(s, 'ice', 'brittle') && e.speedMult < 1) dps *= 1.15;
          damageEnemy(s, e, dps * dt, false, 'energy', true, pu.fromTower);
        }
      }
    }
  }
  // Volatile: honeypot puddles explode when they expire
  for (let i = s.puddles.length - 1; i >= 0; i--) {
    const pu = s.puddles[i];
    if (pu.timeLeft <= 0) {
      if (pu.fromTower === 'honeypot' && hasEffect(s, 'honeypot', 'volatile')) {
        spawnExplosion(s, pu.pos, '#ffd600', pu.radius);
        for (const e of s.enemies) {
          if (!e.alive) continue;
          if (Math.hypot(e.pos.x - pu.pos.x, e.pos.y - pu.pos.y) <= pu.radius) {
            damageEnemy(s, e, 30, false, 'aoe', false, 'honeypot');
          }
        }
      }
      s.puddles.splice(i, 1);
    }
  }
}

// ======================= Sentinel passive field =======================

function updateSentinelTower(s: RunState, t: TowerInstance, dt: number): void {
  // Overdrive ticks even on sentinel — when offline the field shuts off entirely.
  if (!tickOverdrive(t, dt)) return;
  const def = TOWERS[t.def];
  const range = effectiveRange(s, t)
    + (hasEffect(s, 'sentinel', 'expanded') ? 0.8 : 0)
    + (hasEffect(s, 'sentinel', 'node_broadcast') ? 0.5 : 0);
  const baseDps = (hasEffect(s, 'sentinel', 'reinforced') ? 20 : def.damage)
    + (hasEffect(s, 'sentinel', 'overclocked') ? 8 : 0);
  const slowPct = hasEffect(s, 'sentinel', 'anchor') ? 0.45 : def.slow!.pct;
  const slowDur = def.slow!.duration;

  // Surge event: every 5s emit 5x damage surge for 0.5s
  t.extras.surgeTimer = (t.extras.surgeTimer ?? 5) - dt;
  t.extras.surgeActive = Math.max(0, (t.extras.surgeActive ?? 0) - dt);
  if (hasEffect(s, 'sentinel', 'surge_event') && t.extras.surgeTimer <= 0) {
    t.extras.surgeTimer = 5;
    t.extras.surgeActive = 0.5;
    t.fireFlash = 0.4;
  }
  const surgeMult = (hasEffect(s, 'sentinel', 'surge_event') && (t.extras.surgeActive ?? 0) > 0) ? 5 : 1;

  // Pulse-link: mark all enemies in range every 5s
  t.extras.pulseTimer = (t.extras.pulseTimer ?? 0) - dt;
  if (hasEffect(s, 'sentinel', 'pulse_link') && t.extras.pulseTimer <= 0) {
    t.extras.pulseTimer = 5;
    for (const e of s.enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.pos.x - t.grid.x, e.pos.y - t.grid.y) <= range) {
        e.marked = Math.max(e.marked ?? 0, 2);
      }
    }
    t.fireFlash = 0.3;
  }

  for (const e of s.enemies) {
    if (!e.alive) continue;
    const dist = Math.hypot(e.pos.x - t.grid.x, e.pos.y - t.grid.y);
    if (dist > range) continue;

    // Slow
    const slowImmune = ENEMIES[e.def].slowImmune;
    if (!slowImmune || hasEffect(s, 'sentinel', 'anchor')) {
      const anchorSlow = hasEffect(s, 'sentinel', 'total_suppression') ? 0.35 : 0.20;
      const actualSlow = (slowImmune && hasEffect(s, 'sentinel', 'anchor')) ? anchorSlow : slowPct;
      e.speedMult = Math.min(e.speedMult, 1 - actualSlow);
      e.slowTimer = Math.max(e.slowTimer, slowDur * 2);
    }

    // Trauma protocol: mark enemies in field
    if (hasEffect(s, 'sentinel', 'trauma_protocol')) {
      e.marked = Math.max(e.marked ?? 0, 0.5);
    }

    // Damage (silent — DoT numbers are visual noise)
    damageEnemy(s, e, baseDps * surgeMult * dt, false, 'energy', true, 'sentinel');
  }

  // Gentle fireFlash pulse for visual
  t.extras.flashTimer = (t.extras.flashTimer ?? 0) - dt;
  if (t.extras.flashTimer <= 0) {
    t.extras.flashTimer = 1.0;
    t.fireFlash = 0.15;
  }
}

// ======================= Pulse (EMP) burst =======================

function updatePulseTower(s: RunState, t: TowerInstance, dt: number): void {
  if (!tickOverdrive(t, dt)) { t.cooldown = Math.max(0, t.cooldown - dt); return; }
  t.cooldown = Math.max(0, t.cooldown - dt);

  const rechargeTime = 2.5
    - (hasEffect(s, 'pulse', 'frequency') ? 0.7 : 0)
    - (hasEffect(s, 'pulse', 'rapid_resonance') ? 0.4 : 0);
  const range = effectiveRange(s, t) + (hasEffect(s, 'pulse', 'amplify') ? 0.6 : 0);

  if (t.cooldown <= 0) {
    // Only fire if at least one enemy is in range — don't waste the visual burst on empty scans.
    let anyInRange = false;
    for (const e of s.enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.pos.x - t.grid.x, e.pos.y - t.grid.y) <= range) { anyInRange = true; break; }
    }
    if (!anyInRange) {
      t.cooldown = 0.2; // short re-scan, no burst, no shake, no sound
      return;
    }
    t.extras.burstCount = (t.extras.burstCount ?? 0) + 1;
    const isOverload = hasEffect(s, 'pulse', 'overload') && t.extras.burstCount % 4 === 0;
    const dmgMult = isOverload ? 3.0 : 1.0;
    const baseDmg = effectiveDamage(s, t) * dmgMult * (hasEffect(s, 'pulse', 'capacitor_boost') ? 1.15 : 1.0);

    let hitAny = false;
    for (const e of s.enemies) {
      if (!e.alive) continue;
      const dist = Math.hypot(e.pos.x - t.grid.x, e.pos.y - t.grid.y);
      if (dist > range) continue;
      hitAny = true;

      // Ionic: ignore armor for EMP hits
      const savedArmor = e.armor;
      if (hasEffect(s, 'pulse', 'ionic')) e.armor = 0;
      damageEnemy(s, e, baseDmg, false, 'energy', false, 'pulse');
      if (hasEffect(s, 'pulse', 'ionic')) e.armor = savedArmor;

      // Stun effect
      if (hasEffect(s, 'pulse', 'stun') && !ENEMIES[e.def].slowImmune) {
        e.speedMult = 0;
        e.slowTimer = Math.max(e.slowTimer, 0.5);
      }

      // Cascade: push enemy back slightly
      if (hasEffect(s, 'pulse', 'cascade')) {
        e.progress = Math.max(0, e.progress - 0.15);
      }

      // Concussive: push enemy back (smaller than cascade, additive)
      if (hasEffect(s, 'pulse', 'concussive')) {
        e.progress = Math.max(0, e.progress - 0.12);
      }

      // Overload shock: slow on overload bursts
      if (isOverload && hasEffect(s, 'pulse', 'overload_shock') && !ENEMIES[e.def].slowImmune) {
        e.speedMult = Math.min(e.speedMult, 0.6);
        e.slowTimer = Math.max(e.slowTimer, 1.5);
      }

      // Cryopulse synergy: freeze already-slowed enemies
      if (hasEffect(s, 'pulse', 'cryopulse') && e.speedMult < 1 && !ENEMIES[e.def].slowImmune) {
        e.speedMult = 0;
        e.slowTimer = Math.max(e.slowTimer, 0.4);
      }

      // Signal jam synergy: apply armor strip
      if (hasEffect(s, 'pulse', 'signal_jam')) {
        e.armor = Math.max(0, e.armor - 3);
      }

      // Storm pulse synergy: trigger chain arc on each hit
      if (hasEffect(s, 'pulse', 'storm_pulse') && s.projectiles.length < 300) {
        const chainT = s.towers.find((tw) => tw.def === 'chain');
        if (chainT) {
          const hit = new Set<number>([e.id]);
          const next = findChainTarget(s, e, hit, hasEffect(s, 'chain', 'nova') ? 4.4 : 2.2);
          if (next) {
            s.projectiles.push({
              id: nextId(),
              pos: { x: e.pos.x, y: e.pos.y },
              target: next.id,
              targetPos: { x: next.pos.x, y: next.pos.y },
              damage: effectiveDamage(s, chainT) * (hasEffect(s, 'chain', 'discharge') ? 1.0 : 0.8),
              speed: 30,
              color: TOWERS.chain.projectileColor,
              trailColor: TOWERS.chain.trailColor,
              fromTower: 'chain',
              damageType: 'chain',
              chain: { jumps: 2, falloff: hasEffect(s, 'chain', 'discharge') ? 1.0 : 0.8, hit },
              trail: [],
            });
          }
        }
      }
    }

    if (hitAny) {
      // Visual burst ring — use soft particle ring instead of spawnExplosion (no screen shake, no explode sound)
      spawnPulseRing(s, t.grid, TOWERS.pulse.projectileColor, range);
      t.fireFlash = 0.15;
      if (isOverload) {
        s.floaters.push({ pos: { x: t.grid.x, y: t.grid.y - 0.8 }, text: 'OVERLOAD!', vy: -28, life: 1.2, maxLife: 1.2, color: '#ffffff', size: 18 });
      }
      audio.play('fire_pulse');
    }
    t.cooldown = rechargeTime;
  }
}

// ======================= Update =======================

export function updateRun(s: RunState, dtSec: number, events: EngineEvents): void {
  if (s.phase === 'paused' || s.phase === 'draft' || s.phase === 'intel' || s.phase === 'gameover' || s.phase === 'victory') {
    tickFxOnly(s, dtSec);
    return;
  }

  s.elapsed += dtSec;

  if (s.shakeTime > 0) s.shakeTime = Math.max(0, s.shakeTime - dtSec);

  // Auto-start countdown
  if (s.phase === 'prep' && s.autoStartTimer !== null) {
    s.autoStartTimer -= dtSec;
    if (s.autoStartTimer <= 0) {
      s.autoStartTimer = null;
      events.onAutoStart();
    }
  }

  // Spawn queue
  if (s.phase === 'wave' && s.spawnQueue.length > 0) {
    s.spawnElapsed += dtSec;
    const first = s.spawnQueue[0];
    if (s.spawnElapsed >= first.delay) {
      spawnEnemy(s, first.def, first.pathIndex, first.boss, events);
      s.spawnQueue.shift();
      s.spawnElapsed = 0;
    }
  }

  // Update enemies
  const map = getMap(s.mapId);
  for (const e of s.enemies) {
    if (!e.alive) continue;
    if (e.slowTimer > 0) {
      e.slowTimer -= dtSec;
      if (e.slowTimer <= 0) e.speedMult = 1;
    }
    if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dtSec);
    if (e.marked !== undefined && e.marked > 0) {
      e.marked = Math.max(0, e.marked - dtSec);
    }
    if (e.collapseTimer !== undefined && e.collapseTimer > 0) {
      e.collapseTimer -= dtSec;
      if (e.collapseTimer <= 0) {
        e.armor = ENEMIES[e.def].armor ?? 0;
        e.collapseTimer = undefined;
      }
    }

    // Honeypot coating: spread slow to adjacent enemies
    if (hasEffect(s, 'honeypot', 'coating') && e.speedMult < 0.9) {
      for (const other of s.enemies) {
        if (!other.alive || other.id === e.id) continue;
        if (Math.hypot(other.pos.x - e.pos.x, other.pos.y - e.pos.y) <= 0.8 && !ENEMIES[other.def].slowImmune) {
          other.speedMult = Math.min(other.speedMult, 1 - (1 - e.speedMult) * 0.5);
          other.slowTimer = Math.max(other.slowTimer, 0.5);
        }
      }
    }

    const speed = e.baseSpeed * e.speedMult;
    e.progress += speed * dtSec;
    const path = map.paths[e.pathIndex] ?? map.paths[0];
    const pos = posOnPath(path, e.progress);
    e.pos.x = pos.x;
    e.pos.y = pos.y;
    e.angle = pos.angle;

    // Rootkit: periodically infects nearby towers
    if (e.def === 'rootkit') {
      e.debuffTimer = (e.debuffTimer ?? 4) - dtSec;
      if (e.debuffTimer <= 0) {
        e.debuffTimer = 4;
        for (const t of s.towers) {
          if (Math.hypot(t.pos.x - e.pos.x, t.pos.y - e.pos.y) <= 2.5) {
            applyTowerDebuff(s, t, 'infected', 5);
          }
        }
      }
    }

    // Parasite: infects nearest tower on close approach then dies
    if (e.def === 'parasite') {
      for (const t of s.towers) {
        if (Math.hypot(t.pos.x - e.pos.x, t.pos.y - e.pos.y) <= 0.6) {
          applyTowerDebuff(s, t, 'infected', 6);
          e.alive = false;
          spawnDeathBurst(s, e.pos, ENEMIES.parasite.color, ENEMIES.parasite.accent, 8);
          s.floaters.push({ pos: { x: e.pos.x, y: e.pos.y - 0.4 }, text: 'INFECTED!', vy: -22, life: 1.5, maxLife: 1.5, color: '#a800ff', size: 16 });
          break;
        }
      }
      if (!e.alive) continue;
    }

    const total = pathLength(path);
    if (e.progress >= total) {
      const dmg = ENEMIES[e.def].damage;
      e.alive = false;
      s.hp -= dmg;
      s.shakeTime = 0.35;
      s.shakeAmp = 12;
      audio.play('damage');
      if (s.hp <= 0) {
        if (s.mods.revive) {
          s.mods.revive = false;
          s.hp = 5;
          s.floaters.push({ pos: { x: 0, y: 0 }, text: 'REVIVE', vy: -30, life: 2, maxLife: 2, color: '#ffae00', size: 36 });
          audio.play('revive');
        } else {
          s.hp = 0;
          s.phase = 'gameover';
          events.onGameOver();
          return;
        }
      }
    }
  }

  // Puddle updates
  updatePuddles(s, dtSec);

  // Tower updates
  for (const t of s.towers) {
    if (t.def === 'sentinel') {
      updateSentinelTower(s, t, dtSec);
      if (t.fireFlash > 0) t.fireFlash = Math.max(0, t.fireFlash - dtSec);
      continue;
    }
    if (t.def === 'pulse') {
      // debuff ticking (in-place splice to avoid per-frame array allocation)
      for (const d of t.debuffs) d.timeLeft -= dtSec;
      for (let i = t.debuffs.length - 1; i >= 0; i--) { if (t.debuffs[i].timeLeft <= 0) t.debuffs.splice(i, 1); }
      updatePulseTower(s, t, dtSec);
      if (t.fireFlash > 0) t.fireFlash = Math.max(0, t.fireFlash - dtSec);
      continue;
    }
    updateTower(s, t, dtSec);
    if (t.fireFlash > 0) t.fireFlash = Math.max(0, t.fireFlash - dtSec);
  }

  // Projectile updates
  for (const p of s.projectiles) updateProjectile(s, p, dtSec);

  // Remove dead — splice in-place to avoid per-frame array allocation
  for (let i = s.enemies.length - 1; i >= 0; i--) { if (!s.enemies[i].alive) s.enemies.splice(i, 1); }
  for (let i = s.projectiles.length - 1; i >= 0; i--) { if (s.projectiles[i].target === -2) s.projectiles.splice(i, 1); }

  // Hard caps — trim oldest to prevent unbounded growth (chain persistence, incendiary puddles, etc.)
  if (s.puddles.length > 100) s.puddles.splice(0, s.puddles.length - 100);
  if (s.projectiles.length > 350) s.projectiles.splice(0, s.projectiles.length - 350);
  if (s.floaters.length > 60) s.floaters.splice(0, s.floaters.length - 60);
  // Trim projectile trails aggressively in case any leak past the per-frame shift
  for (const p of s.projectiles) { if (p.trail.length > 8) p.trail.length = 6; }

  tickFxOnly(s, dtSec);

  if (s.pendingLevelUps > 0) {
    events.onLevelUp();
  }

  // Wave end check
  if (s.phase === 'wave' && s.spawnQueue.length === 0 && s.enemies.length === 0) {
    endWave(s, events);
  }
}

function tickFxOnly(s: RunState, dtSec: number): void {
  for (const p of s.particles) {
    p.pos.x += p.vel.x * dtSec;
    p.pos.y += p.vel.y * dtSec;
    if (p.gravity) p.vel.y += p.gravity * dtSec;
    p.life -= dtSec;
  }
  for (let i = s.particles.length - 1; i >= 0; i--) { if (s.particles[i].life <= 0) s.particles.splice(i, 1); }
  for (const f of s.floaters) {
    f.life -= dtSec;
    f.pos.y += f.vy * dtSec * 0.01;
  }
  for (let i = s.floaters.length - 1; i >= 0; i--) { if (s.floaters[i].life <= 0) s.floaters.splice(i, 1); }
}

// ======================= Tower targeting & firing =======================

function effectiveRange(s: RunState, t: TowerInstance): number {
  const def = TOWERS[t.def];
  const specificRange = s.mods.towerRange[t.def] ?? 0;
  let r = def.range * (1 + s.mods.globalRangePct + specificRange);
  if (t.def === 'mine' && hasEffect(s, 'mine', 'pressure_fuse')) r += 0.4;
  return r;
}

function effectiveDamage(s: RunState, t: TowerInstance): number {
  const def = TOWERS[t.def];
  const specific = s.mods.towerDmg[t.def] ?? 0;
  let dmg = def.damage * (1 + s.mods.globalDamagePct + specific);
  if (t.debuffs.some((d) => d.kind === 'infected')) dmg *= 0.55;
  // Subnet bonus: damage multiplier from being adjacent to other turrets.
  // Cached per tower in extras.subnetMult; recomputed on place/remove.
  dmg *= (t.extras.subnetMult ?? 1);
  // Overdrive: +200% damage for the boost duration.
  if ((t.extras.overdriveActive ?? 0) > 0) dmg *= 3;
  // Exotic redundancy: 4+ different tower types placed = +20% global damage
  // Count unique tower types without allocating a Set.
  if (s.cardsPicked.includes('exotic_redundancy') && s.towers.length >= 4) {
    let unique = 0;
    for (let i = 0; i < s.towers.length; i++) {
      const id = s.towers[i].def;
      let seen = false;
      for (let j = 0; j < i; j++) { if (s.towers[j].def === id) { seen = true; break; } }
      if (!seen) unique++;
      if (unique >= 4) { dmg *= 1.2; break; }
    }
  }
  return dmg;
}

function effectiveFireRate(s: RunState, t: TowerInstance, dt = 0): number {
  const def = TOWERS[t.def];
  const specificRate = s.mods.towerRate[t.def] ?? 0;
  let rate = def.fireRate * (1 + s.mods.globalRatePct + specificRate);
  if (t.debuffs.some((d) => d.kind === 'jammed')) rate *= 0.35;
  // Scrambler feedback: +0.5 fire rate per debuffed enemy in range
  if (t.def === 'scrambler' && hasEffect(s, 'scrambler', 'feedback')) {
    const range = effectiveRange(s, t);
    const debuffedInRange = s.enemies.filter((e) =>
      e.alive && e.armor < (ENEMIES[e.def].armor ?? 0) &&
      Math.hypot(e.pos.x - t.grid.x, e.pos.y - t.grid.y) <= range
    ).length;
    rate += debuffedInRange * 0.5;
  }
  // Artillery (mine) auto-loader: +25% fire rate
  if (t.def === 'mine' && hasEffect(s, 'mine', 'resupply')) rate *= 1.25;
  // Firewall blazing: +25% fire rate during active window, tick timers
  if (t.def === 'firewall' && hasEffect(s, 'firewall', 'blazing')) {
    if (dt > 0) {
      if ((t.extras.blazingTimer ?? 0) > 0) {
        t.extras.blazingTimer = Math.max(0, (t.extras.blazingTimer ?? 0) - dt);
        if (t.extras.blazingTimer <= 0) t.extras.blazingKills = 0;
      }
      if ((t.extras.blazingActive ?? 0) > 0) {
        t.extras.blazingActive = Math.max(0, (t.extras.blazingActive ?? 0) - dt);
      }
    }
    if ((t.extras.blazingActive ?? 0) > 0) rate *= 1.25;
  }
  // Overdrive: +100% fire rate for the boost duration.
  if ((t.extras.overdriveActive ?? 0) > 0) rate *= 2;
  return rate;
}

// ======================= Subnet Links =======================
// Adjacent turrets (≤1 cell, including diagonals) form a connected subnet.
// Each subnet grants its members a damage multiplier scaled by size + diversity.
// Cached per tower in extras.subnetMult — recomputed on place/remove.
export function computeSubnets(s: RunState): void {
  const visited = new Set<number>();
  for (const t of s.towers) {
    if (visited.has(t.id)) continue;
    // BFS for the connected component containing t.
    const cluster: TowerInstance[] = [];
    const queue: TowerInstance[] = [t];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (visited.has(cur.id)) continue;
      visited.add(cur.id);
      cluster.push(cur);
      for (const other of s.towers) {
        if (visited.has(other.id) || other.id === cur.id) continue;
        if (Math.abs(cur.grid.x - other.grid.x) <= 1 && Math.abs(cur.grid.y - other.grid.y) <= 1) {
          queue.push(other);
        }
      }
    }
    // Mult = base 1 + 8% per extra node + 12% per extra unique type, capped at 1.6×.
    const size = cluster.length;
    const types = new Set(cluster.map((c) => c.def));
    const mult = Math.min(1.6, 1 + 0.08 * (size - 1) + 0.12 * (types.size - 1));
    for (const c of cluster) {
      c.extras.subnetMult = mult;
      c.extras.subnetSize = size;
      c.extras.subnetTypes = types.size;
    }
  }
}

// ======================= Overdrive =======================
// Player-triggered burst: 4s of 3× damage / 2× rate, then 6s offline (no firing),
// then a 30s recharge before it can be triggered again. State is stored in extras:
//   overdriveActive: seconds remaining of the boost
//   overdriveOffline: seconds remaining of the disabled phase (after boost ends)
//   overdriveCharge:  seconds remaining until ready to trigger again
const OVERDRIVE_ACTIVE = 4;
const OVERDRIVE_OFFLINE = 6;
const OVERDRIVE_RECHARGE = 30;

export function overdriveState(t: TowerInstance): 'ready' | 'active' | 'offline' | 'charging' {
  if ((t.extras.overdriveActive ?? 0) > 0) return 'active';
  if ((t.extras.overdriveOffline ?? 0) > 0) return 'offline';
  if ((t.extras.overdriveCharge ?? 0) > 0) return 'charging';
  return 'ready';
}

export function overdriveTimeLeft(t: TowerInstance): number {
  if ((t.extras.overdriveActive ?? 0) > 0) return t.extras.overdriveActive;
  if ((t.extras.overdriveOffline ?? 0) > 0) return t.extras.overdriveOffline;
  if ((t.extras.overdriveCharge ?? 0) > 0) return t.extras.overdriveCharge;
  return 0;
}

export function triggerOverdrive(s: RunState, t: TowerInstance): boolean {
  if (overdriveState(t) !== 'ready') return false;
  t.extras.overdriveActive = OVERDRIVE_ACTIVE;
  t.extras.overdriveCharge = OVERDRIVE_RECHARGE;
  t.fireFlash = 0.4;
  s.floaters.push({ pos: { x: t.pos.x, y: t.pos.y - 0.6 }, text: 'OVERDRIVE', vy: -28, life: 1.2, maxLife: 1.2, color: '#ffd600', size: 16 });
  audio.play('upgrade');
  return true;
}

// Tick overdrive timers. Returns true if tower can fire this frame.
function tickOverdrive(t: TowerInstance, dt: number): boolean {
  if ((t.extras.overdriveActive ?? 0) > 0) {
    t.extras.overdriveActive = Math.max(0, t.extras.overdriveActive - dt);
    if (t.extras.overdriveActive <= 0) t.extras.overdriveOffline = OVERDRIVE_OFFLINE;
  }
  if ((t.extras.overdriveOffline ?? 0) > 0) {
    t.extras.overdriveOffline = Math.max(0, t.extras.overdriveOffline - dt);
  }
  if ((t.extras.overdriveCharge ?? 0) > 0) {
    t.extras.overdriveCharge = Math.max(0, t.extras.overdriveCharge - dt);
  }
  // Tower can't fire while offline.
  return (t.extras.overdriveOffline ?? 0) <= 0;
}

export function applyTowerDebuff(s: RunState, t: TowerInstance, kind: 'jammed' | 'infected', duration: number): void {
  const existing = t.debuffs.find((d) => d.kind === kind);
  if (existing) { existing.timeLeft = Math.max(existing.timeLeft, duration); return; }
  t.debuffs.push({ kind, timeLeft: duration });
  s.floaters.push({
    pos: { x: t.pos.x, y: t.pos.y - 0.6 },
    text: kind === 'jammed' ? 'JAMMED' : 'INFECTED',
    vy: -22,
    life: 1.2,
    maxLife: 1.2,
    color: kind === 'jammed' ? '#ff6b00' : '#a800ff',
    size: 14,
  });
}

function updateTower(s: RunState, t: TowerInstance, dt: number): void {
  for (const d of t.debuffs) d.timeLeft -= dt;
  // In-place splice to avoid per-frame array allocation per tower
  for (let i = t.debuffs.length - 1; i >= 0; i--) { if (t.debuffs[i].timeLeft <= 0) t.debuffs.splice(i, 1); }
  // Overdrive timers — when offline, skip firing entirely.
  if (!tickOverdrive(t, dt)) { t.cooldown = Math.max(0, t.cooldown - dt); return; }
  t.cooldown = Math.max(0, t.cooldown - dt);

  // Quantum observer: charge idle time for extra crit mult
  if (t.def === 'quantum' && hasEffect(s, 'quantum', 'observer')) {
    if (t.cooldown > 0) {
      // Not firing — accumulate charge (capped at 6 = +3.0 extra mult)
      t.extras.observerCharge = Math.min(6, (t.extras.observerCharge ?? 0) + dt * 2);
    }
  }

  // Railgun capacitor: charge for 8s then auto-fire a 5× mega shot
  if (t.def === 'railgun' && hasEffect(s, 'railgun', 'capacitor')) {
    t.extras.chargeTimer = (t.extras.chargeTimer ?? 8) - dt;
    if (t.extras.chargeTimer <= 0) {
      t.extras.chargeTimer = 8;
      const range = effectiveRange(s, t) * 2;
      let megaTarget: EnemyInstance | null = null;
      let best = -Infinity;
      for (const e of s.enemies) {
        if (!e.alive) continue;
        const d = Math.hypot(e.pos.x - t.grid.x, e.pos.y - t.grid.y);
        if (d <= range && e.hp > best) { megaTarget = e; best = e.hp; }
      }
      if (megaTarget) {
        const def = TOWERS[t.def];
        const megaDmg = effectiveDamage(s, t) * 5;
        s.projectiles.push({
          id: nextId(),
          pos: { x: t.grid.x, y: t.grid.y },
          target: megaTarget.id,
          targetPos: { x: megaTarget.pos.x, y: megaTarget.pos.y },
          damage: megaDmg,
          speed: def.projectileSpeed * 1.5,
          color: '#ffffff',
          trailColor: '#aaddff',
          fromTower: 'railgun',
          damageType: def.damageType,
          isCrit: true,
          pierce: true,
          trail: [],
        });
        t.fireFlash = 0.4;
        s.floaters.push({ pos: { x: t.pos.x, y: t.pos.y - 0.8 }, text: 'MEGA SHOT', vy: -30, life: 1.2, maxLife: 1.2, color: '#ffffff', size: 18 });
        audio.play('fire_railgun');
      }
    }
  }

  const range = effectiveRange(s, t);
  let best: EnemyInstance | null = null;
  let bestScore = -Infinity;
  for (const e of s.enemies) {
    if (!e.alive) continue;
    const dx = e.pos.x - t.grid.x;
    const dy = e.pos.y - t.grid.y;
    const dist = Math.hypot(dx, dy);
    if (dist > range) continue;
    let score = 0;
    switch (t.targetMode) {
      case 'first':  score = e.progress; break;
      case 'strong': score = e.hp; break;
      case 'weak':   score = -e.hp; break;
      case 'close':  score = -dist; break;
    }
    // Antivirus overdrive: prefer marked targets
    if (t.def === 'antivirus' && hasEffect(s, 'antivirus', 'lockdown') && (e.marked ?? 0) > 0) score += 999;
    if (score > bestScore) { bestScore = score; best = e; }
  }
  if (best) {
    t.targetId = best.id;
    t.angle = Math.atan2(best.pos.y - t.grid.y, best.pos.x - t.grid.x);
    if (t.cooldown <= 0) {
      fire(s, t, best);
      const rate = effectiveFireRate(s, t, dt);
      t.cooldown = 1 / rate;
      t.fireFlash = 0.15;
    }
  } else {
    t.targetId = null;
  }
}

function fire(s: RunState, t: TowerInstance, target: EnemyInstance): void {
  const def = TOWERS[t.def];
  const baseDmg = effectiveDamage(s, t);
  let isCrit = false;
  const specificCrit = s.mods.towerCrit[t.def] ?? 0;
  let critChance = (def.crit?.chance ?? 0) + s.mods.globalCritChance + specificCrit;
  // Quantum unstable: +8% crit chance
  if (t.def === 'quantum' && hasEffect(s, 'quantum', 'unstable')) critChance += 0.08;
  // Quantum supercharge: guaranteed crit after a crit
  if (t.def === 'quantum' && hasEffect(s, 'quantum', 'supercharge') && (t.extras.superchargeReady ?? 0) > 0) {
    isCrit = true;
    t.extras.superchargeReady = 0;
  } else if (critChance > 0 && Math.random() < critChance) isCrit = true;
  // Precision matrix: ANTIVIRUS marks cause quantum guaranteed crit
  if (t.def === 'quantum' && hasEffect(s, 'quantum', 'precision_matrix') && (target.marked ?? 0) > 0) isCrit = true;

  // Quantum observer: boost crit mult on next shot
  let critMult = def.crit?.mult ?? 3;
  if (t.def === 'quantum' && hasEffect(s, 'quantum', 'observer') && (t.extras.observerCharge ?? 0) > 0) {
    critMult += (t.extras.observerCharge ?? 0) * 0.5;
    t.extras.observerCharge = 0;
  }
  const dmg = isCrit ? baseDmg * critMult : baseDmg;

  let aoe = def.aoe?.radius;
  if (t.def === 'ice' && aoe) {
    if (hasEffect(s, 'ice', 'wide')) aoe *= 1.7;
    if (hasEffect(s, 'ice', 'ice_lance')) aoe *= 1.2;
  }
  if (t.def === 'mine' && aoe && hasEffect(s, 'mine', 'wide')) aoe *= 2;

  let chainJumps = def.chain?.jumps ?? 0;
  let chainFalloff = def.chain?.falloff ?? 0.8;
  if (t.def === 'chain') {
    if (hasEffect(s, 'chain', 'storm')) chainJumps += 2;
    if (hasEffect(s, 'chain', 'discharge')) chainFalloff = 1.0;
    // Megavolt: every 6th shot has unlimited jumps
    t.extras.shotCount = (t.extras.shotCount ?? 0) + 1;
    if (hasEffect(s, 'chain', 'megavolt') && t.extras.shotCount % 6 === 0) {
      chainJumps = 999;
      chainFalloff = 1.0;
      s.floaters.push({ pos: { x: t.grid.x, y: t.grid.y - 0.8 }, text: 'MEGAVOLT!', vy: -28, life: 1.0, maxLife: 1.0, color: '#ffffff', size: 16 });
    }
  }

  const projSpeed = (t.def === 'railgun' && hasEffect(s, 'railgun', 'hypersonic'))
    ? def.projectileSpeed * 2
    : def.projectileSpeed;

  const proj: Projectile = {
    id: nextId(),
    pos: { x: t.grid.x, y: t.grid.y },
    target: target.id,
    targetPos: { x: target.pos.x, y: target.pos.y },
    damage: dmg,
    speed: projSpeed,
    color: def.projectileColor,
    trailColor: def.trailColor,
    fromTower: t.def,
    damageType: def.damageType,
    aoe,
    isCrit,
    pierce: def.pierce,
    slow: def.slow ? { pct: def.slow.pct, duration: def.slow.duration } : undefined,
    chain: def.chain ? { jumps: chainJumps, falloff: chainFalloff, hit: new Set<number>([target.id]) } : undefined,
    trail: [],
  };
  s.projectiles.push(proj);

  // Antivirus: fire 2 (or 3 with triple) projectiles at nearest enemies
  if (t.def === 'antivirus') {
    const range = effectiveRange(s, t);
    const triple = hasEffect(s, 'antivirus', 'triple');
    const precision = hasEffect(s, 'antivirus', 'precision');
    const precisionBurst = hasEffect(s, 'antivirus', 'precision_burst');
    const extras: EnemyInstance[] = [];
    for (const e of s.enemies) {
      if (!e.alive || e.id === target.id) continue;
      if (Math.hypot(e.pos.x - t.grid.x, e.pos.y - t.grid.y) <= range) extras.push(e);
      if (extras.length >= (triple ? 2 : 1)) break;
    }
    const shotCount = triple ? 2 : 1;
    for (let i = 0; i < shotCount; i++) {
      const tgt = extras[i] ?? target;
      const isPrec = precision ? true : isCrit;
      const extraDmgMult = (precisionBurst && isPrec) ? 1.5 : 1.0;
      s.projectiles.push({
        ...proj,
        id: nextId(),
        pos: { x: t.grid.x + (i + 1) * 0.12, y: t.grid.y - (i + 1) * 0.12 },
        target: tgt.id,
        targetPos: { x: tgt.pos.x, y: tgt.pos.y },
        damage: dmg * (i === 0 ? 0.7 : 0.55) * extraDmgMult,
        isCrit: isPrec,
        trail: [],
      });
    }
    // Burst mode: fire 4th shot immediately after burst
    if (triple && hasEffect(s, 'antivirus', 'burst_mode')) {
      const tgt4 = extras[2] ?? extras[1] ?? target;
      s.projectiles.push({
        ...proj,
        id: nextId(),
        pos: { x: t.grid.x + 3 * 0.12, y: t.grid.y - 3 * 0.12 },
        target: tgt4.id,
        targetPos: { x: tgt4.pos.x, y: tgt4.pos.y },
        damage: dmg * 0.5,
        isCrit,
        trail: [],
      });
    }
    // Antivirus overdrive: every 3rd kill fires a free crit
    if (hasEffect(s, 'antivirus', 'overdrive')) {
      t.extras.killStreak = (t.extras.killStreak ?? 0);
    }
  }

  // Quantum: 35% chance to fire twice (quantum_sight: always double if target is marked)
  if (t.def === 'quantum') {
    const shouldDouble = hasEffect(s, 'quantum', 'double') && Math.random() < 0.35;
    const quantumSightActive = hasEffect(s, 'quantum', 'quantum_sight') && (target.marked ?? 0) > 0;
    if (shouldDouble || quantumSightActive) {
      const extraIsCrit = (hasEffect(s, 'quantum', 'resonance') && isCrit) ? true : isCrit;
      s.projectiles.push({ ...proj, id: nextId(), pos: { x: t.grid.x, y: t.grid.y }, isCrit: extraIsCrit, trail: [] });
    }
  }

  // Firewall burst: every 4th shot fires triple spread
  if (t.def === 'firewall' && hasEffect(s, 'firewall', 'burst')) {
    t.extras.shotCount = (t.extras.shotCount ?? 0) + 1;
    // Point guard: if target is already marked, immediately trigger burst
    const pointGuardTrigger = hasEffect(s, 'firewall', 'point_guard') && (target.marked ?? 0) > 0;
    if (t.extras.shotCount >= 4 || pointGuardTrigger) {
      if (t.extras.shotCount >= 4) t.extras.shotCount = 0;
      for (let i = -1; i <= 1; i += 2) {
        const angle = t.angle + i * 0.28;
        const spread = { x: t.grid.x + Math.cos(angle) * 3, y: t.grid.y + Math.sin(angle) * 3 };
        const burstProj = {
          ...proj,
          id: nextId(),
          pos: { x: t.grid.x, y: t.grid.y },
          target: -1 as number,
          targetPos: spread,
          damage: dmg * 0.6,
          trail: [] as typeof proj.trail,
        };
        // Fragmentation: burst shots explode on impact
        if (hasEffect(s, 'firewall', 'fragmentation')) {
          (burstProj as Projectile).aoe = 0.5;
        }
        s.projectiles.push(burstProj);
      }
    }
  }

  audio.play('fire_' + t.def);
}

function updateProjectile(s: RunState, p: Projectile, dt: number): void {
  let tx: number;
  let ty: number;
  const target = s.enemies.find((e) => e.id === p.target && e.alive);
  if (target) {
    tx = target.pos.x;
    ty = target.pos.y;
    p.targetPos.x = tx;
    p.targetPos.y = ty;
  } else {
    tx = p.targetPos.x;
    ty = p.targetPos.y;
  }
  const dx = tx - p.pos.x;
  const dy = ty - p.pos.y;
  const dist = Math.hypot(dx, dy);
  const step = p.speed * dt;
  p.trail.push({ x: p.pos.x, y: p.pos.y });
  if (p.trail.length > 6) p.trail.shift();
  if (dist <= step || dist < 0.15) {
    if (target) {
      hitEnemy(s, p, target);
      // Real pierce: find next enemy in travel direction and continue
      if (p.pierce) {
        const pierceAngle = p.fromTower === 'railgun' && hasEffect(s, 'railgun', 'penetrator') ? 0.35 : 0.55;
        const next = findPierceTarget(s, p, target, pierceAngle);
        if (next) {
          p.target = next.id;
          p.targetPos = { x: next.pos.x, y: next.pos.y };
          return;
        }
      }
    } else if (p.aoe) {
      spawnExplosion(s, { x: tx, y: ty }, p.color, p.aoe);
      for (const e of s.enemies) {
        if (!e.alive) continue;
        if (Math.hypot(e.pos.x - tx, e.pos.y - ty) <= p.aoe) {
          damageEnemy(s, e, p.damage, p.isCrit ?? false, p.damageType, false, p.fromTower);
        }
      }
    }
    p.target = -2;
    return;
  }
  p.pos.x += (dx / dist) * step;
  p.pos.y += (dy / dist) * step;
}

function hitEnemy(s: RunState, p: Projectile, target: EnemyInstance): void {
  // Hunter instinct: tracer marks grant +45% (was +30%)
  const markedPct = (hasEffect(s, 'firewall', 'hunter_instinct') && p.fromTower === 'firewall') ? 0.45 : 0.3;
  const markedBonus = (target.marked ?? 0) > 0 ? 1 + markedPct : 1.0;

  // Quantum phase shift: treat armor as 0
  const phaseShift = p.fromTower === 'quantum' && (hasEffect(s, 'quantum', 'phase') ||
    (hasEffect(s, 'quantum', 'decoherence') && target.armor < (ENEMIES[target.def].armor ?? 0)));
  if (phaseShift) {
    const saved = target.armor;
    target.armor = 0;
    damageEnemy(s, target, p.damage * markedBonus, p.isCrit ?? false, p.damageType, false, p.fromTower);
    if (target.alive) target.armor = saved;
  } else {
    damageEnemy(s, target, p.damage * markedBonus, p.isCrit ?? false, p.damageType, false, p.fromTower);
  }

  if (p.slow && !ENEMIES[target.def].slowImmune) {
    target.speedMult = Math.min(target.speedMult, 1 - p.slow.pct);
    target.slowTimer = Math.max(target.slowTimer, p.slow.duration);
  }

  // Scrambler: reduce armor
  if (p.fromTower === 'scrambler') {
    let stripAmount = hasEffect(s, 'scrambler', 'deep_scan') ? 6 : 3;
    if (hasEffect(s, 'scrambler', 'deep_hack')) stripAmount += 2;
    target.armor = Math.max(0, target.armor - stripAmount);
    // Cripple: also slow
    if (hasEffect(s, 'scrambler', 'cripple') && !ENEMIES[target.def].slowImmune) {
      target.speedMult = Math.min(target.speedMult, 0.7);
      target.slowTimer = Math.max(target.slowTimer, 3);
    }
    // Signal break: slow armor-stripped enemies
    if (hasEffect(s, 'scrambler', 'signal_break') && target.armor < (ENEMIES[target.def].armor ?? 0) && !ENEMIES[target.def].slowImmune) {
      target.speedMult = Math.min(target.speedMult, 0.8);
      target.slowTimer = Math.max(target.slowTimer, 1.5);
    }
    // Exploit chain: consecutive hits on same target stack damage
    const sc = s.towers.find((tw) => tw.def === 'scrambler');
    if (sc && hasEffect(s, 'scrambler', 'exploit_chain')) {
      if (sc.targetId === target.id) {
        sc.extras.exploitStacks = Math.min(5, (sc.extras.exploitStacks ?? 0) + 1);
      } else {
        sc.extras.exploitStacks = 1;
      }
      const exploitBonus = (sc.extras.exploitStacks ?? 0) * 0.08;
      if (exploitBonus > 0 && target.alive) {
        damageEnemy(s, target, p.damage * exploitBonus, false, p.damageType, true);
      }
    }
    // Overwrite: 20% chance to zero armor
    if (hasEffect(s, 'scrambler', 'overwrite') && Math.random() < 0.20) {
      target.armor = 0;
      s.floaters.push({ pos: { x: target.pos.x, y: target.pos.y - 0.4 }, text: 'OVERWRITE!', vy: -22, life: 1.0, maxLife: 1.0, color: '#ff2d95', size: 14 });
      // System crash: mark enemy at 0 armor
      if (hasEffect(s, 'scrambler', 'system_crash')) {
        target.marked = Math.max(target.marked ?? 0, 3);
      }
    }
    // Broadcast: apply to all enemies in range
    if (hasEffect(s, 'scrambler', 'broadcast')) {
      const scramblerTower = s.towers.find((tw) => tw.def === 'scrambler');
      if (scramblerTower) {
        const range = effectiveRange(s, scramblerTower);
        for (const e of s.enemies) {
          if (!e.alive || e.id === target.id) continue;
          if (Math.hypot(e.pos.x - scramblerTower.grid.x, e.pos.y - scramblerTower.grid.y) <= range) {
            e.armor = Math.max(0, e.armor - stripAmount);
            // Null field synergy: broadcast also slows
            if (hasEffect(s, 'scrambler', 'null_field') && !ENEMIES[e.def].slowImmune) {
              e.speedMult = Math.min(e.speedMult, 0.8);
              e.slowTimer = Math.max(e.slowTimer, 1.5);
            }
          }
        }
      }
    }
  }

  // Antivirus quarantine: apply slow on hit
  if (p.fromTower === 'antivirus' && hasEffect(s, 'antivirus', 'quarantine') && !ENEMIES[target.def].slowImmune) {
    target.speedMult = Math.min(target.speedMult, 0.7);
    target.slowTimer = Math.max(target.slowTimer, 1.2);
  }

  // Antivirus lockdown: mark target
  if (p.fromTower === 'antivirus' && hasEffect(s, 'antivirus', 'lockdown')) {
    const dur = hasEffect(s, 'antivirus', 'surgical') ? 4 : 2;
    target.marked = Math.max(target.marked ?? 0, dur);
  }

  // Antivirus focus fire: consecutive hits on same target add +10% damage (max +30%)
  if (p.fromTower === 'antivirus' && hasEffect(s, 'antivirus', 'focus_fire')) {
    const av = s.towers.find((tw) => tw.def === 'antivirus');
    if (av) {
      if (av.targetId === target.id) {
        av.extras.focusStacks = Math.min(3, (av.extras.focusStacks ?? 0) + 1);
      } else {
        av.extras.focusStacks = 1;
      }
      const focusBonus = (av.extras.focusStacks ?? 0) * 0.10;
      if (focusBonus > 0 && target.alive) {
        damageEnemy(s, target, p.damage * focusBonus, p.isCrit ?? false, p.damageType, true);
      }
    }
  }

  // Antivirus adaptive: +15% damage to armor-stripped enemies
  if (p.fromTower === 'antivirus' && hasEffect(s, 'antivirus', 'adaptive') &&
      target.armor < (ENEMIES[target.def].armor ?? 0) && target.alive) {
    damageEnemy(s, target, p.damage * 0.15, p.isCrit ?? false, p.damageType, true);
  }

  // Precision matrix synergy: ANTIVIRUS marks cause QUANTUM guaranteed crit (flag only — checked in fire())
  // Viral mark: when marked enemy dies, spread mark to 2 nearby (handled in killEnemy)

  // Firewall tracer: mark target
  if (p.fromTower === 'firewall' && hasEffect(s, 'firewall', 'tracer')) {
    const tracerDur = hasEffect(s, 'firewall', 'hunter_instinct') ? 4 : 2;
    target.marked = Math.max(target.marked ?? 0, tracerDur);
  }

  // Firewall suppressor: slow on hit
  if (p.fromTower === 'firewall' && hasEffect(s, 'firewall', 'suppressor') && !ENEMIES[target.def].slowImmune) {
    target.speedMult = Math.min(target.speedMult, 0.85);
    target.slowTimer = Math.max(target.slowTimer, 1.2);
  }

  // Firewall hollow point: armor bypass handled in applyResistanceAndArmor via savedArmor trick
  if (p.fromTower === 'firewall' && hasEffect(s, 'firewall', 'hollow_point') && target.alive) {
    // Apply extra damage equivalent to 5 armor reduction (already hit, compensate)
    const armorMitigation = Math.min(5, target.armor + (ENEMIES[target.def].armor ?? 0));
    if (armorMitigation > 0) damageEnemy(s, target, armorMitigation, false, p.damageType, true);
  }

  // Firewall bastion protocol: +60% damage in sentinel field
  // (already applied in markedBonus section — check sentinel presence here)
  if (p.fromTower === 'firewall' && hasEffect(s, 'firewall', 'bastion_protocol')) {
    const inField = s.towers.some((tw) => tw.def === 'sentinel' &&
      Math.hypot(target.pos.x - tw.grid.x, target.pos.y - tw.grid.y) <= (effectiveRange(s, tw) + 0.8 + 0.5));
    if (inField) damageEnemy(s, target, p.damage * 0.6, p.isCrit ?? false, p.damageType, true);
  }

  // Firewall ricochet: fire at 2nd nearby enemy (one bounce only — ricochetDone prevents infinite chain)
  if (p.fromTower === 'firewall' && hasEffect(s, 'firewall', 'ricochet') && !p.ricochetDone && s.projectiles.length < 300) {
    const next = findChainTarget(s, target, new Set([target.id]), 2.5);
    if (next) {
      s.projectiles.push({
        id: nextId(),
        pos: { x: target.pos.x, y: target.pos.y },
        target: next.id,
        targetPos: { x: next.pos.x, y: next.pos.y },
        damage: p.damage * 0.55,
        speed: p.speed,
        color: p.color,
        trailColor: p.trailColor,
        fromTower: 'firewall',
        damageType: p.damageType,
        trail: [],
        ricochetDone: true,
      });
    }
  }

  // Firewall overdrive: kills reduce cooldown
  if (p.fromTower === 'firewall' && hasEffect(s, 'firewall', 'overdrive') && !target.alive) {
    const fw = s.towers.find((tw) => tw.def === 'firewall');
    if (fw) fw.cooldown = Math.max(0, fw.cooldown - (p.isCrit ? 0.8 : 0.4));
  }

  // Sniper callout: mark target
  if (p.fromTower === 'sniper' && hasEffect(s, 'sniper', 'callout')) {
    const dur = hasEffect(s, 'sniper', 'surgical') ? 6 : 3;
    target.marked = Math.max(target.marked ?? 0, dur);
  }

  // Sniper overwatch_pen: +100% to marked
  if (p.fromTower === 'sniper' && hasEffect(s, 'sniper', 'overwatch_pen') && (target.marked ?? 0) > 0) {
    damageEnemy(s, target, p.damage, p.isCrit ?? false, p.damageType, false, 'sniper'); // deal extra 100%
  }

  // Sniper execute: triple damage below 25% HP (deadeye raises to 35%)
  if (p.fromTower === 'sniper' && hasEffect(s, 'sniper', 'execute')) {
    const execThresh = hasEffect(s, 'sniper', 'deadeye') ? 0.35 : 0.25;
    if (target.hp / target.maxHp < execThresh) {
      damageEnemy(s, target, p.damage * 2, p.isCrit ?? false, p.damageType, false, 'sniper');
    }
  }

  // Sniper oneshot: instant kill non-boss below 40% if crit + marked (apex_predator raises to 50%)
  if (p.fromTower === 'sniper' && hasEffect(s, 'sniper', 'oneshot') && p.isCrit &&
      (target.marked ?? 0) > 0 && !target.isBoss) {
    const oneshotThresh = hasEffect(s, 'sniper', 'apex_predator') ? 0.50 : 0.40;
    if (target.hp / target.maxHp < oneshotThresh) {
      damageEnemy(s, target, target.hp * 10, true, p.damageType, false, 'sniper');
      s.floaters.push({ pos: { x: target.pos.x, y: target.pos.y - 0.4 }, text: 'ONE SHOT', vy: -30, life: 1.2, maxLife: 1.2, color: '#00ff88', size: 20 });
    }
  }

  // Sniper ghost_round: ignore 5 armor (compensate after-hit)
  if (p.fromTower === 'sniper' && hasEffect(s, 'sniper', 'ghost_round') && target.alive) {
    const armorMitigation = Math.min(5, ENEMIES[target.def].armor ?? 0);
    if (armorMitigation > 0) damageEnemy(s, target, armorMitigation, false, p.damageType, true);
  }

  // Sniper incendiary_round: burn marked targets
  if (p.fromTower === 'sniper' && hasEffect(s, 'sniper', 'incendiary_round') && (target.marked ?? 0) > 0) {
    s.puddles.push({ pos: { x: target.pos.x, y: target.pos.y }, radius: 0.5, timeLeft: 2.0, maxTime: 2.0, slowPct: 0, slowDuration: 0, damagePerSec: 12, color: '#ff6b00', fromTower: 'sniper' });
  }

  // Sniper feedback (rapidfire): kills reduce cooldown
  if (p.fromTower === 'sniper' && hasEffect(s, 'sniper', 'rapidfire') && !target.alive) {
    const sn = s.towers.find((tw) => tw.def === 'sniper');
    if (sn) sn.cooldown = Math.max(0, sn.cooldown - 0.8);
  }

  // Quantum collapse: reduce armor on hit, restore via engine timer (no setTimeout)
  if (p.fromTower === 'quantum' && hasEffect(s, 'quantum', 'collapse')) {
    target.armor = Math.max(0, target.armor * 0.5);
    target.collapseTimer = 1.5;
  }

  // Railgun feedback (kills): reduce cooldown
  if (p.fromTower === 'railgun' && hasEffect(s, 'railgun', 'feedback') && !target.alive) {
    const rl = s.towers.find((tw) => tw.def === 'railgun');
    if (rl) rl.cooldown = Math.max(0, rl.cooldown - 0.6);
  }

  // Railgun kill_chain: additional cooldown reduction on kill
  if (p.fromTower === 'railgun' && hasEffect(s, 'railgun', 'kill_chain') && !target.alive) {
    const rl = s.towers.find((tw) => tw.def === 'railgun');
    if (rl) rl.cooldown = Math.max(0, rl.cooldown - 0.3);
  }

  // Barrage strike synergy: RAILGUN kills trigger an ARTILLERY shell at the death point
  if (p.fromTower === 'railgun' && !target.alive && hasEffect(s, 'railgun', 'barrage_strike')) {
    const art = s.towers.find((tw) => tw.def === 'mine');
    if (art) {
      const aDef = TOWERS.mine;
      const aDmg = effectiveDamage(s, art);
      const aRad = (aDef.aoe?.radius ?? 1.5) * (hasEffect(s, 'mine', 'wide') ? 2 : 1);
      spawnExplosion(s, { x: target.pos.x, y: target.pos.y }, aDef.projectileColor, aRad);
      for (const e of s.enemies) {
        if (!e.alive) continue;
        if (Math.hypot(e.pos.x - target.pos.x, e.pos.y - target.pos.y) <= aRad) {
          damageEnemy(s, e, aDmg * 0.75, false, 'aoe', false, 'mine');
        }
      }
    }
  }

  // Railgun armor pierce: extra damage vs armor (compensate for ignored armor)
  if (p.fromTower === 'railgun' && hasEffect(s, 'railgun', 'armor_pierce') && target.alive) {
    const armorMitigation = Math.min(6, ENEMIES[target.def].armor ?? 0);
    if (armorMitigation > 0) damageEnemy(s, target, armorMitigation, false, p.damageType, true);
  }

  // Railgun splinter: sabot explosions deal +50%
  // (handled in sabot section below via multiplier flag)

  // Railgun charged_mega: capacitor mega shot stuns
  if (p.fromTower === 'railgun' && hasEffect(s, 'railgun', 'charged_mega') && p.isCrit && !ENEMIES[target.def].slowImmune) {
    target.speedMult = 0;
    target.slowTimer = Math.max(target.slowTimer, 1.0);
  }

  // Railgun overwatch_pen: +100% to marked
  if (p.fromTower === 'railgun' && hasEffect(s, 'railgun', 'overwatch_pen') && (target.marked ?? 0) > 0) {
    damageEnemy(s, target, p.damage, p.isCrit ?? false, p.damageType, false, 'railgun');
  }

  // Honeypot: drop a persistent slow puddle at impact point
  if (p.fromTower === 'honeypot') {
    const persistent = hasEffect(s, 'honeypot', 'persistent');
    const overflow = hasEffect(s, 'honeypot', 'overflow');
    const acid = hasEffect(s, 'honeypot', 'acid');
    const napalm = hasEffect(s, 'honeypot', 'napalm');
    const linger = hasEffect(s, 'honeypot', 'linger');
    let dur = persistent ? 6.4 : 3.2;
    if (linger) dur *= 1.5;
    const rad = overflow ? 2.2 : 1.1;
    const slowPct = hasEffect(s, 'honeypot', 'viscous') ? 0.55 : 0.4;
    // Napalm synergy: fire damage using firewall tower's damage
    let dps: number | undefined = acid ? 10 : undefined;
    let puddleColor: string | undefined;
    if (napalm) {
      const fw = s.towers.find((tw) => tw.def === 'firewall');
      dps = fw ? effectiveDamage(s, fw) * 0.4 : 15;
      puddleColor = '#ff6b00';
    }
    s.puddles.push({ pos: { x: p.pos.x, y: p.pos.y }, radius: rad, timeLeft: dur, maxTime: dur, slowPct, slowDuration: 0.6, damagePerSec: dps, color: puddleColor, fromTower: p.fromTower });
  }

  // Firewall incendiary: leave a small fire damage zone
  if (p.fromTower === 'firewall' && hasEffect(s, 'firewall', 'incendiary')) {
    s.puddles.push({ pos: { x: p.pos.x, y: p.pos.y }, radius: 0.6, timeLeft: 1.5, maxTime: 1.5, slowPct: 0, slowDuration: 0, damagePerSec: 18, color: '#ff6b00', fromTower: 'firewall' });
  }

  // Ice effects
  if (p.fromTower === 'ice') {
    if (hasEffect(s, 'ice', 'freeze') && !ENEMIES[target.def].slowImmune) {
      const freezeDur = hasEffect(s, 'ice', 'absolute_zero_plus') ? 1.0 : 0.6;
      target.speedMult = 0;
      target.slowTimer = Math.max(target.slowTimer, freezeDur);
    }
    if (hasEffect(s, 'ice', 'shards') && p.aoe) {
      const shardDps = hasEffect(s, 'ice', 'cryo_nova') ? 8 : undefined;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        s.puddles.push({ pos: { x: p.pos.x + Math.cos(a) * p.aoe * 0.8, y: p.pos.y + Math.sin(a) * p.aoe * 0.8 }, radius: 0.4, timeLeft: 2.0, maxTime: 2.0, slowPct: 0.35, slowDuration: 0.5, color: '#88eeff', damagePerSec: shardDps, fromTower: 'ice' });
      }
    }
    // Glacial field: leave slow field in addition to other effects
    if (hasEffect(s, 'ice', 'glacial')) {
      s.puddles.push({ pos: { x: p.pos.x, y: p.pos.y }, radius: p.aoe ?? 1.0, timeLeft: 3.0, maxTime: 3.0, slowPct: 0.25, slowDuration: 0.5, color: '#aaddff', fromTower: 'ice' });
    }
    if (hasEffect(s, 'ice', 'permafrost')) {
      s.puddles.push({ pos: { x: p.pos.x, y: p.pos.y }, radius: 0.8, timeLeft: 3.0, maxTime: 3.0, slowPct: 0.20, slowDuration: 0.4, color: '#aaddff', fromTower: 'ice' });
    }
    // Avalanche: if target was fully stopped, bigger explosion
    if (hasEffect(s, 'ice', 'avalanche') && target.speedMult === 0 && p.aoe) {
      const bigAoe = p.aoe * 1.4;
      spawnExplosion(s, { x: p.pos.x, y: p.pos.y }, '#00aaff', bigAoe);
      for (const e of s.enemies) {
        if (!e.alive || e.id === target.id) continue;
        if (Math.hypot(e.pos.x - p.pos.x, e.pos.y - p.pos.y) <= bigAoe) {
          damageEnemy(s, e, p.damage * 2, p.isCrit ?? false, p.damageType, false, 'ice');
        }
      }
      s.floaters.push({ pos: { x: p.pos.x, y: p.pos.y - 0.4 }, text: 'AVALANCHE!', vy: -28, life: 1.0, maxLife: 1.0, color: '#00aaff', size: 16 });
    }
    // Cryo break synergy: 2x damage to armor-stripped enemies
    if (hasEffect(s, 'ice', 'cryo_break') && target.armor < (ENEMIES[target.def].armor ?? 0)) {
      damageEnemy(s, target, p.damage, p.isCrit ?? false, p.damageType, false, 'ice'); // extra 100%
    }
    // Flash freeze synergy: freeze enemies inside honeypot puddles
    if (hasEffect(s, 'ice', 'flash_freeze') && !ENEMIES[target.def].slowImmune) {
      const inPuddle = s.puddles.some((pu) => pu.fromTower === 'honeypot' &&
        Math.hypot(target.pos.x - pu.pos.x, target.pos.y - pu.pos.y) <= pu.radius);
      if (inPuddle) {
        target.speedMult = 0;
        target.slowTimer = Math.max(target.slowTimer, 0.8);
      }
      // Also apply to AoE targets
      if (p.aoe) {
        for (const e of s.enemies) {
          if (!e.alive || e.id === target.id || ENEMIES[e.def].slowImmune) continue;
          if (Math.hypot(e.pos.x - p.pos.x, e.pos.y - p.pos.y) <= p.aoe) {
            const eInPuddle = s.puddles.some((pu) => pu.fromTower === 'honeypot' &&
              Math.hypot(e.pos.x - pu.pos.x, e.pos.y - pu.pos.y) <= pu.radius);
            if (eInPuddle) {
              e.speedMult = 0;
              e.slowTimer = Math.max(e.slowTimer, 0.8);
            }
          }
        }
      }
    }
  }

  // Railgun sabot: small explosion at each pierce
  if (p.fromTower === 'railgun' && hasEffect(s, 'railgun', 'sabot')) {
    const sabotMult = hasEffect(s, 'railgun', 'splinter') ? 0.6 : 0.4; // splinter: +50%
    spawnExplosion(s, { x: p.pos.x, y: p.pos.y }, '#e0f0ff', 0.7);
    for (const e of s.enemies) {
      if (!e.alive || e.id === target.id) continue;
      if (Math.hypot(e.pos.x - p.pos.x, e.pos.y - p.pos.y) <= 0.7) {
        damageEnemy(s, e, p.damage * sabotMult, false, p.damageType, false, 'railgun');
      }
    }
  }

  // Railgun shockwave
  if (p.fromTower === 'railgun' && hasEffect(s, 'railgun', 'shockwave') && !ENEMIES[target.def].slowImmune) {
    target.speedMult = Math.min(target.speedMult, 0.3);
    target.slowTimer = Math.max(target.slowTimer, 1.5);
  }

  // Quantum supercharge: set next shot guaranteed crit
  if (p.fromTower === 'quantum' && p.isCrit && hasEffect(s, 'quantum', 'supercharge')) {
    const qmTower = s.towers.find((tw) => tw.def === 'quantum');
    if (qmTower) qmTower.extras.superchargeReady = 1;
  }

  // Quantum antimatter: each crit permanently increases damage 2% (max +30%)
  if (p.fromTower === 'quantum' && p.isCrit && hasEffect(s, 'quantum', 'antimatter')) {
    const qmTower = s.towers.find((tw) => tw.def === 'quantum');
    if (qmTower) {
      const current = s.mods.towerDmg['quantum'] ?? 0;
      if (current < 0.30) {
        s.mods.towerDmg['quantum'] = Math.min(0.30, current + 0.02);
      }
    }
  }

  // Quantum entanglement: crits arc to nearest enemy
  if (p.fromTower === 'quantum' && p.isCrit && hasEffect(s, 'quantum', 'entangle')) {
    const chainRange = 3.0;
    const next = findChainTarget(s, target, new Set([target.id]), chainRange);
    if (next) {
      // Uncertainty principle: arc also reduces armor 25% for 2s
      if (hasEffect(s, 'quantum', 'uncertainty')) {
        next.armor = Math.max(0, next.armor * 0.75);
        next.collapseTimer = Math.max(next.collapseTimer ?? 0, 2.0);
      }
      s.projectiles.push({
        id: nextId(),
        pos: { x: target.pos.x, y: target.pos.y },
        target: next.id,
        targetPos: { x: next.pos.x, y: next.pos.y },
        damage: p.damage * 0.6,
        speed: 18,
        color: '#ff00ff',
        trailColor: '#cc00cc',
        fromTower: 'quantum',
        damageType: 'energy',
        isCrit: false,
        trail: [],
      });
    }
  }

  // Artillery (mine) — apply stun/armor_strip/volatile to primary target too
  if (p.fromTower === 'mine') {
    if (hasEffect(s, 'mine', 'stun') && !ENEMIES[target.def].slowImmune) {
      target.speedMult = 0;
      target.slowTimer = Math.max(target.slowTimer, 1.2);
    }
    if (hasEffect(s, 'mine', 'armor_strip')) {
      target.armor = Math.max(0, target.armor - 10);
    }
    if (hasEffect(s, 'mine', 'volatile_mixture') && target.alive) {
      const inPuddle = s.puddles.some((pu) => pu.fromTower === 'honeypot' &&
        Math.hypot(target.pos.x - pu.pos.x, target.pos.y - pu.pos.y) <= pu.radius);
      if (inPuddle) damageEnemy(s, target, p.damage * 0.75, false, p.damageType, true, 'mine');
    }
  }

  // Artillery (mine) effects on main impact
  if (p.fromTower === 'mine' && p.aoe) {
    const baseRad = p.aoe;
    const wideMult = (hasEffect(s, 'mine', 'wide') && hasEffect(s, 'mine', 'demolition')) ? 1.35 : 1.0;
    // Cluster: 2 additional shells land nearby
    if (hasEffect(s, 'mine', 'cluster') && s.projectiles.length < 300) {
      const clusterFull = hasEffect(s, 'mine', 'chain_reaction');
      for (let i = 0; i < 2; i++) {
        const ox = (Math.random() - 0.5) * 2;
        const oy = (Math.random() - 0.5) * 2;
        spawnExplosion(s, { x: p.pos.x + ox, y: p.pos.y + oy }, '#ffa000', baseRad * 0.7);
        for (const e of s.enemies) {
          if (!e.alive) continue;
          if (Math.hypot(e.pos.x - (p.pos.x + ox), e.pos.y - (p.pos.y + oy)) <= baseRad * 0.7) {
            damageEnemy(s, e, p.damage * (clusterFull ? 1.0 : 0.7) * wideMult, false, p.damageType, false, 'mine');
          }
        }
      }
    }
    // Frag kit: 3 mini-blasts in random directions
    if (hasEffect(s, 'mine', 'frag_kit')) {
      for (let f = 0; f < 3; f++) {
        const angle = Math.random() * Math.PI * 2;
        const fpos = { x: p.pos.x + Math.cos(angle) * baseRad, y: p.pos.y + Math.sin(angle) * baseRad };
        spawnExplosion(s, fpos, '#ffaa00', baseRad * 0.5);
        for (const e of s.enemies) {
          if (!e.alive) continue;
          if (Math.hypot(e.pos.x - fpos.x, e.pos.y - fpos.y) <= baseRad * 0.5) {
            damageEnemy(s, e, p.damage * 0.4, false, p.damageType, false, 'mine');
          }
        }
      }
    }
    // Nanobots: acid puddle on impact
    if (hasEffect(s, 'mine', 'nanobots') && Math.random() < 0.35 && s.puddles.length < 100) {
      s.puddles.push({ pos: { x: p.pos.x, y: p.pos.y }, radius: 1.0, timeLeft: 3, maxTime: 3, slowPct: 0, slowDuration: 0, damagePerSec: 12, color: '#88ff00', fromTower: 'mine' });
    }
    // Lightning rod synergy: chain arc from impact
    if (hasEffect(s, 'mine', 'lightning_rod') && s.projectiles.length < 300) {
      const firstTarget = findChainTarget(s, { pos: { x: p.pos.x, y: p.pos.y } } as EnemyInstance, new Set(), 3.0);
      if (firstTarget) {
        s.projectiles.push({
          id: nextId(), pos: { x: p.pos.x, y: p.pos.y },
          target: firstTarget.id, targetPos: { x: firstTarget.pos.x, y: firstTarget.pos.y },
          damage: 30, speed: 20, color: '#ffff00', trailColor: '#ffdd00',
          fromTower: 'chain', damageType: 'chain',
          chain: { jumps: 2, falloff: 1.0, hit: new Set([firstTarget.id]) },
          trail: [],
        });
      }
    }
  }

  if (p.aoe) {
    const aoeDmgMult = (p.fromTower === 'mine' && hasEffect(s, 'mine', 'wide') && hasEffect(s, 'mine', 'demolition')) ? 1.35 : 1.0;
    spawnExplosion(s, { x: p.pos.x, y: p.pos.y }, p.color, p.aoe);
    for (const e of s.enemies) {
      if (!e.alive || e.id === target.id) continue;
      if (Math.hypot(e.pos.x - p.pos.x, e.pos.y - p.pos.y) <= p.aoe) {
        damageEnemy(s, e, p.damage * 0.75 * aoeDmgMult, p.isCrit ?? false, p.damageType, false, p.fromTower);
        // Artillery (internally 'mine') — special effects in AoE
        if (p.fromTower === 'mine') {
          if (hasEffect(s, 'mine', 'stun') && !ENEMIES[e.def].slowImmune) {
            e.speedMult = 0;
            e.slowTimer = Math.max(e.slowTimer, 1.2);
          }
          if (hasEffect(s, 'mine', 'armor_strip')) {
            e.armor = Math.max(0, e.armor - 10);
          }
          // Volatile mixture synergy: 2x damage to enemies inside honeypot puddles
          if (hasEffect(s, 'mine', 'volatile_mixture')) {
            const inPuddle = s.puddles.some((pu) => pu.fromTower === 'honeypot' &&
              Math.hypot(e.pos.x - pu.pos.x, e.pos.y - pu.pos.y) <= pu.radius);
            if (inPuddle) damageEnemy(s, e, p.damage * 0.75, false, p.damageType, false, 'mine');
          }
        }
      }
    }
  }

  // Chain conductor: +35% damage to slowed enemies
  if (p.fromTower === 'chain' && hasEffect(s, 'chain', 'conductor') && target.speedMult < 1 && target.alive) {
    damageEnemy(s, target, p.damage * 0.35, p.isCrit ?? false, p.damageType, true);
  }

  // Chain persistence: electric burn puddle at hit point
  if (p.fromTower === 'chain' && hasEffect(s, 'chain', 'persistence') && s.puddles.length < 100) {
    s.puddles.push({ pos: { x: target.pos.x, y: target.pos.y }, radius: 0.35, timeLeft: 0.6, maxTime: 0.6, slowPct: 0, slowDuration: 0, damagePerSec: 10, color: '#ffff44', fromTower: 'chain' });
  }

  // Chain feedback_loop: ground-stunned enemies become marked
  if (p.fromTower === 'chain' && hasEffect(s, 'chain', 'feedback_loop') && target.speedMult === 0) {
    target.marked = Math.max(target.marked ?? 0, 1.0);
  }

  // Surge network synergy: spread sentinel slow to chain targets
  if (p.fromTower === 'chain' && hasEffect(s, 'chain', 'surge_network') && !ENEMIES[target.def].slowImmune) {
    const sentinelTower = s.towers.find((tw) => tw.def === 'sentinel');
    if (sentinelTower) {
      const sentDef = TOWERS[sentinelTower.def];
      const slowPct = hasEffect(s, 'sentinel', 'anchor') ? 0.45 : sentDef.slow!.pct;
      target.speedMult = Math.min(target.speedMult, 1 - slowPct);
      target.slowTimer = Math.max(target.slowTimer, 1.0);
    }
  }

  if (p.chain && p.chain.jumps > 0) {
    const chainRange = hasEffect(s, 'chain', 'nova') ? 4.4 : 2.2;
    const nextTarget = findChainTarget(s, target, p.chain.hit, chainRange);
    if (nextTarget) {
      p.chain.hit.add(nextTarget.id);
      // Chain ground: stun
      if (hasEffect(s, 'chain', 'ground') && !ENEMIES[nextTarget.def].slowImmune) {
        nextTarget.speedMult = 0;
        nextTarget.slowTimer = Math.max(nextTarget.slowTimer, 0.35);
      }
      // Overcharge: +20% damage per jump
      const jumpNum = (p.chain.hit.size); // approximate jump number
      const overchargeMult = hasEffect(s, 'chain', 'overcharge') ? (1 + 0.20 * jumpNum) : 1;
      // Tesla coil: leave electric puddle at each arc hit (megavolt only)
      if (hasEffect(s, 'chain', 'tesla_coil') && s.puddles.length < 100) {
        s.puddles.push({ pos: { x: target.pos.x, y: target.pos.y }, radius: 0.4, timeLeft: 0.6, maxTime: 0.6, slowPct: 0, slowDuration: 0, damagePerSec: 15, color: '#ffffff', fromTower: 'chain' });
      }
      s.projectiles.push({
        ...p,
        id: nextId(),
        pos: { x: target.pos.x, y: target.pos.y },
        target: nextTarget.id,
        targetPos: { x: nextTarget.pos.x, y: nextTarget.pos.y },
        damage: p.damage * p.chain.falloff * overchargeMult,
        chain: { jumps: p.chain.jumps - 1, falloff: p.chain.falloff, hit: new Set(p.chain.hit) },
        trail: [],
      });
    }
  }

  // Chain ground stun on primary target too
  if (p.fromTower === 'chain' && hasEffect(s, 'chain', 'ground') && !ENEMIES[target.def].slowImmune) {
    target.speedMult = 0;
    target.slowTimer = Math.max(target.slowTimer, 0.35);
  }
}

function findPierceTarget(s: RunState, p: Projectile, exclude: EnemyInstance, minDot = 0.55): EnemyInstance | null {
  let dx = 0, dy = 1;
  if (p.trail.length > 0) {
    const last = p.trail[p.trail.length - 1];
    const ldx = p.pos.x - last.x, ldy = p.pos.y - last.y;
    const len = Math.hypot(ldx, ldy);
    if (len > 0) { dx = ldx / len; dy = ldy / len; }
  }
  let best: EnemyInstance | null = null;
  let bestDist = Infinity;
  for (const e of s.enemies) {
    if (!e.alive || e.id === exclude.id) continue;
    const ex = e.pos.x - p.pos.x, ey = e.pos.y - p.pos.y;
    const d = Math.hypot(ex, ey);
    if (d < 0.01) continue;
    const dot = (ex / d) * dx + (ey / d) * dy;
    if (dot > minDot && d < bestDist) { best = e; bestDist = d; }
  }
  return best;
}

function findChainTarget(s: RunState, from: EnemyInstance, exclude: Set<number>, maxDist: number): EnemyInstance | null {
  let best: EnemyInstance | null = null;
  let bestD = Infinity;
  for (const e of s.enemies) {
    if (!e.alive || exclude.has(e.id)) continue;
    const d = Math.hypot(e.pos.x - from.pos.x, e.pos.y - from.pos.y);
    if (d <= maxDist && d < bestD) { best = e; bestD = d; }
  }
  return best;
}

function applyResistanceAndArmor(e: EnemyInstance, raw: number, type: DamageType, isCrit: boolean): number {
  const def = ENEMIES[e.def];
  const resist = def.resistances?.[type];
  let final = raw;
  if (resist != null && !(isCrit && def.critIgnoresResist)) {
    final *= resist;
  }
  final = Math.max(0, final - (e.armor || 0) * (type === 'pierce' ? 0.2 : 1));
  return final;
}

export function damageEnemy(s: RunState, e: EnemyInstance, dmg: number, isCrit: boolean, type: DamageType, silent = false, source?: TowerId): number {
  // Brittle coating: slowed/frozen enemies take +15% from all sources
  const brittleMult = (hasEffect(s, 'ice', 'brittle') && e.speedMult < 1) ? 1.15 : 1.0;
  const final = applyResistanceAndArmor(e, dmg * brittleMult, type, isCrit);
  if (final <= 0) {
    if (!silent) s.floaters.push({ pos: { x: e.pos.x, y: e.pos.y - 0.4 }, text: 'IMMUNE', vy: -18, life: 0.8, maxLife: 0.8, color: '#6b8090', size: 12 });
    e.hitFlash = 0.12;
    return 0;
  }
  e.hp -= final;
  e.hitFlash = isCrit ? 0.25 : 0.18;
  if (source) s.damageDealt[source] = (s.damageDealt[source] ?? 0) + final;
  if (e.hp <= 0) killEnemy(s, e);
  return final;
}

function killEnemy(s: RunState, e: EnemyInstance): void {
  e.alive = false;
  const def = ENEMIES[e.def];
  s.killsThisRun += 1;
  if (e.isBoss) s.bossKillsThisRun += 1;
  grantXp(s, def.xp);
  s.floaters.push({ pos: { x: e.pos.x, y: e.pos.y }, text: `+${def.xp} XP`, vy: -40, life: 0.9, maxLife: 0.9, color: '#00fff0', size: 14 });
  spawnDeathBurst(s, e.pos, def.color, def.accent, e.isBoss ? 30 : 14);
  audio.play(e.isBoss ? 'boss_die' : 'enemy_die');
  if (e.isBoss) {
    s.shakeTime = 0.5;
    s.shakeAmp = 16;
    s.protocolsEarned += 5;
    s.floaters.push({ pos: { x: e.pos.x, y: e.pos.y - 0.8 }, text: '+5 \u2b22 PROTOCOL', vy: -35, life: 1.8, maxLife: 1.8, color: '#ffd600', size: 20 });
  }

  // Glitch: splits into 2 worms on death
  if (e.def === 'glitch' && !(e.debuffTimer === -999)) {
    e.debuffTimer = -999; // prevent infinite loop
    for (let i = 0; i < 2; i++) {
      spawnWormAt(s, e.pos, e.pathIndex, e.progress);
    }
    s.floaters.push({ pos: { x: e.pos.x, y: e.pos.y - 0.4 }, text: 'SPLIT!', vy: -22, life: 0.8, maxLife: 0.8, color: '#00ffcc', size: 14 });
  }

  // Phantom death: EMP burst jams nearby towers for 3s
  if (e.def === 'phantom') {
    for (const t of s.towers) {
      if (Math.hypot(t.pos.x - e.pos.x, t.pos.y - e.pos.y) <= 3.5) {
        applyTowerDebuff(s, t, 'jammed', 3);
      }
    }
  }

  // Honeypot detonation: death inside puddle explodes
  if (hasEffect(s, 'honeypot', 'detonation')) {
    for (const pu of s.puddles) {
      if (Math.hypot(e.pos.x - pu.pos.x, e.pos.y - pu.pos.y) <= pu.radius) {
        spawnExplosion(s, e.pos, '#ffd600', pu.radius);
        for (const other of s.enemies) {
          if (!other.alive) continue;
          if (Math.hypot(other.pos.x - e.pos.x, other.pos.y - e.pos.y) <= pu.radius * 1.5) {
            damageEnemy(s, other, 80, false, 'aoe', false, 'honeypot');
          }
        }
        // Chain goo: leave a puddle at detonation point
        if (hasEffect(s, 'honeypot', 'chain_goo')) {
          s.puddles.push({ pos: { x: e.pos.x, y: e.pos.y }, radius: pu.radius, timeLeft: 1.5, maxTime: 1.5, slowPct: 0.4, slowDuration: 0.4, fromTower: 'honeypot' });
        }
        break;
      }
    }
  }

  // Toxic bloom: enemies killed by acid/honeypot puddle leave micro-puddles
  if (hasEffect(s, 'honeypot', 'toxic_bloom')) {
    const wasInAcidPuddle = s.puddles.some((pu) => pu.fromTower === 'honeypot' && pu.damagePerSec &&
      Math.hypot(e.pos.x - pu.pos.x, e.pos.y - pu.pos.y) <= pu.radius);
    if (wasInAcidPuddle) {
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        s.puddles.push({ pos: { x: e.pos.x + Math.cos(angle) * 0.3, y: e.pos.y + Math.sin(angle) * 0.3 }, radius: 0.5, timeLeft: 3.0, maxTime: 3.0, slowPct: 0, slowDuration: 0, damagePerSec: 8, color: '#88ff00', fromTower: 'honeypot' });
      }
    }
  }

  // Antivirus viral mark: marked enemy dies, spread mark to 2 nearby
  if (hasEffect(s, 'antivirus', 'viral_mark') && (e.marked ?? 0) > 0) {
    let spread = 0;
    for (const other of s.enemies) {
      if (!other.alive || other.id === e.id || spread >= 2) continue;
      if (Math.hypot(other.pos.x - e.pos.x, other.pos.y - e.pos.y) <= 3.0) {
        other.marked = Math.max(other.marked ?? 0, 2);
        spread++;
      }
    }
  }

  // Exotic kill feed: reduce all tower cooldowns on kill
  if (s.cardsPicked.includes('exotic_kill_feed')) {
    for (const t of s.towers) {
      t.cooldown = Math.max(0, t.cooldown - 0.08);
    }
  }

  // Firewall blazing: track kills within 5s for fire rate boost
  if (hasEffect(s, 'firewall', 'blazing')) {
    const fw = s.towers.find((tw) => tw.def === 'firewall');
    if (fw) {
      fw.extras.blazingKills = (fw.extras.blazingKills ?? 0) + 1;
      fw.extras.blazingTimer = 5.0; // reset 5s window
      if (fw.extras.blazingKills >= 3) {
        fw.extras.blazingKills = 0;
        fw.extras.blazingActive = 2.0; // 2s boost
      }
    }
  }

  // Antivirus overdrive: track kills, fire free crit
  if (hasEffect(s, 'antivirus', 'overdrive')) {
    const av = s.towers.find((t) => t.def === 'antivirus');
    if (av) {
      av.extras.killStreak = (av.extras.killStreak ?? 0) + 1;
      if (av.extras.killStreak >= 3) {
        av.extras.killStreak = 0;
        // Find nearest enemy via single-pass (avoid filter+sort allocation)
        let nearest: EnemyInstance | null = null;
        let nearestDistSq = Infinity;
        for (const e2 of s.enemies) {
          if (!e2.alive) continue;
          const dx = e2.pos.x - av.grid.x;
          const dy = e2.pos.y - av.grid.y;
          const dsq = dx * dx + dy * dy;
          if (dsq < nearestDistSq) { nearestDistSq = dsq; nearest = e2; }
        }
        if (nearest) {
          const def2 = TOWERS.antivirus;
          s.projectiles.push({
            id: nextId(),
            pos: { x: av.grid.x, y: av.grid.y },
            target: nearest.id,
            targetPos: { x: nearest.pos.x, y: nearest.pos.y },
            damage: effectiveDamage(s, av) * (def2.crit?.mult ?? 3),
            speed: def2.projectileSpeed,
            color: def2.projectileColor,
            trailColor: def2.trailColor,
            fromTower: 'antivirus',
            damageType: def2.damageType,
            isCrit: true,
            pierce: true,
            trail: [],
          });
          s.floaters.push({ pos: { x: av.grid.x, y: av.grid.y - 0.8 }, text: 'OVERDRIVE!', vy: -28, life: 1.0, maxLife: 1.0, color: '#ff2d95', size: 16 });
        }
      }
    }
  }
}

function spawnWormAt(s: RunState, pos: { x: number; y: number }, pathIndex: number, progress: number): void {
  const def = ENEMIES.worm;
  const hp = def.hp * hpScale(s.wave, s.difficulty) * 0.6;
  s.enemies.push({
    id: nextId(),
    def: 'worm',
    hp,
    maxHp: hp,
    pathIndex,
    progress: Math.max(0, progress - 0.2),
    pos: { x: pos.x + (Math.random() - 0.5) * 0.3, y: pos.y + (Math.random() - 0.5) * 0.3 },
    baseSpeed: def.speed * s.mods.enemySpeedMult,
    speedMult: 1,
    slowTimer: 0,
    armor: 0,
    alive: true,
    isBoss: false,
    size: def.size * 0.8,
    invisTimer: 0,
    hitFlash: 0,
    angle: 0,
    debuffTimer: -999, // mark as split-spawn so they don't chain-split
  });
}

const MAX_PARTICLES = 300;

function spawnExplosion(s: RunState, pos: Vec2, color: string, radius: number): void {
  if (s.particles.length >= MAX_PARTICLES) return;
  const count = Math.min(Math.round(14 * radius), MAX_PARTICLES - s.particles.length);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 2 + Math.random() * 4;
    s.particles.push({
      pos: { x: pos.x, y: pos.y },
      vel: { x: Math.cos(a) * spd, y: Math.sin(a) * spd },
      life: 0.4 + Math.random() * 0.4,
      maxLife: 0.8,
      size: 2 + Math.random() * 4,
      color,
    });
  }
  s.shakeTime = Math.max(s.shakeTime, 0.18);
  s.shakeAmp = Math.max(s.shakeAmp, 6);
  audio.play('explode');
}

// EMP-style expanding ring — no screen shake, no explode sound. Used by pulse tower.
function spawnPulseRing(s: RunState, pos: Vec2, color: string, radius: number): void {
  if (s.particles.length >= MAX_PARTICLES) return;
  const count = Math.min(24, MAX_PARTICLES - s.particles.length);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const spd = radius * 3; // expand outward to fill radius over ~0.5s
    s.particles.push({
      pos: { x: pos.x, y: pos.y },
      vel: { x: Math.cos(a) * spd, y: Math.sin(a) * spd },
      life: 0.45,
      maxLife: 0.45,
      size: 3,
      color,
    });
  }
}

function spawnDeathBurst(s: RunState, pos: Vec2, color: string, accent: string, count: number): void {
  if (s.particles.length >= MAX_PARTICLES) return;
  const capped = Math.min(count, MAX_PARTICLES - s.particles.length);
  for (let i = 0; i < capped; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 1.5 + Math.random() * 3.5;
    s.particles.push({
      pos: { x: pos.x, y: pos.y },
      vel: { x: Math.cos(a) * spd, y: Math.sin(a) * spd },
      life: 0.35 + Math.random() * 0.35,
      maxLife: 0.7,
      size: 1.5 + Math.random() * 3,
      color: Math.random() < 0.5 ? color : accent,
    });
  }
}

// ======================= Placement helpers =======================

function defaultTargetMode(defId: keyof typeof TOWERS): TowerInstance['targetMode'] {
  if (defId === 'antivirus' || defId === 'railgun' || defId === 'sniper') return 'strong';
  if (defId === 'mine') return 'close';
  return 'first';
}

export function placeTower(s: RunState, defId: keyof typeof TOWERS, grid: Vec2): TowerInstance | null {
  const tokens = s.deployTokens[defId] ?? 0;
  if (tokens <= 0) return null;
  // Singleton: only one of each tower type per run
  if (s.towers.some((t) => t.def === defId)) return null;
  s.deployTokens[defId] = tokens - 1;
  const t: TowerInstance = {
    id: nextId(),
    def: defId,
    grid: { x: grid.x, y: grid.y },
    pos: { x: grid.x, y: grid.y },
    level: 1,
    cooldown: 0,
    targetId: null,
    angle: 0,
    fireFlash: 0,
    targetMode: defaultTargetMode(defId),
    debuffs: [],
    extras: {},
  };
  s.towers.push(t);
  computeSubnets(s);
  audio.play('place');
  return t;
}

export function cycleTargetMode(t: TowerInstance): void {
  const modes: TowerInstance['targetMode'][] = ['first', 'strong', 'weak', 'close'];
  const idx = modes.indexOf(t.targetMode);
  t.targetMode = modes[(idx + 1) % modes.length];
  audio.play('ui_click');
}

export function removeTower(s: RunState, t: TowerInstance): void {
  s.towers = s.towers.filter((x) => x.id !== t.id);
  computeSubnets(s);
  s.selection = { kind: 'none' };
  audio.play('sell');
}
