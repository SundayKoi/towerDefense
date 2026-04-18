import type { PeriodStats, SaveData } from '@/types';

export type ContractFrequency = 'daily' | 'weekly' | 'monthly';

export interface ContractDef {
  id: string;
  name: string;
  description: string;
  frequency: ContractFrequency;
  reward: number;
  check: (stats: PeriodStats) => boolean;
}

// ─── POOL ─────────────────────────────────────────────────────────────────

export const CONTRACTS: ContractDef[] = [
  // ── DAILY (reward 15–35) ─────────────────────────────────────────────────
  { id: 'd_run',            name: 'TEST RUN',            description: 'Complete any run today.',                      frequency: 'daily', reward: 15, check: (s) => s.runs >= 1 },
  { id: 'd_win',            name: 'QUICK BREACH',        description: 'Win a run today.',                             frequency: 'daily', reward: 20, check: (s) => s.wins >= 1 },
  { id: 'd_win_medium',     name: 'ESCALATE',            description: 'Win a Medium+ run today.',                     frequency: 'daily', reward: 30, check: (s) => s.mediumWins + s.hardWins >= 1 },
  { id: 'd_win_hard',       name: 'APEX BREACH',         description: 'Win a Hard run today.',                        frequency: 'daily', reward: 35, check: (s) => s.hardWins >= 1 },
  { id: 'd_kill_100',       name: 'EXTERMINATION',       description: 'Eliminate 100 enemies today.',                 frequency: 'daily', reward: 20, check: (s) => s.kills >= 100 },
  { id: 'd_kill_300',       name: 'DELETE STREAK',       description: 'Eliminate 300 enemies today.',                 frequency: 'daily', reward: 30, check: (s) => s.kills >= 300 },
  { id: 'd_boss_2',         name: 'BOSS PATROL',         description: 'Defeat 2 bosses today.',                       frequency: 'daily', reward: 25, check: (s) => s.bossKills >= 2 },
  { id: 'd_waves_20',       name: 'WAVE RUNNER',         description: 'Clear 20 waves today.',                        frequency: 'daily', reward: 20, check: (s) => s.wavesCleared >= 20 },
  { id: 'd_waves_40',       name: 'WAVE CRUSHER',        description: 'Clear 40 waves today.',                        frequency: 'daily', reward: 30, check: (s) => s.wavesCleared >= 40 },
  { id: 'd_proto_50',       name: 'DAILY TAKE',          description: 'Earn 50 protocols today.',                     frequency: 'daily', reward: 20, check: (s) => s.protocolsEarned >= 50 },
  { id: 'd_legendary',      name: 'RARE FIND',           description: 'Draft a Legendary card today.',                frequency: 'daily', reward: 25, check: (s) => s.legendaryDrafts >= 1 },
  { id: 'd_towers_3',       name: 'MIXED ARSENAL',       description: 'Deploy 3 different tower types today.',        frequency: 'daily', reward: 25, check: (s) => s.uniqueTowersDeployed.length >= 3 },

  // ── WEEKLY (reward 60–120) ───────────────────────────────────────────────
  { id: 'w_wins_5',         name: 'PROLIFIC',            description: 'Win 5 runs this week.',                        frequency: 'weekly', reward: 80,  check: (s) => s.wins >= 5 },
  { id: 'w_hard_3',         name: 'HARD MODE',           description: 'Win 3 Hard runs this week.',                   frequency: 'weekly', reward: 120, check: (s) => s.hardWins >= 3 },
  { id: 'w_kill_1k',        name: 'SLAUGHTERFEST',       description: 'Eliminate 1,000 enemies this week.',           frequency: 'weekly', reward: 80,  check: (s) => s.kills >= 1000 },
  { id: 'w_boss_15',        name: 'BOSS RUSH',           description: 'Defeat 15 bosses this week.',                  frequency: 'weekly', reward: 100, check: (s) => s.bossKills >= 15 },
  { id: 'w_waves_150',      name: 'WAVE VETERAN',        description: 'Clear 150 waves this week.',                   frequency: 'weekly', reward: 75,  check: (s) => s.wavesCleared >= 150 },
  { id: 'w_protocols_400',  name: 'BANKROLL',            description: 'Earn 400 protocols this week.',                frequency: 'weekly', reward: 100, check: (s) => s.protocolsEarned >= 400 },
  { id: 'w_legendary_3',    name: 'LEGEND CHASER',       description: 'Draft 3 Legendary cards this week.',           frequency: 'weekly', reward: 90,  check: (s) => s.legendaryDrafts >= 3 },
  { id: 'w_towers_8',       name: 'ARSENAL MASTER',      description: 'Deploy 8 different tower types this week.',    frequency: 'weekly', reward: 100, check: (s) => s.uniqueTowersDeployed.length >= 8 },

  // ── MONTHLY (reward 250–500) ─────────────────────────────────────────────
  { id: 'm_wins_25',        name: 'CAMPAIGN GRINDER',    description: 'Win 25 runs this month.',                      frequency: 'monthly', reward: 300, check: (s) => s.wins >= 25 },
  { id: 'm_kill_10k',       name: 'MASS EXTINCTION',     description: 'Eliminate 10,000 enemies this month.',         frequency: 'monthly', reward: 400, check: (s) => s.kills >= 10000 },
  { id: 'm_boss_60',        name: 'BOSS CRUSHER',        description: 'Defeat 60 bosses this month.',                 frequency: 'monthly', reward: 350, check: (s) => s.bossKills >= 60 },
  { id: 'm_towers_all',     name: 'FULL ARSENAL',        description: 'Deploy all 12 tower types this month.',        frequency: 'monthly', reward: 500, check: (s) => s.uniqueTowersDeployed.length >= 12 },
  { id: 'm_waves_500',      name: 'WAVE LEGEND',         description: 'Clear 500 waves this month.',                  frequency: 'monthly', reward: 300, check: (s) => s.wavesCleared >= 500 },
];

export const CONTRACTS_BY_ID: Record<string, ContractDef> = Object.fromEntries(CONTRACTS.map((c) => [c.id, c]));

// Number of active offers shown per frequency
export const OFFER_COUNT: Record<ContractFrequency, number> = { daily: 3, weekly: 2, monthly: 1 };

// ─── PERIOD HELPERS ───────────────────────────────────────────────────────

export function currentPeriodId(frequency: ContractFrequency, now = new Date()): string {
  if (frequency === 'daily') {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  if (frequency === 'monthly') {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  // ISO week: find Thursday of current week, use that week's year + week number
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstThuDayNum = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - firstThuDayNum + 3);
  const week = 1 + Math.round((d.getTime() - firstThu.getTime()) / 604800000);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function periodEndMs(frequency: ContractFrequency, now = new Date()): number {
  if (frequency === 'daily') {
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    return end.getTime();
  }
  if (frequency === 'weekly') {
    // End of current week = next Monday 00:00 local time
    const day = now.getDay(); // Sun=0
    const daysToMonday = (8 - day) % 7 || 7;
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToMonday, 0, 0, 0, 0);
    return end.getTime();
  }
  // monthly
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  return end.getTime();
}

// Simple deterministic hash string → 32-bit int
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Seeded shuffle: produces the same offer list for the same period across all players.
export function rollOffers(frequency: ContractFrequency, period: string): string[] {
  const pool = CONTRACTS.filter((c) => c.frequency === frequency).map((c) => c.id);
  const count = Math.min(OFFER_COUNT[frequency], pool.length);
  let seed = hashString(period + ':' + frequency);
  // Fisher–Yates with LCG-seeded rng
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  const arr = pool.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

export function emptyPeriodStats(): PeriodStats {
  return { runs: 0, wins: 0, mediumWins: 0, hardWins: 0, kills: 0, bossKills: 0, wavesCleared: 0, protocolsEarned: 0, xpEarned: 0, legendaryDrafts: 0, uniqueTowersDeployed: [] };
}

// Call before reading save.contracts — ensures each frequency's period matches the current real period.
// Resets stats, claimed, and re-rolls offers when period rolls over.
export function ensureContractsUpToDate(save: SaveData): boolean {
  let changed = false;
  const freqs: ContractFrequency[] = ['daily', 'weekly', 'monthly'];
  for (const f of freqs) {
    const p = currentPeriodId(f);
    const bucket = save.contracts[f];
    if (!bucket || bucket.period !== p) {
      save.contracts[f] = {
        period: p,
        offered: rollOffers(f, p),
        claimed: [],
        stats: emptyPeriodStats(),
      };
      changed = true;
    }
  }
  return changed;
}

export function addToAllPeriods(save: SaveData, patch: (s: PeriodStats) => void): void {
  ensureContractsUpToDate(save);
  patch(save.contracts.daily.stats);
  patch(save.contracts.weekly.stats);
  patch(save.contracts.monthly.stats);
}
