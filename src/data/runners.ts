import type { TowerId } from '@/types';

// ─── RUNNERS ────────────────────────────────────────────────────────────────
// A "runner" is the player's persona for a run. Each reshuffles the build in
// broad strokes: passive damage/crit/hp/econ buffs, optional per-wave sustain,
// and one banned tower to force composition diversity. Picking a runner is
// the highest-leverage per-run identity knob — effectively a weapon/class
// slot in a roguelike.
//
// v2: bonusStartingTokens removed — the singleton-per-run rule meant duplicate
// tokens (run-default + runner bonus) were literally unusable. Runners now
// express identity through passives only.

export type RunnerId = 'glitch' | 'warden' | 'architect';

export interface RunnerDef {
  id: RunnerId;
  name: string;
  role: string;
  flavor: string;
  color: string;
  passiveDamagePct: number;      // added to run.mods.globalDamagePct
  passiveRatePct: number;        // added to run.mods.globalRatePct
  passiveCritPct: number;        // added to run.mods.globalCritChance
  bonusStartingHp: number;       // added to run.hp/maxHp
  bonusHpRegenPerWave: number;   // added to mods via hpRegenPerWave channel
  bonusStartingLevels: number;   // queued pendingLevelUps on run start
  bannedTower: TowerId;          // added to lockedTurrets at run start
  bannedDesc: string;
}

export const RUNNERS: Record<RunnerId, RunnerDef> = {
  glitch: {
    id: 'glitch',
    name: 'GLITCH',
    role: 'OFFENSE',
    flavor: 'Pushes turrets past spec. Nothing survives the uptime.',
    color: '#ff2d95',
    passiveDamagePct: 0.15,
    passiveRatePct: 0,
    passiveCritPct: 0.08,
    bonusStartingHp: 0,
    bonusHpRegenPerWave: 0,
    bonusStartingLevels: 0,
    bannedTower: 'booster_node',
    bannedDesc: 'Runs raw DPS — no buff fields. BOOSTER NODE locked.',
  },
  warden: {
    id: 'warden',
    name: 'WARDEN',
    role: 'DEFENSE',
    flavor: 'Trades glass cannons for rock-solid sustain.',
    color: '#00ff88',
    passiveDamagePct: 0,
    passiveRatePct: 0,
    passiveCritPct: 0,
    bonusStartingHp: 5,
    bonusHpRegenPerWave: 1,
    bonusStartingLevels: 0,
    bannedTower: 'railgun',
    bannedDesc: 'Favors control over burst. RAILGUN locked.',
  },
  architect: {
    id: 'architect',
    name: 'ARCHITECT',
    role: 'ECONOMY',
    flavor: 'Cards in hand, eddies in bank. Wins through tempo.',
    color: '#00fff0',
    passiveDamagePct: 0,
    passiveRatePct: 0.10,
    passiveCritPct: 0,
    bonusStartingHp: 0,
    bonusHpRegenPerWave: 0,
    bonusStartingLevels: 1,
    bannedTower: 'sniper',
    bannedDesc: 'Precision loadout is off-limits. OVERWATCH locked.',
  },
};

export const RUNNER_IDS: RunnerId[] = ['glitch', 'warden', 'architect'];
