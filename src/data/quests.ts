import type { SaveData } from '@/types';

export interface QuestDef {
  id: string;
  name: string;
  description: string;
  reward: number;       // protocols awarded on claim
  category: 'combat' | 'progression' | 'mastery';
  check: (save: SaveData) => boolean;
}

export const QUESTS: QuestDef[] = [
  // ── PROGRESSION ──────────────────────────────────────────────────────────
  {
    id: 'q_first_run',
    name: 'FIRST CONTACT',
    description: 'Complete your first run (win or lose).',
    reward: 15,
    category: 'progression',
    check: (s) => s.stats.totalRuns >= 1,
  },
  {
    id: 'q_first_win',
    name: 'SYSTEM BREACH',
    description: 'Win your first run on any map and difficulty.',
    reward: 30,
    category: 'progression',
    check: (s) => s.stats.totalWins >= 1,
  },
  {
    id: 'q_ten_wins',
    name: 'VETERAN NETRUNNER',
    description: 'Win 10 runs total.',
    reward: 100,
    category: 'progression',
    check: (s) => s.stats.totalWins >= 10,
  },
  {
    id: 'q_medium_win',
    name: 'ESCALATION',
    description: 'Win any run on Medium difficulty.',
    reward: 40,
    category: 'progression',
    check: (s) => Object.values(s.completed).some((c) => c.medium),
  },
  {
    id: 'q_hard_win',
    name: 'MAXIMUM SECURITY',
    description: 'Win any run on Hard difficulty.',
    reward: 80,
    category: 'progression',
    check: (s) => Object.values(s.completed).some((c) => c.hard),
  },
  {
    id: 'q_all_diff',
    name: 'TRIPLE BREACH',
    description: 'Complete all 3 difficulties on any single map.',
    reward: 75,
    category: 'progression',
    check: (s) => Object.values(s.completed).some((c) => c.easy && c.medium && c.hard),
  },
  {
    id: 'q_xp_5000',
    name: 'DEEP LEARNING',
    description: 'Earn 5,000 total XP across all runs.',
    reward: 75,
    category: 'progression',
    check: (s) => (s.stats.totalXpEarned ?? 0) >= 5000,
  },
  {
    id: 'q_protocols_500',
    name: 'PROTOCOL MAGNATE',
    description: 'Earn 500 total Protocols across all runs.',
    reward: 60,
    category: 'progression',
    check: (s) => (s.stats.totalProtocolsEarned ?? 0) >= 500,
  },

  // ── COMBAT ───────────────────────────────────────────────────────────────
  {
    id: 'q_kill_100',
    name: 'EXTERMINATOR',
    description: 'Eliminate 100 enemies across all runs.',
    reward: 20,
    category: 'combat',
    check: (s) => s.stats.totalKills >= 100,
  },
  {
    id: 'q_kill_1k',
    name: 'MASS DELETION',
    description: 'Eliminate 1,000 enemies across all runs.',
    reward: 75,
    category: 'combat',
    check: (s) => s.stats.totalKills >= 1000,
  },
  {
    id: 'q_kill_10k',
    name: 'DIGITAL APOCALYPSE',
    description: 'Eliminate 10,000 enemies across all runs.',
    reward: 250,
    category: 'combat',
    check: (s) => s.stats.totalKills >= 10000,
  },
  {
    id: 'q_boss_5',
    name: 'BOSS HUNTER',
    description: 'Defeat 5 boss-class entities.',
    reward: 50,
    category: 'combat',
    check: (s) => s.stats.bossKills >= 5,
  },
  {
    id: 'q_boss_25',
    name: 'APEX PREDATOR',
    description: 'Defeat 25 boss-class entities.',
    reward: 150,
    category: 'combat',
    check: (s) => s.stats.bossKills >= 25,
  },

  // ── MASTERY ───────────────────────────────────────────────────────────────
  {
    id: 'q_tower_6',
    name: 'DIVERSIFIED ARSENAL',
    description: 'Deploy 6 different tower types across all your runs.',
    reward: 60,
    category: 'mastery',
    check: (s) => (s.stats.towersEverDeployed?.length ?? 0) >= 6,
  },
  {
    id: 'q_tower_all',
    name: 'FULL LOADOUT',
    description: 'Deploy all 12 tower types across any combination of runs.',
    reward: 200,
    category: 'mastery',
    check: (s) => (s.stats.towersEverDeployed?.length ?? 0) >= 12,
  },
  {
    id: 'q_legendary_1',
    name: 'RARE ACQUISITION',
    description: 'Draft a Legendary card.',
    reward: 50,
    category: 'mastery',
    check: (s) => (s.stats.legendaryDrafts ?? 0) >= 1,
  },
  {
    id: 'q_legendary_5',
    name: 'LEGEND COLLECTOR',
    description: 'Draft 5 Legendary cards total across all runs.',
    reward: 150,
    category: 'mastery',
    check: (s) => (s.stats.legendaryDrafts ?? 0) >= 5,
  },
  {
    id: 'q_survival_20',
    name: 'ENDLESS NIGHT',
    description: 'Survive to wave 20 in Survival mode.',
    reward: 75,
    category: 'mastery',
    check: (s) => (s.stats.survivalBestWave ?? 0) >= 20,
  },
  {
    id: 'q_survival_40',
    name: 'ETERNAL BREACH',
    description: 'Survive to wave 40 in Survival mode.',
    reward: 175,
    category: 'mastery',
    check: (s) => (s.stats.survivalBestWave ?? 0) >= 40,
  },
];

export const QUESTS_BY_ID: Record<string, QuestDef> = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

export const QUEST_CATEGORY_LABELS: Record<string, string> = {
  progression: 'PROGRESSION',
  combat: 'COMBAT',
  mastery: 'MASTERY',
};
