import type { DamageType, EnemyInstance, Projectile, RunState, TowerId, TowerInstance, Vec2 } from '@/types';
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
}

export function endWave(s: RunState, events: EngineEvents): void {
  // Wave-clear XP bonus
  const bonus = 25 + s.wave * 8;
  grantXp(s, bonus);
  // Meta currency: 1 protocol per wave, +2 on boss waves
  const isBoss = bossForWave(getMap(s.mapId), s.difficulty, s.wave) != null;
  const proto = isBoss ? 3 : 1;
  s.protocolsEarned += proto;
  s.floaters.push({ pos: { x: 0, y: -0.5 }, text: `+${proto} \u2b22 PROTOCOL`, vy: -18, life: 2, maxLife: 2, color: '#ffd600', size: 16 });
  // Floating XP notice
  s.floaters.push({
    pos: { x: 0, y: 0 },
    text: `+${bonus} XP`,
    vy: -20,
    life: 2,
    maxLife: 2,
    color: '#00fff0',
    size: 28,
  });
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

function spawnEnemy(s: RunState, defId: keyof typeof ENEMIES, pathIndex: number, isBoss = false): void {
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
    armor: def.armor ?? 0,
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
        if (pu.slowPct > 0 && !ENEMIES[e.def].slowImmune) {
          e.speedMult = Math.min(e.speedMult, 1 - pu.slowPct);
          e.slowTimer = Math.max(e.slowTimer, pu.slowDuration);
        }
        if (pu.damagePerSec) {
          damageEnemy(s, e, pu.damagePerSec * dt, false, 'energy');
        }
      }
    }
  }
  s.puddles = s.puddles.filter((pu) => pu.timeLeft > 0);
}

// ======================= Update =======================

export function updateRun(s: RunState, dtSec: number, events: EngineEvents): void {
  if (s.phase === 'paused' || s.phase === 'draft' || s.phase === 'intel' || s.phase === 'gameover' || s.phase === 'victory') {
    tickFxOnly(s, dtSec);
    return;
  }

  s.elapsed += dtSec;

  if (s.shakeTime > 0) s.shakeTime = Math.max(0, s.shakeTime - dtSec);

  // Auto-start countdown (set after wave clears)
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
      spawnEnemy(s, first.def, first.pathIndex, first.boss);
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
    const speed = e.baseSpeed * e.speedMult;
    e.progress += speed * dtSec;
    const path = map.paths[e.pathIndex] ?? map.paths[0];
    const pos = posOnPath(path, e.progress);
    e.pos.x = pos.x;
    e.pos.y = pos.y;
    e.angle = pos.angle;
    // Rootkit: periodically infects nearby towers.
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
          s.floaters.push({
            pos: { x: 0, y: 0 },
            text: 'REVIVE',
            vy: -30,
            life: 2,
            maxLife: 2,
            color: '#ffae00',
            size: 36,
          });
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
    updateTower(s, t, dtSec);
    if (t.fireFlash > 0) t.fireFlash = Math.max(0, t.fireFlash - dtSec);
  }

  // Projectile updates
  for (const p of s.projectiles) updateProjectile(s, p, dtSec);

  // Remove dead
  s.enemies = s.enemies.filter((e) => e.alive);
  s.projectiles = s.projectiles.filter((p) => p.target !== -2);

  tickFxOnly(s, dtSec);

  // Level-up: fire whenever pending > 0. Callback is responsible for flipping phase to 'draft'
  // so subsequent frames early-return (see top of updateRun).
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
  s.particles = s.particles.filter((p) => p.life > 0);
  for (const f of s.floaters) {
    f.life -= dtSec;
    f.pos.y += f.vy * dtSec * 0.01;
  }
  s.floaters = s.floaters.filter((f) => f.life > 0);
}

// ======================= Tower targeting & firing =======================

function effectiveRange(s: RunState, t: TowerInstance): number {
  const def = TOWERS[t.def];
  const specificRange = s.mods.towerRange[t.def] ?? 0;
  return def.range * (1 + s.mods.globalRangePct + specificRange);
}

function effectiveDamage(s: RunState, t: TowerInstance): number {
  const def = TOWERS[t.def];
  const specific = s.mods.towerDmg[t.def] ?? 0;
  let dmg = def.damage * (1 + s.mods.globalDamagePct + specific);
  if (t.debuffs.some((d) => d.kind === 'infected')) dmg *= 0.55;
  return dmg;
}

function effectiveFireRate(s: RunState, t: TowerInstance): number {
  const def = TOWERS[t.def];
  const specificRate = s.mods.towerRate[t.def] ?? 0;
  let rate = def.fireRate * (1 + s.mods.globalRatePct + specificRate);
  if (t.debuffs.some((d) => d.kind === 'jammed')) rate *= 0.35;
  return rate;
}

function applyTowerDebuff(s: RunState, t: TowerInstance, kind: 'jammed' | 'infected', duration: number): void {
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
  t.debuffs = t.debuffs.filter((d) => d.timeLeft > 0);
  t.cooldown = Math.max(0, t.cooldown - dt);

  // Railgun capacitor: charge for 8s then auto-fire a 5× mega shot at best target.
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
    // Score by target mode — higher is better.
    let score = 0;
    switch (t.targetMode) {
      case 'first':  score = e.progress; break;
      case 'strong': score = e.hp; break;
      case 'weak':   score = -e.hp; break;
      case 'close':  score = -dist; break;
    }
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }
  if (best) {
    t.targetId = best.id;
    t.angle = Math.atan2(best.pos.y - t.grid.y, best.pos.x - t.grid.x);
    if (t.cooldown <= 0) {
      fire(s, t, best);
      const rate = effectiveFireRate(s, t);
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
  const critChance = (def.crit?.chance ?? 0) + s.mods.globalCritChance + specificCrit;
  if (critChance > 0 && Math.random() < critChance) isCrit = true;
  const critMult = def.crit?.mult ?? 3;
  const dmg = isCrit ? baseDmg * critMult : baseDmg;

  if (t.def === 'mine') {
    let aoeRadius = 1.5;
    if (hasEffect(s, 'mine', 'wide')) aoeRadius *= 2;
    damageEnemy(s, target, dmg * 2.5, false, def.damageType);
    for (const e of s.enemies) {
      if (!e.alive || e.id === target.id) continue;
      if (Math.hypot(e.pos.x - t.grid.x, e.pos.y - t.grid.y) <= aoeRadius) {
        damageEnemy(s, e, dmg * 1.5, false, def.damageType);
      }
    }
    spawnExplosion(s, t.grid, '#ffd600', aoeRadius);
    if (hasEffect(s, 'mine', 'cluster')) {
      for (let i = 0; i < 2; i++) {
        const offset = { x: t.grid.x + (Math.random() - 0.5) * 2, y: t.grid.y + (Math.random() - 0.5) * 2 };
        spawnExplosion(s, offset, '#ffa000', aoeRadius * 0.6);
        for (const e of s.enemies) {
          if (!e.alive) continue;
          if (Math.hypot(e.pos.x - offset.x, e.pos.y - offset.y) <= aoeRadius * 0.6) {
            damageEnemy(s, e, dmg * 0.8, false, def.damageType);
          }
        }
      }
    }
    const respawn = hasEffect(s, 'mine', 'resupply') && Math.random() < 0.6;
    if (!respawn) s.towers = s.towers.filter((x) => x.id !== t.id);
    else { t.cooldown = 8; t.fireFlash = 0.15; }
    audio.play('mine');
    return;
  }

  let aoe = def.aoe?.radius;
  if (t.def === 'ice' && aoe && hasEffect(s, 'ice', 'wide')) aoe *= 1.7;

  let chainJumps = def.chain?.jumps ?? 0;
  let chainFalloff = def.chain?.falloff ?? 0.8;
  if (t.def === 'chain') {
    if (hasEffect(s, 'chain', 'storm')) chainJumps += 2;
    if (hasEffect(s, 'chain', 'discharge')) chainFalloff = 1.0;
  }

  const proj: Projectile = {
    id: nextId(),
    pos: { x: t.grid.x, y: t.grid.y },
    target: target.id,
    targetPos: { x: target.pos.x, y: target.pos.y },
    damage: dmg,
    speed: def.projectileSpeed,
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

  // Antivirus: fire 2 (or 3 with triple) projectiles at nearest enemies.
  if (t.def === 'antivirus') {
    const range = effectiveRange(s, t);
    const triple = hasEffect(s, 'antivirus', 'triple');
    const precision = hasEffect(s, 'antivirus', 'precision');
    const extras: EnemyInstance[] = [];
    for (const e of s.enemies) {
      if (!e.alive || e.id === target.id) continue;
      if (Math.hypot(e.pos.x - t.grid.x, e.pos.y - t.grid.y) <= range) extras.push(e);
      if (extras.length >= (triple ? 2 : 1)) break;
    }
    const shotCount = triple ? 2 : 1;
    for (let i = 0; i < shotCount; i++) {
      const tgt = extras[i] ?? target;
      s.projectiles.push({
        ...proj,
        id: nextId(),
        pos: { x: t.grid.x + (i + 1) * 0.12, y: t.grid.y - (i + 1) * 0.12 },
        target: tgt.id,
        targetPos: { x: tgt.pos.x, y: tgt.pos.y },
        damage: dmg * (i === 0 ? 0.7 : 0.55),
        isCrit: precision ? true : isCrit,
        trail: [],
      });
    }
  }

  // Quantum: 35% chance to fire twice with superposition.
  if (t.def === 'quantum' && hasEffect(s, 'quantum', 'double') && Math.random() < 0.35) {
    s.projectiles.push({ ...proj, id: nextId(), pos: { x: t.grid.x, y: t.grid.y }, trail: [] });
  }

  // Firewall burst: every 4th shot fires triple spread.
  if (t.def === 'firewall' && hasEffect(s, 'firewall', 'burst')) {
    t.extras.shotCount = (t.extras.shotCount ?? 0) + 1;
    if (t.extras.shotCount >= 4) {
      t.extras.shotCount = 0;
      for (let i = -1; i <= 1; i += 2) {
        const angle = t.angle + i * 0.28;
        const spread = { x: t.grid.x + Math.cos(angle) * 3, y: t.grid.y + Math.sin(angle) * 3 };
        s.projectiles.push({
          ...proj,
          id: nextId(),
          pos: { x: t.grid.x, y: t.grid.y },
          target: -1,
          targetPos: spread,
          damage: dmg * 0.6,
          trail: [],
        });
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
        const next = findPierceTarget(s, p, target);
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
          damageEnemy(s, e, p.damage, p.isCrit ?? false, p.damageType);
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
  // Quantum phase shift: treat armor as 0
  const phaseShift = p.fromTower === 'quantum' && hasEffect(s, 'quantum', 'phase');
  if (phaseShift) {
    const saved = target.armor;
    target.armor = 0;
    damageEnemy(s, target, p.damage, p.isCrit ?? false, p.damageType);
    if (target.alive) target.armor = saved;
  } else {
    damageEnemy(s, target, p.damage, p.isCrit ?? false, p.damageType);
  }

  if (p.slow && !ENEMIES[target.def].slowImmune) {
    target.speedMult = Math.min(target.speedMult, 1 - p.slow.pct);
    target.slowTimer = Math.max(target.slowTimer, p.slow.duration);
  }

  // Antivirus quarantine: apply slow on hit
  if (p.fromTower === 'antivirus' && hasEffect(s, 'antivirus', 'quarantine') && !ENEMIES[target.def].slowImmune) {
    target.speedMult = Math.min(target.speedMult, 0.7);
    target.slowTimer = Math.max(target.slowTimer, 1.2);
  }

  // Honeypot: drop a persistent slow puddle at impact point.
  if (p.fromTower === 'honeypot') {
    const persistent = hasEffect(s, 'honeypot', 'persistent');
    const overflow = hasEffect(s, 'honeypot', 'overflow');
    const acid = hasEffect(s, 'honeypot', 'acid');
    const dur = persistent ? 6.4 : 3.2;
    const rad = overflow ? 2.2 : 1.1;
    s.puddles.push({ pos: { x: p.pos.x, y: p.pos.y }, radius: rad, timeLeft: dur, maxTime: dur, slowPct: 0.4, slowDuration: 0.6, damagePerSec: acid ? 10 : undefined });
  }

  // Firewall incendiary: leave a small fire damage zone
  if (p.fromTower === 'firewall' && hasEffect(s, 'firewall', 'incendiary')) {
    s.puddles.push({ pos: { x: p.pos.x, y: p.pos.y }, radius: 0.6, timeLeft: 1.5, maxTime: 1.5, slowPct: 0, slowDuration: 0, damagePerSec: 18, color: '#ff6b00' });
  }

  // Ice: absolute zero (stop enemies) or shard storm
  if (p.fromTower === 'ice') {
    if (hasEffect(s, 'ice', 'freeze') && !ENEMIES[target.def].slowImmune) {
      target.speedMult = 0;
      target.slowTimer = Math.max(target.slowTimer, 0.6);
    }
    if (hasEffect(s, 'ice', 'shards') && p.aoe) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        s.puddles.push({ pos: { x: p.pos.x + Math.cos(a) * p.aoe * 0.8, y: p.pos.y + Math.sin(a) * p.aoe * 0.8 }, radius: 0.4, timeLeft: 2.0, maxTime: 2.0, slowPct: 0.35, slowDuration: 0.5, color: '#88eeff' });
      }
    }
  }

  // Railgun sabot: small explosion at each pierce
  if (p.fromTower === 'railgun' && hasEffect(s, 'railgun', 'sabot')) {
    spawnExplosion(s, { x: p.pos.x, y: p.pos.y }, '#e0f0ff', 0.7);
    for (const e of s.enemies) {
      if (!e.alive || e.id === target.id) continue;
      if (Math.hypot(e.pos.x - p.pos.x, e.pos.y - p.pos.y) <= 0.7) {
        damageEnemy(s, e, p.damage * 0.4, false, p.damageType);
      }
    }
  }

  // Railgun shockwave: heavy slow on pierce
  if (p.fromTower === 'railgun' && hasEffect(s, 'railgun', 'shockwave') && !ENEMIES[target.def].slowImmune) {
    target.speedMult = Math.min(target.speedMult, 0.3);
    target.slowTimer = Math.max(target.slowTimer, 1.5);
  }

  // Quantum entanglement: crits arc to nearest enemy
  if (p.fromTower === 'quantum' && p.isCrit && hasEffect(s, 'quantum', 'entangle')) {
    const chainRange = 3.0;
    const next = findChainTarget(s, target, new Set([target.id]), chainRange);
    if (next) {
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
  if (p.aoe) {
    spawnExplosion(s, { x: p.pos.x, y: p.pos.y }, p.color, p.aoe);
    for (const e of s.enemies) {
      if (!e.alive || e.id === target.id) continue;
      if (Math.hypot(e.pos.x - p.pos.x, e.pos.y - p.pos.y) <= p.aoe) {
        damageEnemy(s, e, p.damage * 0.75, p.isCrit ?? false, p.damageType);
      }
    }
  }
  if (p.chain && p.chain.jumps > 0) {
    const chainRange = hasEffect(s, 'chain', 'nova') ? 4.4 : 2.2;
    const nextTarget = findChainTarget(s, target, p.chain.hit, chainRange);
    if (nextTarget) {
      p.chain.hit.add(nextTarget.id);
      s.projectiles.push({
        ...p,
        id: nextId(),
        pos: { x: target.pos.x, y: target.pos.y },
        target: nextTarget.id,
        targetPos: { x: nextTarget.pos.x, y: nextTarget.pos.y },
        damage: p.damage * p.chain.falloff,
        chain: { jumps: p.chain.jumps - 1, falloff: p.chain.falloff, hit: new Set(p.chain.hit) },
        trail: [],
      });
    }
  }
}

function findPierceTarget(s: RunState, p: Projectile, exclude: EnemyInstance): EnemyInstance | null {
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
    if (dot > 0.55 && d < bestDist) { best = e; bestDist = d; }
  }
  return best;
}

function findChainTarget(s: RunState, from: EnemyInstance, exclude: Set<number>, maxDist: number): EnemyInstance | null {
  let best: EnemyInstance | null = null;
  let bestD = Infinity;
  for (const e of s.enemies) {
    if (!e.alive || exclude.has(e.id)) continue;
    const d = Math.hypot(e.pos.x - from.pos.x, e.pos.y - from.pos.y);
    if (d <= maxDist && d < bestD) {
      best = e;
      bestD = d;
    }
  }
  return best;
}

// Apply resistance multiplier + armor. Returns final damage applied.
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

export function damageEnemy(s: RunState, e: EnemyInstance, dmg: number, isCrit: boolean, type: DamageType): void {
  const def = ENEMIES[e.def];
  const final = applyResistanceAndArmor(e, dmg, type, isCrit);
  if (final <= 0) {
    // Show "IMMUNE" feedback
    s.floaters.push({
      pos: { x: e.pos.x, y: e.pos.y - 0.4 },
      text: 'IMMUNE',
      vy: -18,
      life: 0.8,
      maxLife: 0.8,
      color: '#6b8090',
      size: 12,
    });
    e.hitFlash = 0.12;
    return;
  }
  e.hp -= final;
  e.hitFlash = 0.18;
  const resist = def.resistances?.[type] ?? 1;
  const isResisted = resist < 1 && !(isCrit && def.critIgnoresResist);
  const isWeakness = resist > 1;
  const text = isCrit ? `${Math.round(final)}!` : `${Math.round(final)}`;
  const color = isCrit ? '#ffd600' : isWeakness ? '#00ff88' : isResisted ? '#6b8090' : '#ff2d95';
  s.floaters.push({
    pos: { x: e.pos.x, y: e.pos.y - 0.4 },
    text,
    vy: -26,
    life: 0.8,
    maxLife: 0.8,
    color,
    size: isCrit ? 22 : isWeakness ? 18 : 16,
  });
  if (e.hp <= 0) killEnemy(s, e);
}

function killEnemy(s: RunState, e: EnemyInstance): void {
  e.alive = false;
  const def = ENEMIES[e.def];
  grantXp(s, def.xp);
  s.floaters.push({
    pos: { x: e.pos.x, y: e.pos.y },
    text: `+${def.xp} XP`,
    vy: -40,
    life: 0.9,
    maxLife: 0.9,
    color: '#00fff0',
    size: 14,
  });
  spawnDeathBurst(s, e.pos, def.color, def.accent, e.isBoss ? 30 : 14);
  audio.play(e.isBoss ? 'boss_die' : 'enemy_die');
  if (e.isBoss) {
    s.shakeTime = 0.5;
    s.shakeAmp = 16;
    s.protocolsEarned += 5;
    s.floaters.push({ pos: { x: e.pos.x, y: e.pos.y - 0.8 }, text: '+5 \u2b22 PROTOCOL', vy: -35, life: 1.8, maxLife: 1.8, color: '#ffd600', size: 20 });
  }
  // Phantom death: EMP burst jams nearby towers for 3s.
  if (e.def === 'phantom') {
    for (const t of s.towers) {
      if (Math.hypot(t.pos.x - e.pos.x, t.pos.y - e.pos.y) <= 3.5) {
        applyTowerDebuff(s, t, 'jammed', 3);
      }
    }
  }
}

function spawnExplosion(s: RunState, pos: Vec2, color: string, radius: number): void {
  const count = Math.round(14 * radius);
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

function spawnDeathBurst(s: RunState, pos: Vec2, color: string, accent: string, count: number): void {
  for (let i = 0; i < count; i++) {
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
// Default targeting mode depends on the tower's role: snipers favor STRONG, AOE favors FIRST,
// mines are proximity so they default CLOSE.
function defaultTargetMode(defId: keyof typeof TOWERS): TowerInstance['targetMode'] {
  if (defId === 'antivirus' || defId === 'railgun') return 'strong';
  if (defId === 'mine') return 'close';
  return 'first';
}

// Deploy a tower — requires a deploy token for that tower type.
export function placeTower(s: RunState, defId: keyof typeof TOWERS, grid: Vec2): TowerInstance | null {
  const tokens = s.deployTokens[defId] ?? 0;
  if (tokens <= 0) return null;
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
  audio.play('place');
  return t;
}

export function cycleTargetMode(t: TowerInstance): void {
  const modes: TowerInstance['targetMode'][] = ['first', 'strong', 'weak', 'close'];
  const idx = modes.indexOf(t.targetMode);
  t.targetMode = modes[(idx + 1) % modes.length];
  audio.play('ui_click');
}

// Remove a tower (no refund, but frees the cell).
export function removeTower(s: RunState, t: TowerInstance): void {
  s.towers = s.towers.filter((x) => x.id !== t.id);
  s.selection = { kind: 'none' };
  audio.play('sell');
}
