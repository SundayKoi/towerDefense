import type { ProgramId } from '@/game/programs';
import type { TowerId } from '@/types';

// ─── RUNNERS ────────────────────────────────────────────────────────────────
// A "runner" is the player's persona for a run. Each reshuffles the build in
// broad strokes: passive damage/hp/econ buffs, one signature starting bonus,
// and one banned tower to force composition diversity. Picking a runner is
// the highest-leverage per-run identity knob — effectively a weapon/class
// slot in a roguelike.

export type RunnerId = 'glitch' | 'warden' | 'architect';

export interface RunnerDef {
  id: RunnerId;
  name: string;
  role: string;
  flavor: string;
  color: string;
  passiveDamagePct: number;   // added to run.mods.globalDamagePct
  passiveRatePct: number;     // added to run.mods.globalRatePct
  bonusStartingHp: number;    // added to run.hp/maxHp
  bonusStartingLevels: number;// queued pendingLevelUps on run start
  bonusStartingTokens: Partial<Record<TowerId, number>>;
  bonusProgramCooldownReady?: ProgramId[]; // these programs start OFF-CD (already usable on wave 1)
  bannedTower: TowerId;       // added to lockedTurrets at run start
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
    bonusStartingHp: 0,
    bonusStartingLevels: 0,
    bonusStartingTokens: { firewall: 1 }, // extra firewall on top of default
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
    bonusStartingHp: 25,
    bonusStartingLevels: 0,
    bonusStartingTokens: { honeypot: 1 },
    bonusProgramCooldownReady: ['patch'],
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
    bonusStartingHp: 0,
    bonusStartingLevels: 1,
    bonusStartingTokens: {},
    bannedTower: 'sniper',
    bannedDesc: 'Precision loadout is off-limits. OVERWATCH locked.',
  },
};

export const RUNNER_IDS: RunnerId[] = ['glitch', 'warden', 'architect'];
