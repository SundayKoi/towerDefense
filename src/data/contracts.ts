import type { Difficulty, MapDef, PeriodStats, SaveData, TowerId } from '@/types';
import { MAPS, isSurvival } from '@/data/maps';
import { TOWERS } from '@/data/towers';

export type ContractFrequency = 'daily' | 'weekly' | 'monthly';

export interface ContractDef {
  id: string;
  name: string;
  description: string;
  frequency: ContractFrequency;
  reward: number;
  check: (stats: PeriodStats) => boolean;
  // Numeric progress tuple [current, target] for rendering X/Y progress bars.
  // If the contract's check is already satisfied, callers should clamp current
  // to target. Every contract below provides this — the field is typed optional
  // for forward-compat only.
  progress?: (stats: PeriodStats) => [number, number];
}

// ─── POOL ─────────────────────────────────────────────────────────────────

// Factory: accepts a stat extractor + target; emits both check and progress
// together so every contract stays consistent.
function numericContract(id: string, name: string, description: string, frequency: ContractFrequency, reward: number, extract: (s: PeriodStats) => number, target: number): ContractDef {
  return {
    id, name, description, frequency, reward,
    check: (s) => extract(s) >= target,
    progress: (s) => [Math.min(target, extract(s)), target],
  };
}

export const CONTRACTS: ContractDef[] = [
  // ── DAILY (reward 15–35) ─────────────────────────────────────────────────
  numericContract('d_run',            'TEST RUN',            'Complete any run today.',                      'daily', 15, (s) => s.runs, 1),
  numericContract('d_win',            'QUICK BREACH',        'Win a run today.',                             'daily', 20, (s) => s.wins, 1),
  numericContract('d_win_medium',     'ESCALATE',            'Win a Medium+ run today.',                     'daily', 30, (s) => s.mediumWins + s.hardWins, 1),
  numericContract('d_win_hard',       'APEX BREACH',         'Win a Hard run today.',                        'daily', 35, (s) => s.hardWins, 1),
  numericContract('d_kill_100',       'EXTERMINATION',       'Eliminate 100 enemies today.',                 'daily', 20, (s) => s.kills, 100),
  numericContract('d_kill_300',       'DELETE STREAK',       'Eliminate 300 enemies today.',                 'daily', 30, (s) => s.kills, 300),
  numericContract('d_boss_2',         'BOSS PATROL',         'Defeat 2 bosses today.',                       'daily', 25, (s) => s.bossKills, 2),
  numericContract('d_waves_20',       'WAVE RUNNER',         'Clear 20 waves today.',                        'daily', 20, (s) => s.wavesCleared, 20),
  numericContract('d_waves_40',       'WAVE CRUSHER',        'Clear 40 waves today.',                        'daily', 30, (s) => s.wavesCleared, 40),
  numericContract('d_proto_50',       'DAILY TAKE',          'Earn 50 protocols today.',                     'daily', 20, (s) => s.protocolsEarned, 50),
  numericContract('d_legendary',      'RARE FIND',           'Draft a Legendary card today.',                'daily', 25, (s) => s.legendaryDrafts, 1),
  numericContract('d_towers_3',       'MIXED ARSENAL',       'Deploy 3 different tower types today.',        'daily', 25, (s) => s.uniqueTowersDeployed.length, 3),

  // ── WEEKLY (reward 60–120) ───────────────────────────────────────────────
  numericContract('w_wins_5',         'PROLIFIC',            'Win 5 runs this week.',                        'weekly', 80,  (s) => s.wins, 5),
  numericContract('w_hard_3',         'HARD MODE',           'Win 3 Hard runs this week.',                   'weekly', 120, (s) => s.hardWins, 3),
  numericContract('w_kill_1k',        'SLAUGHTERFEST',       'Eliminate 1,000 enemies this week.',           'weekly', 80,  (s) => s.kills, 1000),
  numericContract('w_boss_15',        'BOSS RUSH',           'Defeat 15 bosses this week.',                  'weekly', 100, (s) => s.bossKills, 15),
  numericContract('w_waves_150',      'WAVE VETERAN',        'Clear 150 waves this week.',                   'weekly', 75,  (s) => s.wavesCleared, 150),
  numericContract('w_protocols_400',  'BANKROLL',            'Earn 400 protocols this week.',                'weekly', 100, (s) => s.protocolsEarned, 400),
  numericContract('w_legendary_3',    'LEGEND CHASER',       'Draft 3 Legendary cards this week.',           'weekly', 90,  (s) => s.legendaryDrafts, 3),
  numericContract('w_towers_8',       'ARSENAL MASTER',      'Deploy 8 different tower types this week.',    'weekly', 100, (s) => s.uniqueTowersDeployed.length, 8),

  // ── MONTHLY (reward 250–500) ─────────────────────────────────────────────
  numericContract('m_wins_25',        'CAMPAIGN GRINDER',    'Win 25 runs this month.',                      'monthly', 300, (s) => s.wins, 25),
  numericContract('m_kill_10k',       'MASS EXTINCTION',     'Eliminate 10,000 enemies this month.',         'monthly', 400, (s) => s.kills, 10000),
  numericContract('m_boss_60',        'BOSS CRUSHER',        'Defeat 60 bosses this month.',                 'monthly', 350, (s) => s.bossKills, 60),
  numericContract('m_towers_all',     'FULL ARSENAL',        'Deploy all 12 tower types this month.',        'monthly', 500, (s) => s.uniqueTowersDeployed.length, 12),
  numericContract('m_waves_500',      'WAVE LEGEND',         'Clear 500 waves this month.',                  'monthly', 300, (s) => s.wavesCleared, 500),
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

// ─── DAILY CONTRACT (seeded challenge run) ────────────────────────────────
// Pick a single map + difficulty + flavor mutator deterministically from today's
// period id, so every player worldwide sees the same challenge today.

export interface DailyMutator {
  id: string;
  name: string;
  flavor: string;
  modifier: NonNullable<MapDef['modifiers']>;
  // Optional unlock requirement. Returning false removes this mutator from the
  // roll pool for this player. Used to gate mutators whose counterplay depends
  // on a specific tower class — e.g. GHOST PROTOCOL needs AOE/chain to reveal.
  availableFor?: (save: SaveData) => boolean;
}

// True iff the player has at least one unlocked tower matching the predicate.
function hasTowerWith(save: SaveData, pred: (id: TowerId) => boolean): boolean {
  return (save.unlockedTowers ?? []).some(pred);
}

export const DAILY_MUTATORS: DailyMutator[] = [
  { id: 'packet_storm',  name: 'PACKET STORM',       flavor: 'Enemies spawn in paired bursts.',                 modifier: { packetBursts: 0.4 } },
  { id: 'encrypted',     name: 'ENCRYPTED PAYLOADS', flavor: 'Every hostile carries a regenerating shield.',    modifier: { encrypted: 0.3 } },
  {
    id: 'ghost_protocol', name: 'GHOST PROTOCOL',    flavor: '25% of spawns arrive cloaked.',                   modifier: { stealthChance: 0.25 },
    // Requires at least one AOE or chain tower unlocked — otherwise cloaked
    // spawns are literally untargetable by the player's roster.
    availableFor: (save) => hasTowerWith(save, (id) => TOWERS[id]?.damageType === 'aoe' || TOWERS[id]?.damageType === 'chain'),
  },
  { id: 'replicating',   name: 'REPLICATING VIRUS',  flavor: 'Killed hostiles spawn a worm offspring.',         modifier: { replication: 0.15 } },
  { id: 'rootkit',       name: 'ROOTKIT SWEEP',      flavor: 'A random turret jams every 4 seconds near bosses.', modifier: { rootkit: 4.0 } },
];

export const DAILY_MUTATORS_BY_ID: Record<string, DailyMutator> = Object.fromEntries(DAILY_MUTATORS.map((m) => [m.id, m]));

// Roll today's daily contract — map, difficulty, mutator — deterministically from
// the calendar date. Filters to maps the player has unlocked campaign-wise so it
// doesn't send a fresh player to act-7 mazes; uses completion data as the gate.
export function rollDailyContract(save: SaveData, period: string): NonNullable<SaveData['dailyContract']> {
  const campaignMaps = MAPS.filter((m) => !isSurvival(m.id));
  const unlocked = campaignMaps.filter((m) => save.completed[m.id]?.easy || save.completed[m.id]?.medium || save.completed[m.id]?.hard);
  const pool = unlocked.length > 0 ? unlocked : campaignMaps.slice(0, 3);
  let seed = hashString('daily:' + period);
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  const map = pool[Math.floor(rng() * pool.length)];
  // Difficulty: bias toward medium/hard as you complete more maps, so the daily
  // scales with mastery.
  const completedCount = unlocked.length;
  const diffPool: Difficulty[] = completedCount >= 14 ? ['medium', 'hard', 'hard']
                                 : completedCount >= 7 ? ['easy', 'medium', 'medium']
                                 : ['easy', 'easy', 'medium'];
  const difficulty = diffPool[Math.floor(rng() * diffPool.length)];
  // Mutator pool filtered by player unlocks — prevents rolling GHOST PROTOCOL
  // when the player can't counter cloaked spawns. Deterministic per-save: two
  // players with identical unlocks + same date get the same contract. Falls
  // back to the first always-available mutator if every filtered out.
  const mutatorPool = DAILY_MUTATORS.filter((m) => !m.availableFor || m.availableFor(save));
  const pickPool = mutatorPool.length > 0 ? mutatorPool : [DAILY_MUTATORS[0]];
  const mutator = pickPool[Math.floor(rng() * pickPool.length)];
  return { period, mapId: map.id, difficulty, mutator: mutator.id, attempts: 0, bestWave: 0, bestTimeSec: 0, completed: false };
}

export function ensureDailyContract(save: SaveData): boolean {
  const period = currentPeriodId('daily');
  if (!save.dailyContract || save.dailyContract.period !== period) {
    save.dailyContract = rollDailyContract(save, period);
    return true;
  }
  return false;
}

// Weekly and monthly seeded challenges use the same roll pipeline but with a
// different period + seed prefix, so all players share the same (map,
// difficulty, mutator) triple for the whole week / month. Weeklies favor
// hard / epic mutators; monthlies force all-HARD as a "signature long run".
export function rollWeeklyContract(save: SaveData, period: string): NonNullable<SaveData['weeklyContract']> {
  const campaignMaps = MAPS.filter((m) => !isSurvival(m.id));
  const unlocked = campaignMaps.filter((m) => save.completed[m.id]?.easy || save.completed[m.id]?.medium || save.completed[m.id]?.hard);
  const pool = unlocked.length > 0 ? unlocked : campaignMaps.slice(0, 3);
  let seed = hashString('weekly:' + period);
  const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0x100000000; };
  const map = pool[Math.floor(rng() * pool.length)];
  // Weekly bias: medium + hard weighted.
  const diffPool: Difficulty[] = ['medium', 'hard', 'hard'];
  const difficulty = diffPool[Math.floor(rng() * diffPool.length)];
  const mutatorPool = DAILY_MUTATORS.filter((m) => !m.availableFor || m.availableFor(save));
  const pickPool = mutatorPool.length > 0 ? mutatorPool : [DAILY_MUTATORS[0]];
  const mutator = pickPool[Math.floor(rng() * pickPool.length)];
  return { period, mapId: map.id, difficulty, mutator: mutator.id, attempts: 0, bestWave: 0, bestTimeSec: 0, completed: false };
}

export function rollMonthlyContract(save: SaveData, period: string): NonNullable<SaveData['monthlyContract']> {
  const campaignMaps = MAPS.filter((m) => !isSurvival(m.id));
  const unlocked = campaignMaps.filter((m) => save.completed[m.id]?.hard || save.completed[m.id]?.medium || save.completed[m.id]?.easy);
  const pool = unlocked.length > 0 ? unlocked : campaignMaps.slice(0, 3);
  let seed = hashString('monthly:' + period);
  const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0x100000000; };
  const map = pool[Math.floor(rng() * pool.length)];
  // Monthly is always HARD — the signature long-form challenge.
  const difficulty: Difficulty = 'hard';
  const mutatorPool = DAILY_MUTATORS.filter((m) => !m.availableFor || m.availableFor(save));
  const pickPool = mutatorPool.length > 0 ? mutatorPool : [DAILY_MUTATORS[0]];
  const mutator = pickPool[Math.floor(rng() * pickPool.length)];
  return { period, mapId: map.id, difficulty, mutator: mutator.id, attempts: 0, bestWave: 0, bestTimeSec: 0, completed: false };
}

export function ensureWeeklyContract(save: SaveData): boolean {
  const period = currentPeriodId('weekly');
  if (!save.weeklyContract || save.weeklyContract.period !== period) {
    save.weeklyContract = rollWeeklyContract(save, period);
    return true;
  }
  return false;
}

export function ensureMonthlyContract(save: SaveData): boolean {
  const period = currentPeriodId('monthly');
  if (!save.monthlyContract || save.monthlyContract.period !== period) {
    save.monthlyContract = rollMonthlyContract(save, period);
    return true;
  }
  return false;
}
