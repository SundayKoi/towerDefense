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
import { haptics } from '@/audio/haptics';
import { xpForLevel } from './state';
import { exploitBonus } from '@/data/ports';

let entityIdSeq = 1;
export const nextId = () => entityIdSeq++;

// Merge map base modifiers with per-run contract mutators. Daily-contract runs
// stack their mutator on top of the map's own flavor (a packet-storm contract on
// an already-encrypted map gets both). Called everywhere modifiers are read.
export function getEffectiveModifiers(s: RunState): NonNullable<ReturnType<typeof getMap>['modifiers']> {
  const base = getMap(s.mapId).modifiers ?? {};
  const extra = s.contractMutators ?? {};
  return {
    packetBursts: (base.packetBursts ?? 0) + (extra.packetBursts ?? 0),
    encrypted: (base.encrypted ?? 0) + (extra.encrypted ?? 0),
    stealthChance: Math.min(1, (base.stealthChance ?? 0) + (extra.stealthChance ?? 0)),
    replication: (base.replication ?? 0) + (extra.replication ?? 0),
    rootkit: base.rootkit ?? extra.rootkit ?? 0,
    // Lag spike stacks by max, not sum — two sources of surge don't compound
    // into a 3× warp, they just keep the strongest.
    lagSpike: Math.max(base.lagSpike ?? 0, extra.lagSpike ?? 0),
  };
}

function hasEffect(s: RunState, tower: TowerId, tag: string): boolean {
  return s.towerEffects[tower]?.has(tag) ?? false;
}

// True iff the enemy is currently inside the DECRYPT NODE aura (accounting for
// the GLOBAL BREACH capstone and the EXPOSE FULL-EXPOSURE capstone that widen
// the aura to the whole map under certain conditions).
export function isEnemyInDecryptAura(s: RunState, e: EnemyInstance): boolean {
  const decrypt = s.towers.find((tw) => tw.def === 'data_miner');
  if (!decrypt) return false;
  if (hasEffect(s, 'data_miner', 'dataminer_thr_caps')) return true;
  if (hasEffect(s, 'data_miner', 'dataminer_eco_caps')
      && s.enemies.some((ee) => ee.alive && ee.isBoss)) return true;
  const rng = TOWERS.data_miner.range
    + (hasEffect(s, 'data_miner', 'dataminer_thr_1') ? 0.5 : 0)
    + (hasEffect(s, 'data_miner', 'dataminer_eco_1') ? 0.5 : 0);
  return Math.hypot(e.pos.x - decrypt.grid.x, e.pos.y - decrypt.grid.y) <= rng;
}

// True iff towers of both types are placed AND share a connected subnet
// (adjacency via BFS with ≤1 cell steps). Used by subnet-pair synergy cards
// so you have to actually place the towers next to each other to get the bonus.
export function hasSubnetLink(s: RunState, a: TowerId, b: TowerId): boolean {
  const ta = s.towers.find((t) => t.def === a);
  const tb = s.towers.find((t) => t.def === b);
  if (!ta || !tb) return false;
  const visited = new Set<number>();
  const queue: TowerInstance[] = [ta];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (visited.has(cur.id)) continue;
    visited.add(cur.id);
    if (cur.id === tb.id) return true;
    for (const other of s.towers) {
      if (visited.has(other.id) || other.id === cur.id) continue;
      if (Math.abs(cur.grid.x - other.grid.x) <= 1 && Math.abs(cur.grid.y - other.grid.y) <= 1) {
        queue.push(other);
      }
    }
  }
  return false;
}

// ======================= Wave flow =======================

export function startWave(s: RunState): void {
  s.wave += 1;
  const map = getMap(s.mapId);
  s.spawnQueue = buildWaveSpawnQueue(map, s.difficulty, s.wave, s.totalWaves, s.contractMutators);
  s.spawnElapsed = 0;
  s.phase = 'wave';
  // Reset lag-spike cadence on each wave so the first spike lands ~25s in, not
  // mid-spawn-in. Active surge is also cleared so the wave starts at normal speed.
  (s as any).lagSpikeCooldown = 25;
  (s as any).lagSpikeActive = 0;
  audio.play('wave_start');
  haptics.fire('wave_start');
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
  // Clear any in-flight lag surge so prep-phase stragglers don't keep warping.
  (s as any).lagSpikeActive = 0;
  const bonus = 25 + s.wave * 8;
  grantXp(s, bonus);
  const isBoss = bossForWave(getMap(s.mapId), s.difficulty, s.wave) != null;
  const bossBonus = isBoss ? (s.mods.bossProtocolBonus ?? 0) : 0;
  let proto = (isBoss ? 3 : 1) + bossBonus;
  // Data miner protocol_mine upgrade: +1 protocol per wave cleared.
  if (s.towers.some((t) => t.def === 'data_miner') && hasEffect(s, 'data_miner', 'protocol_mine')) {
    proto += 1;
  }
  // PROTOCOL OVERCLOCK (eco_over): +2 protocols per wave (additive)
  if (s.towers.some((t) => t.def === 'data_miner') && hasEffect(s, 'data_miner', 'dataminer_eco_over')) {
    proto += 2;
  }
  // PROTOCOL FLOOD (eco_caps): +50% protocols this wave
  if (s.towers.some((t) => t.def === 'data_miner') && hasEffect(s, 'data_miner', 'dataminer_eco_caps')) {
    proto = Math.ceil(proto * 1.5);
  }
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
      // Wave-1 worms are a tutorial gimme — firewall (14 dmg) should one-shot
      // them so the player's very first placement lands a clean kill.
      hp = 12;
    } else {
      hp *= hpScale(s.wave, s.difficulty);
    }
  }
  // Ascension stacks on top of base scaling — cleanly multiplicative so the
  // player sees "8% more HP per level" directly in their run feel.
  if (s.brutalHpMult && s.brutalHpMult > 1) hp *= s.brutalHpMult;
  const speed = def.speed * (s.mods.enemySpeedMult) * (1 + Math.min(0.3, (s.wave - 1) * 0.01)) * (s.brutalSpeedMult ?? 1);
  const path = map.paths[pathIndex] ?? map.paths[0];
  const start = path.points[0];

  // First-encounter detection for enemy intro popups
  if (events?.onNewEnemy && !s.seenThisRun.has(defId)) {
    s.seenThisRun.add(defId);
    events.onNewEnemy(defId);
  }

  // Sector modifiers — ENCRYPTED PAYLOADS gives a regenerating shield;
  // STEALTH PROTOCOL randomly cloaks a fraction of spawns. Read via
  // getEffectiveModifiers so daily-contract mutators stack on top of the
  // map's own modifiers.
  const mods = getEffectiveModifiers(s);
  const shieldPct = mods.encrypted ?? 0;
  const maxShield = shieldPct > 0 ? Math.round(hp * shieldPct) : 0;
  const stealthRoll = mods.stealthChance ?? 0;
  const isStealthSpawn = stealthRoll > 0 && Math.random() < stealthRoll;

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
    invisTimer: isStealthSpawn ? 9999 : 0,  // permanent cloak for the run
    hitFlash: 0,
    angle: 0,
    shield: maxShield > 0 ? maxShield : undefined,
    maxShield: maxShield > 0 ? maxShield : undefined,
    shieldRegenTimer: maxShield > 0 ? 0 : undefined,
    // VOIDLORD phase shift: spawn with a random initial immune type. Rotated every
    // 12s in the per-frame enemy tick (see updateRun). Non-voidlord enemies get no
    // phase shift fields (undefined).
    phaseShiftType: defId === 'voidlord' ? randomPhaseType(null) : undefined,
    phaseShiftTimer: defId === 'voidlord' ? 0 : undefined,
    // Boss mechanic state — zero/false for non-bosses, read per-frame and on
    // damage for DAEMON / SWARM / LEVIATHAN behaviors below.
    bossSpawnTimer: defId === 'swarm' ? 0 : undefined,
    bossTriggered: false,
    regenCooldown: defId === 'leviathan' ? 0 : undefined,
  });
  // Haptic: boss spawn buzzes with a dread pattern so the player can feel the
  // wave shift even if the sound is muted. Also announce with a big on-map
  // banner so the player knows what's coming and which counter to rely on.
  const spawnedIsBoss = isBoss || def.threat === 'BOSS' || def.threat === 'MEGA' || def.threat === 'FINAL';
  if (spawnedIsBoss) {
    haptics.fire('boss_spawn');
    s.floaters.push({
      pos: { x: start.x, y: start.y - 1.0 },
      text: `\u26A0 INCOMING: ${def.name}`,
      vy: -12, life: 3.5, maxLife: 3.5,
      color: def.accent, size: 22,
    });
  }
  // Telegraph VOIDLORD's starting immunity so the player reacts at spawn, not
  // after the first 12s rotation.
  if (defId === 'voidlord') {
    const spawned = s.enemies[s.enemies.length - 1];
    s.floaters.push({
      pos: { x: spawned.pos.x, y: spawned.pos.y - 0.5 },
      text: `IMMUNE: ${(spawned.phaseShiftType ?? 'kinetic').toUpperCase()}`,
      vy: -0.6, life: 2.4, maxLife: 2.4,
      color: '#ff3355', size: 16,
    });
  }
}

// Pick a damage type for VOIDLORD phase shift that differs from the current one,
// so the rotation actually forces a build pivot instead of re-rolling the same immunity.
const PHASE_TYPES: DamageType[] = ['kinetic', 'energy', 'aoe', 'chain', 'pierce'];
function randomPhaseType(exclude: DamageType | null): DamageType {
  const pool = exclude ? PHASE_TYPES.filter((t) => t !== exclude) : PHASE_TYPES;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ======================= XP / Level =======================

function grantXp(s: RunState, amount: number): void {
  // Keep xp as float so sub-integer grants (data miner's 0.05/frame) actually
  // accumulate instead of being rounded to 0. HUD displays Math.floor(run.xp).
  const gain = amount * s.mods.xpMult;
  s.xp += gain;
  s.xpThisRun += gain;
  while (s.xp >= s.xpToNext) {
    s.xp -= s.xpToNext;
    s.level += 1;
    s.xpToNext = xpForLevel(s.level);
    s.pendingLevelUps += 1;
  }
}

// ======================= Packets =======================
// Expire loot packets that weren't picked up, and decay any active packet buffs.
function updatePackets(s: RunState, dt: number): void {
  for (let i = s.packets.length - 1; i >= 0; i--) {
    const p = s.packets[i];
    p.timeLeft -= dt;
    if (p.timeLeft <= 0) s.packets.splice(i, 1);
  }
  if (s.packetBuffs.timeLeft > 0) {
    s.packetBuffs.timeLeft -= dt;
    if (s.packetBuffs.timeLeft <= 0) {
      s.packetBuffs.dmgMult = 1;
      s.packetBuffs.rateMult = 1;
      s.packetBuffs.xpMult = 1;
    }
  }
}

// Click a packet (by screen coord converted to world). Consumes the packet and
// applies its buff. Returns true if a packet was collected.
export function tryCollectPacket(s: RunState, worldX: number, worldY: number, radius = 0.7): boolean {
  let bestIdx = -1;
  let bestDist = radius;
  for (let i = 0; i < s.packets.length; i++) {
    const p = s.packets[i];
    const d = Math.hypot(p.pos.x - worldX, p.pos.y - worldY);
    if (d <= bestDist) { bestDist = d; bestIdx = i; }
  }
  if (bestIdx < 0) return false;
  const pkt = s.packets[bestIdx];
  s.packets.splice(bestIdx, 1);
  applyPacketBuff(s, pkt.kind);
  return true;
}

function applyPacketBuff(s: RunState, kind: 'dmg' | 'rate' | 'xp' | 'hp'): void {
  const BUFF_DUR = 8;
  if (kind === 'dmg') {
    s.packetBuffs.dmgMult = 1.5;
    s.packetBuffs.timeLeft = BUFF_DUR;
    s.floaters.push({ pos: { x: 8, y: 4 }, text: '+50% DMG (8s)', vy: -20, life: 1.4, maxLife: 1.4, color: '#ff2d95', size: 18 });
  } else if (kind === 'rate') {
    s.packetBuffs.rateMult = 1.5;
    s.packetBuffs.timeLeft = BUFF_DUR;
    s.floaters.push({ pos: { x: 8, y: 4 }, text: '+50% RATE (8s)', vy: -20, life: 1.4, maxLife: 1.4, color: '#00fff0', size: 18 });
  } else if (kind === 'xp') {
    grantXp(s, 15);
    s.floaters.push({ pos: { x: 8, y: 4 }, text: '+15 XP', vy: -20, life: 1.4, maxLife: 1.4, color: '#00ff88', size: 18 });
  } else if (kind === 'hp') {
    if (s.hp < s.maxHp) {
      s.hp = Math.min(s.maxHp, s.hp + 5);
      s.floaters.push({ pos: { x: 8, y: 4 }, text: '+5 INTEGRITY', vy: -20, life: 1.4, maxLife: 1.4, color: '#00ff88', size: 18 });
    }
  }
  audio.play('ui_click');
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
  let baseDps = (hasEffect(s, 'sentinel', 'reinforced') ? 20 : def.damage)
    + (hasEffect(s, 'sentinel', 'overclocked') ? 8 : 0)
    + (hasEffect(s, 'sentinel', 'sentinel_thr_barbed') ? 6 : 0);
  // SENTINEL FIELD capstone: 40 dps base
  if (hasEffect(s, 'sentinel', 'sentinel_fld_caps')) baseDps = Math.max(baseDps, 40);
  const slowPct = hasEffect(s, 'sentinel', 'anchor') ? 0.45 : def.slow!.pct;
  const slowDur = def.slow!.duration;

  // Surge event: every 5s emit 5x damage surge for 0.5s. MEGA SURGE capstone: 10× every 4s.
  const surgeInterval = hasEffect(s, 'sentinel', 'sentinel_plz_caps') ? 4 : 5;
  const surgeMagnitude = hasEffect(s, 'sentinel', 'sentinel_plz_caps') ? 10 : 5;
  t.extras.surgeTimer = (t.extras.surgeTimer ?? surgeInterval) - dt;
  t.extras.surgeActive = Math.max(0, (t.extras.surgeActive ?? 0) - dt);
  const surgeOn = hasEffect(s, 'sentinel', 'surge_event') || hasEffect(s, 'sentinel', 'sentinel_plz_caps');
  if (surgeOn && t.extras.surgeTimer <= 0) {
    t.extras.surgeTimer = surgeInterval;
    t.extras.surgeActive = 0.5;
    t.fireFlash = 0.4;
  }
  const surgeMult = (surgeOn && (t.extras.surgeActive ?? 0) > 0) ? surgeMagnitude : 1;

  // Pulse-link: mark all enemies in range every 5s (3s with CHARGED PULSE, 4s mark with PULSE STORM)
  const plzInterval = hasEffect(s, 'sentinel', 'sentinel_plz_charged') ? 3 : 5;
  const plzMarkDur = hasEffect(s, 'sentinel', 'sentinel_plz_storm') ? 4 : 2;
  t.extras.pulseTimer = (t.extras.pulseTimer ?? 0) - dt;
  if (hasEffect(s, 'sentinel', 'pulse_link') && t.extras.pulseTimer <= 0) {
    t.extras.pulseTimer = plzInterval;
    for (const e of s.enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.pos.x - t.grid.x, e.pos.y - t.grid.y) <= range) {
        e.marked = Math.max(e.marked ?? 0, plzMarkDur);
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

  let rechargeTime = 2.5
    - (hasEffect(s, 'pulse', 'frequency') ? 0.7 : 0)
    - (hasEffect(s, 'pulse', 'rapid_resonance') ? 0.4 : 0);
  // STROBE BURST capstone: pin recharge to 0.8s
  if (hasEffect(s, 'pulse', 'pulse_frq_caps')) rechargeTime = Math.min(rechargeTime, 0.8);
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
    // ETERNAL OVERLOAD capstone: every burst is an overload
    const overloadActive = hasEffect(s, 'pulse', 'overload') || hasEffect(s, 'pulse', 'pulse_ovl_caps');
    const isOverload = overloadActive && (hasEffect(s, 'pulse', 'pulse_ovl_caps') || t.extras.burstCount % 4 === 0);
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
      // PULSE IONIC CHARGED: strip 2 armor on hit
      if (hasEffect(s, 'pulse', 'pulse_ion_charged')) {
        e.armor = Math.max(0, e.armor - 2);
      }
      // PULSE IONIC capstone: strip 4 armor permanently (no restore via collapseTimer)
      if (hasEffect(s, 'pulse', 'pulse_ion_caps')) {
        e.armor = Math.max(0, e.armor - 4);
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
      // NETLINK pulse+booster_node: bursts proc twice per cycle
      if (hasEffect(s, 'pulse', 'netlink_pulse_booster_node')
          && (hasSubnetLink(s, 'pulse', 'booster_node') || hasEffect(s, 'booster_node', 'booster_res_caps'))) {
        for (const e of s.enemies) {
          if (!e.alive) continue;
          if (Math.hypot(e.pos.x - t.grid.x, e.pos.y - t.grid.y) <= range) {
            damageEnemy(s, e, baseDmg, false, 'energy', false, 'pulse');
          }
        }
      }
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

  // Hit-pause: freeze world sim but keep FX ticking so the player sees the
  // satisfying micro-freeze without losing the death particles/floaters.
  // Tier durations: 30ms normal, 80ms elite, 200ms boss — set on kill.
  if (s.hitPause > 0) {
    s.hitPause = Math.max(0, s.hitPause - dtSec);
    tickFxOnly(s, dtSec);
    return;
  }

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

  // DATA MINER STUTTER — periodic aura-wide stun. Every 3s, pulse a 0.4s
  // full-stop on all enemies inside the decrypt aura (slow-immune excepted).
  // Timer fires once per interval; stutterFire is set for the enemy loop
  // below to consume and cleared at end of frame.
  let stutterFire = false;
  if (hasEffect(s, 'data_miner', 'dataminer_mta_stutter')) {
    (s as any).stutterTimer = ((s as any).stutterTimer ?? 3) - dtSec;
    if ((s as any).stutterTimer <= 0) {
      (s as any).stutterTimer = 3;
      stutterFire = true;
    }
  }

  // LAG SPIKE sector modifier (Act 2 PACKET STORM) — every 25s of active wave,
  // all enemies surge for 2s at +lagSpike speed. Only ticks during the wave
  // phase so prep time doesn't drain the cooldown silently.
  const lagSpikeMag = getEffectiveModifiers(s).lagSpike ?? 0;
  if (s.phase === 'wave' && lagSpikeMag > 0) {
    if ((s as any).lagSpikeActive > 0) {
      (s as any).lagSpikeActive = Math.max(0, (s as any).lagSpikeActive - dtSec);
    } else {
      (s as any).lagSpikeCooldown = ((s as any).lagSpikeCooldown ?? 25) - dtSec;
      if ((s as any).lagSpikeCooldown <= 0) {
        (s as any).lagSpikeCooldown = 25;
        (s as any).lagSpikeActive = 2;
        s.shakeTime = Math.max(s.shakeTime, 0.25);
        s.shakeAmp = Math.max(s.shakeAmp, 4);
        s.floaters.push({
          pos: { x: 8, y: 3 },
          text: 'LAG SPIKE!',
          vy: -18, life: 1.4, maxLife: 1.4,
          color: '#ff9f00', size: 22,
        });
        audio.play('wave_start');
        haptics.fire('wave_start');
      }
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
    // Soft slow resistance — per-frame floor on speedMult. An enemy with
    // slowResistPct 0.5 can never have their speed cut below 50%, regardless
    // of how many or how strong the incoming slows are. Lets wraith (and any
    // future partial-resist enemies) take some slow without being shut down
    // the way slow-immune bosses are.
    const slowResist = ENEMIES[e.def].slowResistPct;
    if (slowResist && slowResist > 0 && e.speedMult < slowResist) {
      e.speedMult = slowResist;
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
    // ─── Boss mechanics ───────────────────────────────────────────────
    // SWARM QUEEN — spawns a CRAWLER every 1.5s while alive. Adds pressure;
    // makes killing her feel meaningful because the brood stops when she dies.
    if (e.def === 'swarm' && e.bossSpawnTimer !== undefined) {
      e.bossSpawnTimer += dtSec;
      if (e.bossSpawnTimer >= 1.5) {
        e.bossSpawnTimer = 0;
        spawnWormAt(s, e.pos, e.pathIndex, e.progress);
        // Re-tag the last spawn as a crawler instead of a worm.
        const brood = s.enemies[s.enemies.length - 1];
        if (brood) brood.def = 'spider';
      }
    }
    // LEVIATHAN — regenerates 1.5% maxHp/s if undamaged for >1s. regenCooldown
    // is reset in damageEnemy on any incoming damage so sustained DPS denies
    // the regen, but a brief pause lets it claw back meaningful chunks.
    if (e.def === 'leviathan' && e.regenCooldown !== undefined) {
      e.regenCooldown += dtSec;
      if (e.regenCooldown > 1.0 && e.hp < e.maxHp) {
        e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.015 * dtSec);
      }
    }
    // VOIDLORD phase shift — rotate the immune damage type every 12s while alive.
    // Spawns a floater telegraphing the new immune type so the player has a chance
    // to react rather than being silently punished for the wrong build.
    if (e.phaseShiftType !== undefined && e.phaseShiftTimer !== undefined) {
      e.phaseShiftTimer += dtSec;
      if (e.phaseShiftTimer >= 12) {
        const next = randomPhaseType(e.phaseShiftType);
        e.phaseShiftType = next;
        e.phaseShiftTimer = 0;
        s.floaters.push({
          pos: { x: e.pos.x, y: e.pos.y - 0.5 },
          text: `IMMUNE: ${next.toUpperCase()}`,
          vy: -0.6, life: 1.8, maxLife: 1.8,
          color: '#ff3355', size: 14,
        });
      }
    }
    // ENCRYPTED PAYLOADS: shield regenerates after 2s of no damage.
    // DECRYPT CORRUPT sync field suppresses regen entirely.
    if (e.maxShield !== undefined && e.shield !== undefined) {
      e.shieldRegenTimer = (e.shieldRegenTimer ?? 0) + dtSec;
      const suppressRegen = hasEffect(s, 'data_miner', 'dataminer_mta_nosync')
        && isEnemyInDecryptAura(s, e);
      if (!suppressRegen && e.shieldRegenTimer > 2 && e.shield < e.maxShield) {
        e.shield = Math.min(e.maxShield, e.shield + e.maxShield * 0.5 * dtSec);
      }
    }
    // CRACKED EXPOSURE countdown — set when a shield breaks in damageEnemy.
    if ((e.crackedTimer ?? 0) > 0) {
      e.crackedTimer = Math.max(0, (e.crackedTimer ?? 0) - dtSec);
    }
    // DECRYPT NODE — per-frame effects on enemies inside the aura.
    if (isEnemyInDecryptAura(s, e)) {
      // CORRUPT branch DoT.
      if (hasEffect(s, 'data_miner', 'dataminer_mta_key')) {
        const dps = hasEffect(s, 'data_miner', 'dataminer_mta_heavy') ? 8 : 4;
        damageEnemy(s, e, dps * dtSec, false, 'energy', true, 'data_miner');
      }
      // CORRUPT slow.
      if (hasEffect(s, 'data_miner', 'dataminer_mta_slow') && !ENEMIES[e.def].slowImmune) {
        e.speedMult = Math.min(e.speedMult, 0.9);
        e.slowTimer = Math.max(e.slowTimer, 0.25);
      }
      // STUTTER pulse — 0.4s full-stop on aura enemies every 3s.
      if (stutterFire && !ENEMIES[e.def].slowImmune) {
        e.speedMult = 0;
        e.slowTimer = Math.max(e.slowTimer, 0.4);
      }
      // EXPOSE reveal — strip invisibility.
      if (hasEffect(s, 'data_miner', 'dataminer_eco_reveal')) {
        if (e.invisTimer > 0) e.invisTimer = 0;
      }
    }

    // LEECH — heal aura: restores HP to nearby non-boss allies. Was previously
    // just a description; now actually behaves per its bestiary entry. Heals up
    // to 2 closest enemies within 1.4 tiles, 6 hp/s each. Makes LEECH a genuine
    // priority target (per counterTip: "Priority kill. HONEYPOT slows them...").
    if (e.def === 'leech') {
      const candidates: EnemyInstance[] = [];
      for (const other of s.enemies) {
        if (!other.alive || other.id === e.id || other.isBoss) continue;
        if (other.hp >= other.maxHp) continue;
        const d = Math.hypot(other.pos.x - e.pos.x, other.pos.y - e.pos.y);
        if (d <= 1.4) candidates.push(other);
      }
      // Heal the 2 lowest-HP candidates (prioritize the most-hurt, not closest).
      candidates.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
      for (let i = 0; i < Math.min(2, candidates.length); i++) {
        const tgt = candidates[i];
        tgt.hp = Math.min(tgt.maxHp, tgt.hp + 6 * dtSec);
      }
    }

    // OVERWATCH (sniper) SPOTTER branch — per-frame reveal aura. When an
    // enemy is cloaked (invisTimer > 0) and inside the sniper's reveal range,
    // strip the cloak and optionally apply branch-specific follow-ons:
    //   THERMAL SCOPE (`reveal`)          — strip the cloak (baseline keystone)
    //   SPOTTER PROTOCOL (`spotter_mark`) — also mark 1.5s on reveal
    //   TEAM CALLOUT    (`sniper_spt_team`) — reveal range extended by +50%
    //   ECHO MARK       (`sniper_spt_caps`) — mark 3s (+30% dmg from all)
    // Non-sniper towers respect the cleared invisTimer via their own target
    // selection, so the whole roster benefits once sniper strips the cloak.
    if (e.invisTimer > 0) {
      const sniper = s.towers.find((tw) => tw.def === 'sniper');
      if (sniper && hasEffect(s, 'sniper', 'reveal')) {
        let revealRange = effectiveRange(s, sniper);
        if (hasEffect(s, 'sniper', 'sniper_spt_team')) revealRange *= 1.5;
        if (Math.hypot(e.pos.x - sniper.grid.x, e.pos.y - sniper.grid.y) <= revealRange) {
          e.invisTimer = 0;
          if (hasEffect(s, 'sniper', 'spotter_mark')) {
            e.marked = Math.max(e.marked ?? 0, 1.5);
          }
          if (hasEffect(s, 'sniper', 'sniper_spt_caps')) {
            e.marked = Math.max(e.marked ?? 0, 3.0);
          }
          s.floaters.push({
            pos: { x: e.pos.x, y: e.pos.y - 0.4 },
            text: 'SPOTTED',
            vy: -22, life: 0.7, maxLife: 0.7,
            color: '#00ff88', size: 12,
          });
        }
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

    // LAG SPIKE: while active, add lagSpikeMag to the speed multiplier. Applied
    // outside e.speedMult so slow debuffs still work during the surge.
    const lagMult = (s as any).lagSpikeActive > 0 ? 1 + lagSpikeMag : 1;
    const speed = e.baseSpeed * e.speedMult * lagMult;
    e.progress += speed * dtSec;
    const path = map.paths[e.pathIndex] ?? map.paths[0];
    const pos = posOnPath(path, e.progress);
    e.pos.x = pos.x;
    e.pos.y = pos.y;
    e.angle = pos.angle;

    // Rootkit: periodically infects nearby towers. Capped to the 2 closest
    // so a single rootkit walking past a clustered subnet doesn't infect 6
    // towers at once. Duration dropped 5s → 3s.
    if (e.def === 'rootkit') {
      e.debuffTimer = (e.debuffTimer ?? 4) - dtSec;
      if (e.debuffTimer <= 0) {
        e.debuffTimer = 4;
        applyAreaDebuffToClosest(s, e.pos, 2.5, 'infected', 3, 2, e);
      }
    }

    // Parasite: infects nearest tower on close approach then dies. Duration
    // trimmed 6s → 4s since it's a run-committed suicide attack and shouldn't
    // nuke a tower for a full 6-second window.
    if (e.def === 'parasite') {
      for (const t of s.towers) {
        if (Math.hypot(t.pos.x - e.pos.x, t.pos.y - e.pos.y) <= 0.6) {
          applyTowerDebuff(s, t, 'infected', 4, e);
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
      // Take-damage shake tuned per research: moderate 150ms/5px for normal hits.
      s.shakeTime = Math.max(s.shakeTime, 0.15);
      s.shakeAmp = Math.max(s.shakeAmp, 5);
      haptics.fire(dmg >= 3 ? 'take_damage_big' : 'take_damage_small');
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
  updatePackets(s, dtSec);

  // ROOTKIT INTRUSION sector modifier: while a boss is alive, jam a random tower every N seconds.
  const rootkitInterval = getEffectiveModifiers(s).rootkit ?? 0;
  if (rootkitInterval > 0 && s.towers.length > 0) {
    const bossAlive = s.enemies.some((e) => e.alive && e.isBoss);
    if (bossAlive) {
      (s as any).rootkitTimer = ((s as any).rootkitTimer ?? rootkitInterval) - dtSec;
      if ((s as any).rootkitTimer <= 0) {
        (s as any).rootkitTimer = rootkitInterval;
        const target = s.towers[Math.floor(Math.random() * s.towers.length)];
        // Sector rootkit is already single-target; just shortened to 2s so it
        // reads as a flicker, not a crippling outage.
        applyTowerDebuff(s, target, 'jammed', 2);
      }
    } else {
      (s as any).rootkitTimer = rootkitInterval;
    }
  }

  // Tower updates
  for (const t of s.towers) {
    if (t.def === 'sentinel') {
      tickTowerDebuffs(s, t, dtSec);
      updateSentinelTower(s, t, dtSec);
      if (t.fireFlash > 0) t.fireFlash = Math.max(0, t.fireFlash - dtSec);
      continue;
    }
    if (t.def === 'pulse') {
      tickTowerDebuffs(s, t, dtSec);
      updatePulseTower(s, t, dtSec);
      if (t.fireFlash > 0) t.fireFlash = Math.max(0, t.fireFlash - dtSec);
      continue;
    }
    if (t.def === 'data_miner') {
      // DECRYPT NODE — passive damage-amplification aura. The multiplier is
      // applied in damageEnemy. Here we just pulse the visual.
      tickTowerDebuffs(s, t, dtSec);
      t.extras.flashTimer = (t.extras.flashTimer ?? 0) - dtSec;
      if (t.extras.flashTimer <= 0) { t.extras.flashTimer = 1.2; t.fireFlash = 0.18; }
      if (t.fireFlash > 0) t.fireFlash = Math.max(0, t.fireFlash - dtSec);
      continue;
    }
    if (t.def === 'booster_node') {
      // Passive aura — handled in effectiveDamage / effectiveFireRate. Just pulse a flash for visuals.
      tickTowerDebuffs(s, t, dtSec);
      t.extras.flashTimer = (t.extras.flashTimer ?? 0) - dtSec;
      if (t.extras.flashTimer <= 0) { t.extras.flashTimer = 1.5; t.fireFlash = 0.2; }
      if (t.fireFlash > 0) t.fireFlash = Math.max(0, t.fireFlash - dtSec);
      continue;
    }
    if (t.def === 'heat_sink') {
      tickTowerDebuffs(s, t, dtSec);
      updateHeatSink(s, t, dtSec);
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
    // Physics path: damage numbers arc with gravity + lateral drift.
    // Status text path (no vx/gravity): flat upward float like before.
    if (f.gravity !== undefined || f.vx !== undefined) {
      f.pos.y += (f.vy ?? 0) * dtSec * 0.01;
      f.pos.x += (f.vx ?? 0) * dtSec * 0.01;
      if (f.gravity) f.vy = (f.vy ?? 0) + f.gravity * dtSec;
    } else {
      f.pos.y += f.vy * dtSec * 0.01;
    }
  }
  for (let i = s.floaters.length - 1; i >= 0; i--) { if (s.floaters[i].life <= 0) s.floaters.splice(i, 1); }
}

// ======================= Tower targeting & firing =======================

function effectiveRange(s: RunState, t: TowerInstance): number {
  const def = TOWERS[t.def];
  const specificRange = s.mods.towerRange[t.def] ?? 0;
  let metaPct = 0;
  if (hasEffect(s, 'data_miner', 'dataminer_mta_range')) {
    metaPct += 0.01 * s.towers.length * (hasEffect(s, 'data_miner', 'dataminer_mta_caps') ? 2 : 1);
  }
  let r = def.range * (1 + s.mods.globalRangePct + specificRange + metaPct);
  if (t.def === 'mine' && hasEffect(s, 'mine', 'pressure_fuse')) r += 0.4;
  return r;
}

function effectiveDamage(s: RunState, t: TowerInstance): number {
  const def = TOWERS[t.def];
  const specific = s.mods.towerDmg[t.def] ?? 0;
  let metaPct = 0;
  if (hasEffect(s, 'data_miner', 'dataminer_mta_learn')) {
    metaPct += 0.02 * s.towers.length * (hasEffect(s, 'data_miner', 'dataminer_mta_caps') ? 2 : 1);
  }
  let dmg = def.damage * (1 + s.mods.globalDamagePct + specific + metaPct);
  if (t.debuffs.some((d) => d.kind === 'infected')) dmg *= 0.55;
  // Subnet bonus: damage multiplier from being adjacent to other turrets.
  // Cached per tower in extras.subnetMult; recomputed on place/remove.
  dmg *= (t.extras.subnetMult ?? 1);
  // Overdrive: +200% damage for the boost duration.
  if ((t.extras.overdriveActive ?? 0) > 0) dmg *= 3;
  // Packet buff — short-lived pickup buff applied globally.
  if (s.packetBuffs.timeLeft > 0) dmg *= s.packetBuffs.dmgMult;
  // Booster Node aura: each in-range booster adds its damage buff. Stacks across boosters.
  if (t.def !== 'booster_node' && t.def !== 'data_miner') {
    for (const b of s.towers) {
      if (b.def !== 'booster_node') continue;
      const r = effectiveRange(s, b) + (hasEffect(s, 'booster_node', 'amplify') ? 0.5 : 0)
        + (hasEffect(s, 'booster_node', 'booster_amp_wide') ? 0.8 : 0)
        + (hasEffect(s, 'booster_node', 'booster_res_aura') ? 0.4 : 0);
      const focus = hasEffect(s, 'booster_node', 'focus_beam');
      const dist = focus ? 0 : Math.hypot(b.grid.x - t.grid.x, b.grid.y - t.grid.y);
      if (dist <= r) {
        dmg *= hasEffect(s, 'booster_node', 'overcharge') ? 1.35 : 1.25;
      }
    }
  }
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
  let metaPct = 0;
  if (hasEffect(s, 'data_miner', 'dataminer_mta_rate')) {
    metaPct += 0.02 * s.towers.length * (hasEffect(s, 'data_miner', 'dataminer_mta_caps') ? 2 : 1);
  }
  let rate = def.fireRate * (1 + s.mods.globalRatePct + specificRate + metaPct);
  if (t.debuffs.some((d) => d.kind === 'jammed')) rate *= 0.35;
  if (s.packetBuffs.timeLeft > 0) rate *= s.packetBuffs.rateMult;
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
  // SHOCK CYCLE (heat_sink PURGE branch): +25% fire rate after a cleanse.
  if ((t.extras.shockBoostTimer ?? 0) > 0) rate *= 1.25;
  // Booster Node aura: in-range boosters add fire-rate buff.
  if (t.def !== 'booster_node' && t.def !== 'data_miner') {
    for (const b of s.towers) {
      if (b.def !== 'booster_node') continue;
      const r = effectiveRange(s, b) + (hasEffect(s, 'booster_node', 'amplify') ? 0.5 : 0)
        + (hasEffect(s, 'booster_node', 'booster_amp_wide') ? 0.8 : 0)
        + (hasEffect(s, 'booster_node', 'booster_res_aura') ? 0.4 : 0);
      const focus = hasEffect(s, 'booster_node', 'focus_beam');
      const dist = focus ? 0 : Math.hypot(b.grid.x - t.grid.x, b.grid.y - t.grid.y);
      if (dist <= r) {
        rate *= hasEffect(s, 'booster_node', 'overcharge') ? 1.25 : 1.15;
      }
    }
  }
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
    let typeCount = types.size;
    // Booster Resonance: counts as 2 unique types when present in a subnet.
    if (cluster.some((c) => c.def === 'booster_node') && hasEffect(s, 'booster_node', 'resonance')) {
      typeCount += 1;
    }
    let mult = Math.min(1.6, 1 + 0.08 * (size - 1) + 0.12 * (typeCount - 1));
    // RESONATOR HARMONICS: subnet bonuses 25% stronger (raise cap to 1.75 too)
    if (hasEffect(s, 'booster_node', 'booster_res_harm')) {
      mult = Math.min(1.75, 1 + (mult - 1) * 1.25);
    }
    for (const c of cluster) {
      c.extras.subnetMult = mult;
      c.extras.subnetSize = size;
      c.extras.subnetTypes = typeCount;
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

export function canOverdrive(t: TowerInstance): boolean {
  // Support turrets have no active firing loop to boost, so overdrive has
  // nothing to toggle against. They also never tick the offline timer down
  // (since they bypass updateTower), which would leave them stuck burning.
  return t.def !== 'booster_node' && t.def !== 'data_miner';
}


export function triggerOverdrive(s: RunState, t: TowerInstance): boolean {
  if (!canOverdrive(t)) return false;
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

// ---------- HEAT SINK support ----------
// Base capacity 3, bumped +2 by COOL RESERVES.
function getHeatSinkCap(s: RunState, _sink: TowerInstance): number {
  return hasEffect(s, 'heat_sink', 'heat_sink_itc_cap2') ? 5 : 3;
}
// Default vent downtime is 3s; CALIBRATED VENT cuts it 40%.
function getHeatSinkVentDuration(s: RunState): number {
  return hasEffect(s, 'heat_sink', 'heat_sink_itc_fastvent') ? 1.8 : 3.0;
}
// Nearest non-venting sink within its effectiveRange of targetPos, or undefined.
function findOnlineHeatSink(s: RunState, targetPos: Vec2): TowerInstance | undefined {
  let best: TowerInstance | undefined;
  let bestD = Infinity;
  for (const sink of s.towers) {
    if (sink.def !== 'heat_sink') continue;
    if ((sink.extras.ventTimer ?? 0) > 0) continue;
    const range = effectiveRange(s, sink);
    const d = Math.hypot(sink.pos.x - targetPos.x, sink.pos.y - targetPos.y);
    if (d <= range && d < bestD) { best = sink; bestD = d; }
  }
  return best;
}
// Cleanse a tower's debuffs. PURGE branch extras: CRASH RECOVERY zeroes the
// grace period, SHOCK CYCLE grants a 3s +25% fire-rate buff.
function cleanseTower(s: RunState, t: TowerInstance): void {
  if (t.debuffs.length === 0) return;
  t.debuffs.length = 0;
  if (hasEffect(s, 'heat_sink', 'heat_sink_prg_crash')) {
    t.debuffCooldowns.jammed = 0;
    t.debuffCooldowns.infected = 0;
  }
  if (hasEffect(s, 'heat_sink', 'heat_sink_prg_shock')) {
    t.extras.shockBoostTimer = 3;
  }
  s.floaters.push({
    pos: { x: t.pos.x, y: t.pos.y - 0.6 },
    text: 'CLEANSED', vy: -22, life: 1.0, maxLife: 1.0,
    color: '#00ffaa', size: 12,
  });
}
function cleanseNearbyTowers(s: RunState, sink: TowerInstance, maxTargets: number): void {
  const range = effectiveRange(s, sink);
  const candidates: { t: TowerInstance; d: number }[] = [];
  for (const t of s.towers) {
    if (t.id === sink.id || t.debuffs.length === 0) continue;
    const d = Math.hypot(t.pos.x - sink.pos.x, t.pos.y - sink.pos.y);
    if (d <= range) candidates.push({ t, d });
  }
  candidates.sort((a, b) => a.d - b.d);
  for (let i = 0; i < Math.min(maxTargets, candidates.length); i++) {
    cleanseTower(s, candidates[i].t);
  }
}
// Force the sink offline for its vent duration. Pure mechanical reset — PURGE
// cleanses are driven by the independent PURGE CYCLE timer (time-based, not
// vent-triggered) so the branch works even without the INTERCEPT keystone.
function triggerHeatSinkVent(s: RunState, sink: TowerInstance): void {
  sink.extras.heat = 0;
  sink.extras.ventTimer = getHeatSinkVentDuration(s);
  sink.fireFlash = 0.4;
  s.floaters.push({
    pos: { x: sink.pos.x, y: sink.pos.y - 0.5 },
    text: 'VENT!', vy: -20, life: 1.2, maxLife: 1.2,
    color: '#ff9f00', size: 16,
  });
  s.shakeTime = Math.max(s.shakeTime, 0.1);
  s.shakeAmp = Math.max(s.shakeAmp, 2);
}
// PURGE CYCLE — time-based cleanse pulse driven by the PURGE keystone.
function triggerHeatSinkPurge(s: RunState, sink: TowerInstance): void {
  sink.fireFlash = 0.3;
  s.floaters.push({
    pos: { x: sink.pos.x, y: sink.pos.y - 0.5 },
    text: 'PURGE', vy: -20, life: 1.0, maxLife: 1.0,
    color: '#00ffaa', size: 14,
  });
  if (hasEffect(s, 'heat_sink', 'heat_sink_prg_caps')) {
    for (const t of s.towers) cleanseTower(s, t);
  } else {
    cleanseNearbyTowers(s, sink, 99);
  }
}
// Set the standard 2s grace period — extended by 2s if an online heat sink
// with FIRMWARE PATCH is in range of the tower recovering.
function grantDebuffGrace(s: RunState, t: TowerInstance, kind: 'jammed' | 'infected'): void {
  let grace = 2.0;
  if (hasEffect(s, 'heat_sink', 'heat_sink_wrd_grace')
      && findOnlineHeatSink(s, t.pos)) {
    grace = 4.0;
  }
  t.debuffCooldowns[kind] = grace;
}

// Per-frame debuff bookkeeping shared by every tower — ticks active debuff
// timers, fires the grace-period grant on expiry, and decays the grace-period
// cooldowns. Previously inlined only in updateTower(), which meant passive
// turrets (booster_node, data_miner, sentinel, heat_sink) that `continue`d
// before hitting updateTower never expired their debuffs.
function tickTowerDebuffs(s: RunState, t: TowerInstance, dt: number): void {
  for (const d of t.debuffs) d.timeLeft -= dt;
  for (let i = t.debuffs.length - 1; i >= 0; i--) {
    if (t.debuffs[i].timeLeft <= 0) {
      grantDebuffGrace(s, t, t.debuffs[i].kind);
      t.debuffs.splice(i, 1);
    }
  }
  if ((t.debuffCooldowns.jammed ?? 0) > 0) t.debuffCooldowns.jammed = Math.max(0, (t.debuffCooldowns.jammed ?? 0) - dt);
  if ((t.debuffCooldowns.infected ?? 0) > 0) t.debuffCooldowns.infected = Math.max(0, (t.debuffCooldowns.infected ?? 0) - dt);
}

export function applyTowerDebuff(
  s: RunState,
  t: TowerInstance,
  kind: 'jammed' | 'infected',
  duration: number,
  source?: EnemyInstance,
): void {
  // Grace-period immunity: if this tower just recovered from the same kind of
  // debuff, skip. Stops cascading re-applications (phantom death + rootkit
  // aura + sector modifier firing back-to-back) from looking like permanent
  // lockdown on a clustered subnet.
  if ((t.debuffCooldowns[kind] ?? 0) > 0) return;

  // HEAT SINK intercept — an online sink within range soaks the debuff before
  // it touches the target. Heat sinks absorb debuffs on themselves normally.
  if (t.def !== 'heat_sink') {
    const sink = findOnlineHeatSink(s, t.pos);
    if (sink) {
      const intercept = hasEffect(s, 'heat_sink', 'heat_sink_itc_key');
      const wardCaps = hasEffect(s, 'heat_sink', 'heat_sink_wrd_caps');
      if (intercept || wardCaps) {
        // ZERO-LATENCY voids the debuff without banking heat; otherwise TWIN
        // halves the cost so two debuffs fit per heat unit.
        const zeroLatency = hasEffect(s, 'heat_sink', 'heat_sink_itc_caps');
        if (!zeroLatency) {
          const cost = hasEffect(s, 'heat_sink', 'heat_sink_itc_twin') ? 0.5 : 1;
          sink.extras.heat = (sink.extras.heat ?? 0) + cost;
          if (sink.extras.heat >= getHeatSinkCap(s, sink)) {
            triggerHeatSinkVent(s, sink);
          }
        }
        // PHASE REFLECT — 30% chance to slow the attacking enemy back.
        if (source && hasEffect(s, 'heat_sink', 'heat_sink_wrd_reflect') && Math.random() < 0.30) {
          if (!ENEMIES[source.def].slowImmune) {
            source.speedMult = Math.min(source.speedMult, 0.65);
            source.slowTimer = Math.max(source.slowTimer, 1.5);
          }
        }
        s.floaters.push({
          pos: { x: sink.pos.x, y: sink.pos.y - 0.5 },
          text: 'ABSORB', vy: -18, life: 0.9, maxLife: 0.9,
          color: '#ff6b00', size: 12,
        });
        sink.fireFlash = Math.max(sink.fireFlash, 0.25);
        return;
      }
      // FIELD PROJECTOR (non-caps WARD key): halve the landing duration.
      if (hasEffect(s, 'heat_sink', 'heat_sink_wrd_key')) {
        duration *= 0.5;
      }
    }
  }

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

// Per-frame tick for heat_sink towers — vent countdown, network-shield bleed,
// auto-purge cadence, and an idle pulse so the sprite reads as "active".
function updateHeatSink(s: RunState, t: TowerInstance, dt: number): void {
  // Mirror the computed cap onto extras so the renderer can draw a gauge
  // without re-deriving it.
  t.extras.heatCap = getHeatSinkCap(s, t);
  if ((t.extras.ventTimer ?? 0) > 0) {
    t.extras.ventTimer = Math.max(0, (t.extras.ventTimer ?? 0) - dt);
    if (t.extras.ventTimer === 0) {
      s.floaters.push({
        pos: { x: t.pos.x, y: t.pos.y - 0.55 },
        text: 'ONLINE', vy: -18, life: 0.9, maxLife: 0.9,
        color: '#00ff88', size: 12,
      });
    }
  }
  // NETWORK SHIELD: at cap, leak 1 unit every 2s instead of forced venting.
  if (hasEffect(s, 'heat_sink', 'heat_sink_wrd_bleed') && (t.extras.ventTimer ?? 0) <= 0) {
    const cap = getHeatSinkCap(s, t);
    if ((t.extras.heat ?? 0) >= cap - 0.001) {
      t.extras.bleedTimer = (t.extras.bleedTimer ?? 2) - dt;
      if ((t.extras.bleedTimer ?? 0) <= 0) {
        t.extras.bleedTimer = 2;
        t.extras.heat = Math.max(0, (t.extras.heat ?? 0) - 1);
      }
    } else {
      t.extras.bleedTimer = 2;
    }
  }
  // PURGE CYCLE — time-based cleanse pulse. Rapid Cycle shortens the interval.
  if (hasEffect(s, 'heat_sink', 'heat_sink_prg_key')) {
    const interval = hasEffect(s, 'heat_sink', 'heat_sink_prg_rapid') ? 7 : 10;
    t.extras.purgeTimer = (t.extras.purgeTimer ?? interval) - dt;
    if ((t.extras.purgeTimer ?? 0) <= 0) {
      t.extras.purgeTimer = interval;
      triggerHeatSinkPurge(s, t);
    }
  }
  // Idle flash pulse so the sprite doesn't look dead between absorbs.
  t.extras.flashTimer = (t.extras.flashTimer ?? 0) - dt;
  if ((t.extras.flashTimer ?? 0) <= 0) {
    t.extras.flashTimer = 1.2;
    t.fireFlash = Math.max(t.fireFlash, 0.14);
  }
}

// AOE debuff helper — sort towers by distance, apply debuff to the N closest
// within radius. Caps cascade damage on clustered subnet builds so one phantom
// death doesn't shut down a 6-tower cluster for 3 seconds.
function applyAreaDebuffToClosest(
  s: RunState, origin: Vec2, radius: number,
  kind: 'jammed' | 'infected', duration: number, maxTargets: number,
  source?: EnemyInstance,
): void {
  const inRange: { t: TowerInstance; d: number }[] = [];
  for (const t of s.towers) {
    const d = Math.hypot(t.pos.x - origin.x, t.pos.y - origin.y);
    if (d <= radius) inRange.push({ t, d });
  }
  inRange.sort((a, b) => a.d - b.d);
  for (let i = 0; i < Math.min(maxTargets, inRange.length); i++) {
    applyTowerDebuff(s, inRange[i].t, kind, duration, source);
  }
}

function updateTower(s: RunState, t: TowerInstance, dt: number): void {
  tickTowerDebuffs(s, t, dt);
  // SHOCK CYCLE (heat_sink PURGE branch): tick down the +25% rate window.
  if ((t.extras.shockBoostTimer ?? 0) > 0) {
    t.extras.shockBoostTimer = Math.max(0, (t.extras.shockBoostTimer ?? 0) - dt);
  }
  // Overdrive timers — when offline, skip firing entirely.
  if (!tickOverdrive(t, dt)) { t.cooldown = Math.max(0, t.cooldown - dt); return; }
  t.cooldown = Math.max(0, t.cooldown - dt);
  // Support turrets do nothing in the targeting/firing loop. Their effects are
  // applied passively (booster aura in effectiveDamage/Rate, data miner XP in
  // updateRun).
  if (t.def === 'booster_node' || t.def === 'data_miner') return;

  // Quantum observer: charge idle time for extra crit mult
  if (t.def === 'quantum' && hasEffect(s, 'quantum', 'observer')) {
    if (t.cooldown > 0) {
      // Not firing — accumulate charge. Patient gaze: +50% rate. Researcher: +50% cap. Caps: cap raised to 10 (+5.0).
      const chargeRate = hasEffect(s, 'quantum', 'quantum_obs_patient') ? 3 : 2;
      let chargeCap = 6; // +3.0 mult
      if (hasEffect(s, 'quantum', 'quantum_obs_research')) chargeCap = 9;
      if (hasEffect(s, 'quantum', 'quantum_obs_caps')) chargeCap = 10;
      t.extras.observerCharge = Math.min(chargeCap, (t.extras.observerCharge ?? 0) + dt * chargeRate);
    }
  }

  // Railgun capacitor: charge for 8s (6s with COILS, 4s with caps) then auto-fire a 5× (or 7.5× with OVERCAP) mega shot
  if (t.def === 'railgun' && hasEffect(s, 'railgun', 'capacitor')) {
    let chargeWindow = 8;
    if (hasEffect(s, 'railgun', 'railgun_cap_coils')) chargeWindow = 6;
    if (hasEffect(s, 'railgun', 'railgun_cap_caps')) chargeWindow = 4;
    t.extras.chargeTimer = (t.extras.chargeTimer ?? chargeWindow) - dt;
    if (t.extras.chargeTimer <= 0) {
      t.extras.chargeTimer = chargeWindow;
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
        const megaMult = hasEffect(s, 'railgun', 'railgun_cap_overcap') ? 7.5 : 5;
        const megaDmg = effectiveDamage(s, t) * megaMult;
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
  // Cloak-detection: AOE and chain turrets see through the GHOST PROTOCOL
  // runtime cloak and can target cloaked enemies; the hit also reveals them
  // permanently (handled in damageEnemy). Non-detecting turrets skip cloaked
  // enemies entirely. def.invisChance flicker (e.g. the GHOST enemy species)
  // is a separate visual-only gimmick and doesn't block targeting.
  const towerDef = TOWERS[t.def];
  const canDetectCloak = towerDef.damageType === 'aoe' || towerDef.damageType === 'chain';
  let best: EnemyInstance | null = null;
  let bestScore = -Infinity;
  for (const e of s.enemies) {
    if (!e.alive) continue;
    if (e.invisTimer > 0 && !canDetectCloak) continue;
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
  // DECOHERENCE OVERLOAD pity timer: after 5 non-crits in a row, force the
  // next shot to crit. Smooths the RNG spike of ~68% max crit chance so a
  // bad streak can't drag on. Counter tracked in extras; reset on any crit
  // (natural or forced).
  let pityForceCrit = false;
  if (t.def === 'quantum' && hasEffect(s, 'quantum', 'quantum_super_caps')) {
    if ((t.extras.noCritStreak ?? 0) >= 5) pityForceCrit = true;
  }
  // NETLINK antivirus+quantum: ANTIVIRUS gains +15% crit chance when subnet-linked
  if (t.def === 'antivirus' && hasEffect(s, 'antivirus', 'netlink_antivirus_quantum')
      && (hasSubnetLink(s, 'antivirus', 'quantum') || hasEffect(s, 'booster_node', 'booster_res_caps'))) {
    critChance += 0.15;
  }
  // Quantum supercharge: +50% damage on the shot after a crit, then 5s
  // cooldown before the trigger can re-arm. Used to force a guaranteed crit
  // on the follow-up which fed an infinite crit chain (the forced crit re-
  // armed itself in hitEnemy). Switched to a plain damage multiplier with a
  // real cooldown window so the combo is episodic, not endless.
  let superchargeMult = 1;
  if (t.def === 'quantum' && hasEffect(s, 'quantum', 'supercharge') && (t.extras.superchargeReady ?? 0) > 0) {
    superchargeMult = 1.5;
    t.extras.superchargeReady = 0;
    t.extras.superchargeReadyAt = s.elapsed + 5;
  }
  if (critChance > 0 && Math.random() < critChance) isCrit = true;
  // Precision matrix: ANTIVIRUS marks cause quantum guaranteed crit
  if (t.def === 'quantum' && hasEffect(s, 'quantum', 'precision_matrix') && (target.marked ?? 0) > 0) isCrit = true;
  // Pity: DECOHERENCE OVERLOAD forces a crit after 5 non-crits.
  if (pityForceCrit) isCrit = true;
  // Track the streak so the pity timer knows when to fire next time.
  if (t.def === 'quantum' && hasEffect(s, 'quantum', 'quantum_super_caps')) {
    t.extras.noCritStreak = isCrit ? 0 : (t.extras.noCritStreak ?? 0) + 1;
  }

  // Quantum observer: boost crit mult on next shot. Lens (quantum_obs_lens) gives observer-charged shots
  // an additional +30% damage as a clean substitute for "ignore armor" (engine-simpler).
  let critMult = def.crit?.mult ?? 3;
  // DECOHERENCE OVERLOAD: crit mult +1.5 (quantum 3.5 → 5.0). Applied before
  // observer/lens bonuses so it compounds with the OBSERVER branch's charge
  // system — though OBSERVER is a separate branch and keystone-exclusive,
  // this keeps the math clean if a future card blends them.
  if (t.def === 'quantum' && hasEffect(s, 'quantum', 'quantum_super_caps')) {
    critMult += 1.5;
  }
  let observerLensBonus = 1.0;
  if (t.def === 'quantum' && hasEffect(s, 'quantum', 'observer') && (t.extras.observerCharge ?? 0) > 0) {
    critMult += (t.extras.observerCharge ?? 0) * 0.5;
    if (hasEffect(s, 'quantum', 'quantum_obs_lens')) observerLensBonus = 1.30;
    t.extras.observerCharge = 0;
  }
  // FIREWALL HEAT BUILDUP — the new signature mechanic. Consecutive shots on the
  // same target ramp damage up to +50% at a 6-shot streak. Resets the instant
  // the target changes. Gives firewall a "weld onto a threat" feel that
  // antivirus (burst pierce) can't match, fixing the tier-1→tier-2 obsolescence
  // the audit flagged.
  let heatMult = 1;
  if (t.def === 'firewall') {
    if (t.extras.heatTargetId === target.id) {
      t.extras.heatStreak = Math.min(6, (t.extras.heatStreak ?? 1) + 1);
    } else {
      t.extras.heatStreak = 1;
      t.extras.heatTargetId = target.id;
    }
    heatMult = 1 + 0.10 * ((t.extras.heatStreak ?? 1) - 1);
  }
  // FIREWALL FOCUSED FIRE — +15% extra damage when only one enemy is in range
  // (stacks with the unconditional +15% from the same card's bumpDmg for a
  // total of +30% promised by the description). Checked here so the range
  // scan isn't duplicated; re-uses effectiveRange.
  if (t.def === 'firewall' && hasEffect(s, 'firewall', 'firewall_siege_focus')) {
    const range = effectiveRange(s, t);
    let inRange = 0;
    for (const e of s.enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.pos.x - t.grid.x, e.pos.y - t.grid.y) <= range) {
        inRange++;
        if (inRange > 1) break;
      }
    }
    if (inRange === 1) heatMult *= 1.15;
  }
  // ANTIVIRUS EXPLOIT WINDOW — +25% damage vs enemies whose armor has been
  // stripped below their base value (by SCRAMBLER / PULSE / signal-jam etc).
  // Cleanly pairs antivirus with scrambler for a "strip + punish" combo.
  if (t.def === 'antivirus' && hasEffect(s, 'antivirus', 'antivirus_pierce_exploit')) {
    const baseArmor = ENEMIES[target.def].armor ?? 0;
    if (target.armor < baseArmor) heatMult *= 1.25;
  }
  // Port/Protocol exploit bonus — +25% dmg when the turret's exploit matches
  // the target's open port. Pops an EXPLOIT! floater so players can see the
  // pairing working in real time. Table lives in data/ports.ts.
  const portMult = exploitBonus(t.def, target.def);
  const dmg = (isCrit ? baseDmg * critMult : baseDmg) * observerLensBonus * heatMult * portMult * superchargeMult;
  if (portMult > 1 && Math.random() < 0.3) {
    s.floaters.push({
      pos: { x: target.pos.x, y: target.pos.y - 0.4 },
      text: 'EXPLOIT!',
      vy: -30, life: 0.7, maxLife: 0.7,
      color: '#ffd600', size: 12,
    });
  }
  // QUANTUM crit XP netlink: +3 XP per crit when subnet-linked with data_miner
  if (t.def === 'quantum' && isCrit && hasEffect(s, 'quantum', 'netlink_quantum_data_miner')
      && (hasSubnetLink(s, 'quantum', 'data_miner') || hasEffect(s, 'booster_node', 'booster_res_caps'))) {
    grantXp(s, 3);
  }

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
    // STORM TWELVE-FOLD capstone: base jumps to 12 (additive with storm)
    if (hasEffect(s, 'chain', 'chain_strm_caps')) chainJumps = Math.max(chainJumps, 12);
    // Megavolt: every 6th shot has unlimited jumps
    t.extras.shotCount = (t.extras.shotCount ?? 0) + 1;
    if (hasEffect(s, 'chain', 'megavolt') && t.extras.shotCount % 6 === 0) {
      chainJumps = 999;
      chainFalloff = 1.0;
      s.floaters.push({ pos: { x: t.grid.x, y: t.grid.y - 0.8 }, text: 'MEGAVOLT!', vy: -28, life: 1.0, maxLife: 1.0, color: '#ffffff', size: 16 });
    }
  }

  // Projectile speed — RAILGUN hypersonic doubles it; ANTIVIRUS ULTRASONIC
  // SHOT multiplies by 1.6. Default otherwise.
  let projSpeed = def.projectileSpeed;
  if (t.def === 'railgun' && hasEffect(s, 'railgun', 'hypersonic')) projSpeed *= 2;
  if (t.def === 'antivirus' && hasEffect(s, 'antivirus', 'antivirus_pierce_ultra')) projSpeed *= 1.6;

  const proj: Projectile = {
    id: nextId(),
    pos: { x: t.grid.x, y: t.grid.y },
    target: target.id,
    targetPos: { x: target.pos.x, y: target.pos.y },
    damage: dmg,
    speed: projSpeed,
    color: s.chromaColors?.[t.def]?.projectile ?? def.projectileColor,
    trailColor: s.chromaColors?.[t.def]?.trail ?? def.trailColor,
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

  // ARTILLERY TRIPLE BARRAGE capstone: each shot becomes a 3-shell volley with offsets
  if (t.def === 'mine' && hasEffect(s, 'mine', 'mine_brg_caps')) {
    for (let i = 0; i < 2; i++) {
      const ox = (Math.random() - 0.5) * 2;
      const oy = (Math.random() - 0.5) * 2;
      s.projectiles.push({
        ...proj,
        id: nextId(),
        pos: { x: t.grid.x, y: t.grid.y },
        targetPos: { x: target.pos.x + ox, y: target.pos.y + oy },
        target: -1,
        trail: [],
      });
    }
  }

  // Antivirus: fire 2 (or 3 with triple, 5 with VOLLEY capstone) projectiles at nearest enemies
  if (t.def === 'antivirus') {
    const range = effectiveRange(s, t);
    const triple = hasEffect(s, 'antivirus', 'triple');
    const precision = hasEffect(s, 'antivirus', 'precision');
    const precisionBurst = hasEffect(s, 'antivirus', 'precision_burst');
    const pentaVolley = hasEffect(s, 'antivirus', 'antivirus_vol_caps');
    // base extra count: 1 (=2 total), triple = 2 (=3 total), penta = 4 (=5 total)
    const extraCount = pentaVolley ? 4 : (triple ? 2 : 1);
    const extras: EnemyInstance[] = [];
    for (const e of s.enemies) {
      if (!e.alive || e.id === target.id) continue;
      if (Math.hypot(e.pos.x - t.grid.x, e.pos.y - t.grid.y) <= range) extras.push(e);
      if (extras.length >= extraCount) break;
    }
    const shotCount = extraCount;
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
  let markedPct = (hasEffect(s, 'firewall', 'hunter_instinct') && p.fromTower === 'firewall') ? 0.45 : 0.3;
  // Antivirus MARK capstone: marked enemies take +75% (was +30%) when antivirus is the source
  if (p.fromTower === 'antivirus' && hasEffect(s, 'antivirus', 'antivirus_mark_caps')) markedPct = Math.max(markedPct, 0.75);
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

  // Scrambler: reduce armor (dec branch). DEC capstone strips 12, dec_hack +2, deep_scan 6 base
  if (p.fromTower === 'scrambler') {
    let stripAmount = hasEffect(s, 'scrambler', 'deep_scan') ? 6 : 3;
    if (hasEffect(s, 'scrambler', 'deep_hack')) stripAmount += 2;
    if (hasEffect(s, 'scrambler', 'scrambler_dec_caps')) stripAmount = 12;
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
    // Overwrite: 20% chance to zero armor (35% with CRS BOOST)
    {
      const owChance = hasEffect(s, 'scrambler', 'scrambler_crs_boost') ? 0.35 : 0.20;
      if (hasEffect(s, 'scrambler', 'overwrite') && Math.random() < owChance) {
        target.armor = 0;
        s.floaters.push({ pos: { x: target.pos.x, y: target.pos.y - 0.4 }, text: 'OVERWRITE!', vy: -22, life: 1.0, maxLife: 1.0, color: '#ff2d95', size: 14 });
        // System crash: mark enemy at 0 armor
        if (hasEffect(s, 'scrambler', 'system_crash')) {
          target.marked = Math.max(target.marked ?? 0, 3);
        }
      }
    }
    // CRASH KERNEL PANIC capstone: every 5th DISRUPTOR hit fully nullifies (0 armor + 50% slow 3s + mark)
    {
      const sc = s.towers.find((tw) => tw.def === 'scrambler');
      if (sc && hasEffect(s, 'scrambler', 'scrambler_crs_caps')) {
        sc.extras.crashCounter = ((sc.extras.crashCounter ?? 0) + 1);
        if (sc.extras.crashCounter % 5 === 0) {
          target.armor = 0;
          target.marked = Math.max(target.marked ?? 0, 3);
          if (!ENEMIES[target.def].slowImmune) {
            target.speedMult = Math.min(target.speedMult, 0.5);
            target.slowTimer = Math.max(target.slowTimer, 3);
          }
          s.floaters.push({ pos: { x: target.pos.x, y: target.pos.y - 0.4 }, text: 'KERNEL PANIC', vy: -28, life: 1.2, maxLife: 1.2, color: '#ff2d95', size: 16 });
        }
      }
    }
    // SABOTAGE TOTAL capstone: debuffed enemies (armor stripped) take 2× from all sources
    if (hasEffect(s, 'scrambler', 'scrambler_sab_caps') && target.armor < (ENEMIES[target.def].armor ?? 0)) {
      // Mark them so the universal markedBonus doubles damage. Use mark with bonus override later.
      target.marked = Math.max(target.marked ?? 0, 1.0);
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

  // Antivirus PIERCE branch: armor strip family
  if (p.fromTower === 'antivirus') {
    // antivirus_pierce_deep keystone: strips 6 armor on hit (one-shot, like scrambler)
    if (hasEffect(s, 'antivirus', 'antivirus_pierce_deep')) {
      target.armor = Math.max(0, target.armor - 6);
    }
    // antivirus_pierce_melt: permanent strip 1 armor per shot (no restoration via collapseTimer)
    if (hasEffect(s, 'antivirus', 'antivirus_pierce_melt')) {
      target.armor = Math.max(0, target.armor - 1);
      // Mutate enemy def's stored armor so it never restores from collapse — emulate via collapseTimer trick
      // We can't mutate ENEMIES[def].armor (shared), so just ensure collapseTimer doesn't restore by leaving it 0
    }
    // antivirus_pierce_caps capstone: cracks 5 armor permanently per hit
    if (hasEffect(s, 'antivirus', 'antivirus_pierce_caps')) {
      target.armor = Math.max(0, target.armor - 5);
    }
  }

  // NETLINK antivirus+quantum: ANTIVIRUS shots gain +15% crit chance — applied at fire-time, but here we re-roll
  // Implemented at fire() instead.

  // Precision matrix synergy: ANTIVIRUS marks cause QUANTUM guaranteed crit (flag only — checked in fire())
  // Viral mark: when marked enemy dies, spread mark to 2 nearby (handled in killEnemy)

  // Firewall tracer: mark target
  if (p.fromTower === 'firewall' && hasEffect(s, 'firewall', 'tracer')) {
    const tracerDur = hasEffect(s, 'firewall', 'hunter_instinct') ? 4 : 2;
    target.marked = Math.max(target.marked ?? 0, tracerDur);
  }

  // Firewall suppressor: slow on hit (20%, or 35% with chill cascade)
  if (p.fromTower === 'firewall' && hasEffect(s, 'firewall', 'suppressor') && !ENEMIES[target.def].slowImmune) {
    const slowAmt = hasEffect(s, 'firewall', 'firewall_sup_chill') ? 0.35 : 0.20;
    target.speedMult = Math.min(target.speedMult, 1 - slowAmt);
    target.slowTimer = Math.max(target.slowTimer, 1.2);
  }

  // Firewall SUPPRESSION capstone: crits fully stop enemies for 0.4s
  if (p.fromTower === 'firewall' && p.isCrit && hasEffect(s, 'firewall', 'firewall_sup_caps') && !ENEMIES[target.def].slowImmune) {
    target.speedMult = 0;
    target.slowTimer = Math.max(target.slowTimer, 0.4);
  }

  // Firewall SIEGE: armor crusher (2× to enemies above 75% HP) + obliterate capstone (extra 2× HP%)
  if (p.fromTower === 'firewall' && target.alive && target.hp / target.maxHp > 0.75) {
    if (hasEffect(s, 'firewall', 'firewall_siege_crusher')) {
      damageEnemy(s, target, p.damage * markedBonus, p.isCrit ?? false, p.damageType, true, 'firewall');
    }
    if (hasEffect(s, 'firewall', 'firewall_siege_caps')) {
      // 2× HP% damage = 2× of 1% maxHp per shot bonus, scaled to feel meaningful
      const bonus = target.maxHp * 0.04; // 4% maxHp bonus dmg vs high-HP targets
      damageEnemy(s, target, bonus, p.isCrit ?? false, p.damageType, true, 'firewall');
    }
  }

  // NETLINK firewall+honeypot: FIREWALL shots inherit 20% slow 1.2s
  if (p.fromTower === 'firewall' && hasEffect(s, 'firewall', 'netlink_firewall_honeypot')
      && (hasSubnetLink(s, 'firewall', 'honeypot') || hasEffect(s, 'booster_node', 'booster_res_caps'))
      && !ENEMIES[target.def].slowImmune) {
    target.speedMult = Math.min(target.speedMult, 0.80);
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

  // Sniper callout: mark target. PERSISTENT MARK +50% duration. BRAND OF DEATH = effectively forever (999).
  if (p.fromTower === 'sniper' && hasEffect(s, 'sniper', 'callout')) {
    let dur = hasEffect(s, 'sniper', 'surgical') ? 6 : 3;
    if (hasEffect(s, 'sniper', 'sniper_mks_persist')) dur *= 1.5;
    if (hasEffect(s, 'sniper', 'sniper_mks_caps')) dur = 999;
    target.marked = Math.max(target.marked ?? 0, dur);
  }

  // Sniper overwatch_pen: +100% to marked
  if (p.fromTower === 'sniper' && hasEffect(s, 'sniper', 'overwatch_pen') && (target.marked ?? 0) > 0) {
    damageEnemy(s, target, p.damage, p.isCrit ?? false, p.damageType, false, 'sniper'); // deal extra 100%
  }

  // Sniper execute: triple damage below 25% HP (deadeye 35%, EXECUTIONER'S MARK capstone 50%)
  if (p.fromTower === 'sniper' && hasEffect(s, 'sniper', 'execute')) {
    let execThresh = hasEffect(s, 'sniper', 'deadeye') ? 0.35 : 0.25;
    if (hasEffect(s, 'sniper', 'sniper_exe_caps')) execThresh = Math.max(execThresh, 0.50);
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
  // COLLAPSE capstone: permanent — don't set timer so armor never restores.
  if (p.fromTower === 'quantum' && hasEffect(s, 'quantum', 'collapse')) {
    target.armor = Math.max(0, target.armor * 0.5);
    if (!hasEffect(s, 'quantum', 'quantum_col_caps')) target.collapseTimer = 1.5;
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
  // RAILGUN HYPERSONIC capstone: each kill refunds 1.5s cooldown
  if (p.fromTower === 'railgun' && hasEffect(s, 'railgun', 'railgun_hyp_caps') && !target.alive) {
    const rl = s.towers.find((tw) => tw.def === 'railgun');
    if (rl) rl.cooldown = Math.max(0, rl.cooldown - 1.5);
  }
  // NETLINK railgun+sniper: crits refund 30% of cooldown
  if (p.fromTower === 'railgun' && p.isCrit && hasEffect(s, 'railgun', 'netlink_railgun_sniper')
      && (hasSubnetLink(s, 'railgun', 'sniper') || hasEffect(s, 'booster_node', 'booster_res_caps'))) {
    const rl = s.towers.find((tw) => tw.def === 'railgun');
    if (rl) rl.cooldown = Math.max(0, rl.cooldown * 0.7);
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
    // Base 0.4; VISCOUS bumps to 0.55; SOLID GOO overrides to 0.7 (wins over viscous).
    let slowPct = hasEffect(s, 'honeypot', 'viscous') ? 0.55 : 0.4;
    if (hasEffect(s, 'honeypot', 'honeypot_con_solid')) slowPct = 0.7;
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
    // BOSS FREEZE capstone: freeze slow-immune bosses for 0.6s (overrides slowImmune for ice once)
    if (hasEffect(s, 'ice', 'ice_frz_caps') && ENEMIES[target.def].slowImmune) {
      target.speedMult = 0;
      target.slowTimer = Math.max(target.slowTimer, 0.6);
    }
    // FROST CORE: +25% damage to slowed enemies
    if (hasEffect(s, 'ice', 'ice_frz_core') && target.speedMult < 1 && target.alive) {
      damageEnemy(s, target, p.damage * 0.25, p.isCrit ?? false, p.damageType, true, 'ice');
    }
    if (hasEffect(s, 'ice', 'shards') && p.aoe) {
      let shardDps = hasEffect(s, 'ice', 'cryo_nova') ? 8 : undefined;
      // SHARP SHARDS: dps doubled
      if (hasEffect(s, 'ice', 'ice_shr_sharp')) shardDps = (shardDps ?? 8) * 2;
      // OCTAGONAL SHARDS capstone: 8 shards instead of 6
      const shardCount = hasEffect(s, 'ice', 'ice_shr_caps') ? 8 : 6;
      // SHARD ECHO: shard fields last 50% longer
      const shardLife = hasEffect(s, 'ice', 'ice_shr_echo') ? 3.0 : 2.0;
      for (let i = 0; i < shardCount; i++) {
        const a = (i / shardCount) * Math.PI * 2;
        s.puddles.push({ pos: { x: p.pos.x + Math.cos(a) * p.aoe * 0.8, y: p.pos.y + Math.sin(a) * p.aoe * 0.8 }, radius: 0.4, timeLeft: shardLife, maxTime: shardLife, slowPct: 0.35, slowDuration: 0.5, color: '#88eeff', damagePerSec: shardDps, fromTower: 'ice' });
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
    // ICE BLIZZARD capstone: explosions chain to a nearby enemy for 60% damage
    if (hasEffect(s, 'ice', 'ice_blz_caps') && p.aoe && target.alive) {
      const next = findChainTarget(s, target, new Set([target.id]), 2.5);
      if (next) damageEnemy(s, next, p.damage * 0.6, p.isCrit ?? false, p.damageType, false, 'ice');
    }
    // NETLINK ice+scrambler: ICE explosions strip 2 armor
    if (hasEffect(s, 'ice', 'netlink_ice_scrambler')
        && (hasSubnetLink(s, 'ice', 'scrambler') || hasEffect(s, 'booster_node', 'booster_res_caps'))) {
      target.armor = Math.max(0, target.armor - 2);
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
    // WIDE SABOT capstone: explosion radius 1.5 cells (was 0.7)
    const sabotRad = hasEffect(s, 'railgun', 'railgun_sab_caps') ? 1.5 : 0.7;
    spawnExplosion(s, { x: p.pos.x, y: p.pos.y }, '#e0f0ff', sabotRad);
    for (const e of s.enemies) {
      if (!e.alive || e.id === target.id) continue;
      if (Math.hypot(e.pos.x - p.pos.x, e.pos.y - p.pos.y) <= sabotRad) {
        damageEnemy(s, e, p.damage * sabotMult, false, p.damageType, false, 'railgun');
      }
    }
  }

  // Railgun shockwave
  if (p.fromTower === 'railgun' && hasEffect(s, 'railgun', 'shockwave') && !ENEMIES[target.def].slowImmune) {
    target.speedMult = Math.min(target.speedMult, 0.3);
    target.slowTimer = Math.max(target.slowTimer, 1.5);
  }

  // Quantum supercharge: arm +50% next-shot damage on crit, respecting the
  // 5s cooldown. superchargeReadyAt is an s.elapsed timestamp set when the
  // bonus is CONSUMED in fire(), so re-arming is blocked until it passes.
  if (p.fromTower === 'quantum' && p.isCrit && hasEffect(s, 'quantum', 'supercharge')) {
    const qmTower = s.towers.find((tw) => tw.def === 'quantum');
    if (qmTower && s.elapsed >= (qmTower.extras.superchargeReadyAt ?? 0)) {
      qmTower.extras.superchargeReady = 1;
    }
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
    // Nanobots: acid puddle on impact (proc chance / dps / duration / radius can all be boosted by SCORCH branch)
    {
      const baseChance = hasEffect(s, 'mine', 'mine_scr_targeting') ? 1.0 : 0.35;
      const procDps = hasEffect(s, 'mine', 'mine_scr_phos') ? 24 : 12;
      const procDur = hasEffect(s, 'mine', 'mine_scr_burn') ? 6 : 3;
      const procRad = hasEffect(s, 'mine', 'mine_scr_wide') ? 1.5 : 1.0;
      if (hasEffect(s, 'mine', 'nanobots') && Math.random() < baseChance && s.puddles.length < 100) {
        s.puddles.push({ pos: { x: p.pos.x, y: p.pos.y }, radius: procRad, timeLeft: procDur, maxTime: procDur, slowPct: 0, slowDuration: 0, damagePerSec: procDps, color: '#88ff00', fromTower: 'mine' });
      }
    }
    // INFERNO ZONE capstone: every impact leaves 5s 30dps zone (independent, large)
    if (hasEffect(s, 'mine', 'mine_scr_caps') && s.puddles.length < 100) {
      s.puddles.push({ pos: { x: p.pos.x, y: p.pos.y }, radius: 1.6, timeLeft: 5, maxTime: 5, slowPct: 0, slowDuration: 0, damagePerSec: 30, color: '#ff6b00', fromTower: 'mine' });
    }
    // NETLINK mine+honeypot: artillery impacts in honeypot puddles burn 15 dps for 3s
    if (hasEffect(s, 'mine', 'netlink_mine_honeypot')
        && (hasSubnetLink(s, 'mine', 'honeypot') || hasEffect(s, 'booster_node', 'booster_res_caps'))) {
      const inHoneyPuddle = s.puddles.some((pu) => pu.fromTower === 'honeypot' &&
        Math.hypot(p.pos.x - pu.pos.x, p.pos.y - pu.pos.y) <= pu.radius);
      if (inHoneyPuddle && s.puddles.length < 100) {
        s.puddles.push({ pos: { x: p.pos.x, y: p.pos.y }, radius: 1.0, timeLeft: 3, maxTime: 3, slowPct: 0, slowDuration: 0, damagePerSec: 15, color: '#ff8800', fromTower: 'mine' });
      }
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
      // Digital-snap: tiny stutter on each arc, capped so it can't stack louder than other events.
      s.shakeTime = Math.max(s.shakeTime, 0.06);
      s.shakeAmp = Math.max(s.shakeAmp, 3);
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
    let stunDur = 0.35;
    if (hasEffect(s, 'chain', 'chain_grd_spike')) stunDur += 0.25;
    if (hasEffect(s, 'chain', 'chain_grd_caps')) stunDur = Math.max(stunDur, 0.8);
    target.speedMult = 0;
    target.slowTimer = Math.max(target.slowTimer, stunDur);
  }
  // CHAIN GROUND STRESS: stunned enemies take +25% from CHAIN
  if (p.fromTower === 'chain' && hasEffect(s, 'chain', 'chain_grd_stress') && target.speedMult === 0 && target.alive) {
    damageEnemy(s, target, p.damage * 0.25, p.isCrit ?? false, p.damageType, true, 'chain');
  }
  // NETLINK chain+sentinel: arcs +20% to enemies in SENTINEL field
  if (p.fromTower === 'chain' && hasEffect(s, 'chain', 'netlink_chain_sentinel')
      && (hasSubnetLink(s, 'chain', 'sentinel') || hasEffect(s, 'booster_node', 'booster_res_caps'))
      && target.alive) {
    const sentT = s.towers.find((tw) => tw.def === 'sentinel');
    if (sentT) {
      const r = effectiveRange(s, sentT) + (hasEffect(s, 'sentinel', 'expanded') ? 0.8 : 0)
        + (hasEffect(s, 'sentinel', 'node_broadcast') ? 0.5 : 0);
      if (Math.hypot(target.pos.x - sentT.grid.x, target.pos.y - sentT.grid.y) <= r) {
        damageEnemy(s, target, p.damage * 0.20, p.isCrit ?? false, p.damageType, true, 'chain');
      }
    }
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
  // VOIDLORD phase shift — current immune type nullifies damage of that type entirely.
  // Crits do NOT bypass phase-shift immunity (unlike normal resistances) because the
  // whole point of the mechanic is to force the player to swap damage types.
  if (e.phaseShiftType && e.phaseShiftType === type) return 0;
  const resist = def.resistances?.[type];
  let final = raw;
  if (resist != null && !(isCrit && def.critIgnoresResist)) {
    final *= resist;
  }
  final = Math.max(0, final - (e.armor || 0) * (type === 'pierce' ? 0.2 : 1));
  return final;
}

export function damageEnemy(s: RunState, e: EnemyInstance, dmg: number, isCrit: boolean, type: DamageType, silent = false, source?: TowerId): number {
  // AOE / chain damage reveals cloaked enemies — permanent reveal once hit.
  // Mirrors the GHOST enemy counterTip ("AOE reveals them") and is the primary
  // counterplay to the GHOST PROTOCOL sector modifier and daily mutator.
  if (e.invisTimer > 0 && (type === 'aoe' || type === 'chain')) {
    e.invisTimer = 0;
    s.floaters.push({
      pos: { x: e.pos.x, y: e.pos.y - 0.4 },
      text: 'REVEALED',
      vy: -22, life: 0.8, maxLife: 0.8,
      color: '#00fff0', size: 12,
    });
  }
  // Brittle coating: slowed/frozen enemies take +15% from all sources
  const brittleMult = (hasEffect(s, 'ice', 'brittle') && e.speedMult < 1) ? 1.15 : 1.0;
  // DECRYPT NODE aura — +% damage from all sources to enemies in range.
  // Singleton rule keeps this cheap; most runs have either 1 decrypt or none.
  let decryptMult = 1.0;
  let decryptBonusArmor = 0;
  const decrypt = s.towers.find((tw) => tw.def === 'data_miner');
  let inAura = false;
  if (decrypt) {
    const rng = TOWERS.data_miner.range
      + (hasEffect(s, 'data_miner', 'dataminer_thr_1') ? 0.5 : 0)
      + (hasEffect(s, 'data_miner', 'dataminer_eco_1') ? 0.5 : 0);
    const dist = Math.hypot(e.pos.x - decrypt.grid.x, e.pos.y - decrypt.grid.y);
    const global = hasEffect(s, 'data_miner', 'dataminer_thr_caps');
    // EXPOSE capstone: while a boss is alive, every enemy is considered in-aura.
    const fullExposure = hasEffect(s, 'data_miner', 'dataminer_eco_caps')
      && s.enemies.some((ee) => ee.alive && ee.isBoss);
    inAura = global || fullExposure || dist <= rng;
    if (inAura) {
      // BREACH branch — raw amplification stack.
      if (hasEffect(s, 'data_miner', 'dataminer_thr_key')) {
        let amp = 0.15;
        if (hasEffect(s, 'data_miner', 'throughput')) amp += 0.05;
        if (hasEffect(s, 'data_miner', 'recursive')) amp += 0.10;
        if (hasEffect(s, 'data_miner', 'uplink')) amp += 0.05;
        if (hasEffect(s, 'data_miner', 'dataminer_thr_amp')) amp += 0.05;
        decryptMult = 1 + amp;
      } else if (hasEffect(s, 'data_miner', 'dataminer_eco_key')) {
        // EXPOSE branch — mark-style bonus, separate scale.
        decryptMult = hasEffect(s, 'data_miner', 'dataminer_eco_deep') ? 1.45 : 1.30;
        if (hasEffect(s, 'data_miner', 'dataminer_eco_armor')) decryptBonusArmor = 3;
      } else {
        // No branch committed yet — base 15% aura.
        decryptMult = 1.15;
      }
      // CORRUPT capstone — bosses take 2× aura amp.
      if (e.isBoss && hasEffect(s, 'data_miner', 'dataminer_mta_caps')) {
        decryptMult = 1 + (decryptMult - 1) * 2;
      }
    }
  }
  const effectiveArmor = e.armor;
  if (decryptBonusArmor > 0) e.armor = Math.max(0, e.armor - decryptBonusArmor);
  let final = applyResistanceAndArmor(e, dmg * brittleMult * decryptMult, type, isCrit);
  if (decryptBonusArmor > 0) e.armor = effectiveArmor;
  if (final <= 0) {
    if (!silent) s.floaters.push({ pos: { x: e.pos.x, y: e.pos.y - 0.4 }, text: 'IMMUNE', vy: -18, life: 0.8, maxLife: 0.8, color: '#6b8090', size: 12 });
    e.hitFlash = 0.12;
    return 0;
  }
  // ENCRYPTED PAYLOADS sector modifier: shield absorbs damage before HP. Reset regen timer on hit.
  if ((e.shield ?? 0) > 0) {
    e.shieldRegenTimer = 0;
    const absorbed = Math.min(e.shield!, final);
    e.shield = e.shield! - absorbed;
    final -= absorbed;
    // CRACKED EXPOSURE: when the shield just broke, expose the enemy for 3s.
    // Bonus damage applies to the overflow of this same shot and every hit
    // until the shield regenerates past 0 and cracks again.
    if (e.shield === 0 && (e.maxShield ?? 0) > 0) {
      e.crackedTimer = 3;
      if (!silent) s.floaters.push({
        pos: { x: e.pos.x, y: e.pos.y - 0.4 },
        text: 'EXPOSED!', vy: -18, life: 1, maxLife: 1,
        color: '#88e8ff', size: 14,
      });
    }
    if (final <= 0) {
      if (!silent) e.hitFlash = isCrit ? 0.25 : 0.18;
      if (source) s.damageDealt[source] = (s.damageDealt[source] ?? 0) + absorbed;
      return absorbed;
    }
  }
  // CRACKED EXPOSURE: +25% damage on HP while exposed.
  if ((e.crackedTimer ?? 0) > 0) {
    final *= 1.25;
  }
  const hpBefore = e.hp;
  e.hp -= final;
  // Silent hits are DoT ticks (honeypot puddle, sentinel aura, decrypt CORRUPT).
  // Keeping hitFlash pinned at 0.18 every frame meant the sprite was permanently
  // white-tinted while standing in any damage field — unreadable. Only flash
  // for explicit projectile / explosion hits.
  if (!silent) e.hitFlash = isCrit ? 0.25 : 0.18;
  // LEVIATHAN regen gating: every incoming damage resets the "undamaged"
  // timer so sustained DPS denies healing but a lull lets it claw HP back.
  if (e.def === 'leviathan') e.regenCooldown = 0;
  // WRAITH — below-60% teleport. When first dipped under 60% HP, jump forward
  // along the path. One-shot via bossTriggered flag. Telegraphed with a JUMP
  // floater so players see the displacement, not just a surprise warp.
  if (e.def === 'wraith' && !e.bossTriggered && hpBefore / e.maxHp >= 0.6 && e.hp / e.maxHp < 0.6) {
    e.bossTriggered = true;
    const path = getMap(s.mapId).paths[e.pathIndex] ?? getMap(s.mapId).paths[0];
    const totalLen = pathLength(path);
    const jumpDist = 0.6;
    const newProgress = Math.min(totalLen - 0.1, e.progress + jumpDist);
    e.progress = newProgress;
    const pos = posOnPath(path, newProgress);
    e.pos.x = pos.x;
    e.pos.y = pos.y;
    s.floaters.push({
      pos: { x: e.pos.x, y: e.pos.y - 0.7 },
      text: 'PHASE JUMP',
      vy: -18, life: 1.2, maxLife: 1.2,
      color: '#ff2d95', size: 16,
    });
  }

  // DAEMON 50%-HP trigger: spawn 3 worms at its position and telegraph with a
  // floater. One-shot via bossTriggered flag so it fires exactly once.
  if (e.def === 'daemon' && !e.bossTriggered && hpBefore / e.maxHp >= 0.5 && e.hp / e.maxHp < 0.5) {
    e.bossTriggered = true;
    for (let i = 0; i < 3; i++) spawnWormAt(s, e.pos, e.pathIndex, e.progress);
    s.floaters.push({
      pos: { x: e.pos.x, y: e.pos.y - 0.8 },
      text: 'SPAWN BROOD',
      vy: -20, life: 1.6, maxLife: 1.6,
      color: '#ff2d95', size: 18,
    });
  }
  // KERNEL multi-phase boss. Previously a pure HP sponge — now it PANICS at 66%
  // (jam closest 2 towers 3s + spawn 3 worms) and ENRAGES at 33% (perm +35%
  // speed, spawn 3 spiders, jam closest 3 towers 2s). Uses a numeric phase
  // counter since bossTriggered can only gate one threshold.
  if (e.def === 'kernel') {
    const phase = e.bossPhase ?? 0;
    if (phase < 1 && hpBefore / e.maxHp >= 0.66 && e.hp / e.maxHp < 0.66) {
      e.bossPhase = 1;
      for (let i = 0; i < 3; i++) spawnWormAt(s, e.pos, e.pathIndex, e.progress);
      applyAreaDebuffToClosest(s, e.pos, 4.0, 'jammed', 3, 2, e);
      s.floaters.push({
        pos: { x: e.pos.x, y: e.pos.y - 0.8 },
        text: 'KERNEL PANIC',
        vy: -18, life: 1.8, maxLife: 1.8,
        color: '#ffd600', size: 20,
      });
      s.shakeTime = Math.max(s.shakeTime, 0.25);
      s.shakeAmp = Math.max(s.shakeAmp, 6);
    }
    if (phase < 2 && hpBefore / e.maxHp >= 0.33 && e.hp / e.maxHp < 0.33) {
      e.bossPhase = 2;
      e.enraged = true;
      e.speedMult = Math.max(e.speedMult, 1.35);
      for (let i = 0; i < 3; i++) spawnWormAt(s, e.pos, e.pathIndex, e.progress);
      applyAreaDebuffToClosest(s, e.pos, 4.5, 'jammed', 2, 3, e);
      s.floaters.push({
        pos: { x: e.pos.x, y: e.pos.y - 0.9 },
        text: 'CORE DUMP // ENRAGED',
        vy: -16, life: 2.2, maxLife: 2.2,
        color: '#ff6600', size: 22,
      });
      s.shakeTime = Math.max(s.shakeTime, 0.4);
      s.shakeAmp = Math.max(s.shakeAmp, 9);
    }
  }
  if (source) s.damageDealt[source] = (s.damageDealt[source] ?? 0) + final;
  // Damage number floater with physics — only for non-silent hits over 1 dmg
  // so DoT tick spam doesn't flood the screen. Crits are larger, yellow, and
  // tagged so the renderer can draw them with extra weight.
  if (!silent && final >= 1) {
    spawnDamageNumber(s, e.pos.x, e.pos.y - 0.3, Math.round(final), isCrit);
  }
  if (e.hp <= 0) killEnemy(s, e);
  return final;
}

function spawnDamageNumber(s: RunState, x: number, y: number, dmg: number, isCrit: boolean): void {
  // Initial velocity from research: vy -60 to -90 px/s upward, vx ±40 px/s lateral,
  // gravity 180 px/s². The renderer multiplies pos by 0.01 for world-units mapping,
  // so these numbers are large — they get normalized at draw time.
  const vy = -60 - Math.random() * 30;
  const vx = (Math.random() - 0.5) * 80;
  s.floaters.push({
    pos: { x, y },
    text: String(dmg),
    vy, vx,
    gravity: 180,
    life: 0.7,
    maxLife: 0.7,
    color: isCrit ? '#ffd600' : '#ffffff',
    outline: isCrit ? '#ff6600' : '#000000',
    size: isCrit ? 22 : 14,
    isCrit,
  });
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
  // Tiered hit-pause on kill for perceived weight. Stacks max (not sum) so a
  // boss-kill freeze isn't shortened by an adjacent normal kill. Boss kills
  // also add the bigger shake further down, so the pause reads as ceremony.
  const pauseDur = e.isBoss ? 0.20 : (def.threat === 'HIGH' || def.threat === 'EXTREME') ? 0.08 : 0.03;
  s.hitPause = Math.max(s.hitPause, pauseDur);
  // Kill-shake by tier — max-stack so boss kills keep their ceremony even if a
  // normal kill lands in the same frame.
  if (e.isBoss) {
    s.shakeTime = Math.max(s.shakeTime, 0.45);
    s.shakeAmp = Math.max(s.shakeAmp, 10);
  } else if (def.threat === 'HIGH' || def.threat === 'EXTREME') {
    s.shakeTime = Math.max(s.shakeTime, 0.18);
    s.shakeAmp = Math.max(s.shakeAmp, 5);
  } else {
    s.shakeTime = Math.max(s.shakeTime, 0.10);
    s.shakeAmp = Math.max(s.shakeAmp, 3);
  }
  if (e.isBoss) {
    s.protocolsEarned += 5;
    s.floaters.push({ pos: { x: e.pos.x, y: e.pos.y - 0.8 }, text: '+5 \u2b22 PROTOCOL', vy: -35, life: 1.8, maxLife: 1.8, color: '#ffd600', size: 20 });
    // Expanding ring of pixel squares in the enemy's color.
    spawnPulseRing(s, e.pos, ENEMIES[e.def].color, 4);
  }

  // Packet-drop roll — 8% of non-boss kills drop a collectible buff packet.
  // Bosses always drop one (unmissable ceremony). Kind is random from the pool.
  const dropRoll = e.isBoss ? 1.0 : 0.08;
  if (Math.random() < dropRoll) {
    const kinds: ('dmg' | 'rate' | 'xp' | 'hp')[] = ['dmg', 'rate', 'xp', 'hp'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    s.packets.push({
      id: nextId(),
      pos: { x: e.pos.x, y: e.pos.y },
      kind,
      timeLeft: 5,
      maxTime: 5,
    });
  }

  // REPLICATION VIRUS sector modifier: chance dead enemies spawn an offspring at their location.
  // Skip if this enemy is already a split-spawn (debuffTimer === -999) to avoid runaway chains.
  const repChance = getEffectiveModifiers(s).replication ?? 0;
  if (repChance > 0 && e.debuffTimer !== -999 && !e.isBoss && Math.random() < repChance) {
    spawnWormAt(s, e.pos, e.pathIndex, e.progress);
  }

  // Glitch: splits into 2 worms on death
  if (e.def === 'glitch' && !(e.debuffTimer === -999)) {
    e.debuffTimer = -999; // prevent infinite loop
    for (let i = 0; i < 2; i++) {
      spawnWormAt(s, e.pos, e.pathIndex, e.progress);
    }
    s.floaters.push({ pos: { x: e.pos.x, y: e.pos.y - 0.4 }, text: 'SPLIT!', vy: -22, life: 0.8, maxLife: 0.8, color: '#00ffcc', size: 14 });
  }

  // Phantom death: EMP burst jams the 2 closest towers for 1.5s. Was 3s
  // jam on every tower within 3.5 tiles — a subnet cluster would go dark
  // for 3 whole seconds on a single kill.
  if (e.def === 'phantom') {
    applyAreaDebuffToClosest(s, e.pos, 2.5, 'jammed', 1.5, 2, e);
  }

  // Honeypot detonation: death inside puddle explodes
  if (hasEffect(s, 'honeypot', 'detonation')) {
    // OVERPRESSURE capstone multiplies detonation damage by 1.6x.
    const detonationDmg = 80 * (hasEffect(s, 'honeypot', 'honeypot_vol_over') ? 1.6 : 1);
    for (const pu of s.puddles) {
      if (Math.hypot(e.pos.x - pu.pos.x, e.pos.y - pu.pos.y) <= pu.radius) {
        spawnExplosion(s, e.pos, '#ffd600', pu.radius);
        for (const other of s.enemies) {
          if (!other.alive) continue;
          if (Math.hypot(other.pos.x - e.pos.x, other.pos.y - e.pos.y) <= pu.radius * 1.5) {
            damageEnemy(s, other, detonationDmg, false, 'aoe', false, 'honeypot');
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
  // Bias spawn onto the 0.1-cell grid so particles line up with the pixel-art grid.
  const sx = Math.round(pos.x * 10) / 10;
  const sy = Math.round(pos.y * 10) / 10;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 2 + Math.random() * 4;
    s.particles.push({
      pos: { x: sx, y: sy },
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
export function spawnPulseRing(s: RunState, pos: Vec2, color: string, radius: number): void {
  if (s.particles.length >= MAX_PARTICLES) return;
  const count = Math.min(24, MAX_PARTICLES - s.particles.length);
  const sx = Math.round(pos.x * 10) / 10;
  const sy = Math.round(pos.y * 10) / 10;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const spd = radius * 3; // expand outward to fill radius over ~0.5s
    s.particles.push({
      pos: { x: sx, y: sy },
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
  const sx = Math.round(pos.x * 10) / 10;
  const sy = Math.round(pos.y * 10) / 10;
  for (let i = 0; i < capped; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 1.5 + Math.random() * 3.5;
    s.particles.push({
      pos: { x: sx, y: sy },
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
    recoil: 0,
    targetMode: defaultTargetMode(defId),
    debuffs: [],
    debuffCooldowns: {},
    extras: {},
  };
  s.towers.push(t);
  computeSubnets(s);
  audio.play('place');
  haptics.fire('tower_placed');
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
