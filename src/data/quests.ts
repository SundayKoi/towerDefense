import type { SaveData } from '@/types';

export interface QuestDef {
  id: string;
  name: string;
  description: string;
  reward: number;       // protocols awarded on claim
  category: 'combat' | 'progression' | 'mastery';
  check: (save: SaveData) => boolean;
  // Numeric progress [current, target] for UI bars. Boolean-style quests (any
  // map on medium, etc.) emit [0,1] or [1,1].
  progress?: (save: SaveData) => [number, number];
}

function numericQuest(id: string, name: string, description: string, category: 'combat' | 'progression' | 'mastery', reward: number, extract: (s: SaveData) => number, target: number): QuestDef {
  return {
    id, name, description, category, reward,
    check: (s) => extract(s) >= target,
    progress: (s) => [Math.min(target, extract(s)), target],
  };
}

function boolQuest(id: string, name: string, description: string, category: 'combat' | 'progression' | 'mastery', reward: number, check: (s: SaveData) => boolean): QuestDef {
  return {
    id, name, description, category, reward,
    check,
    progress: (s) => [check(s) ? 1 : 0, 1],
  };
}

export const QUESTS: QuestDef[] = [
  // ── PROGRESSION ──────────────────────────────────────────────────────────
  numericQuest('q_first_run',     'FIRST CONTACT',     'Complete your first run (win or lose).', 'progression', 15,  (s) => s.stats.totalRuns, 1),
  numericQuest('q_first_win',     'SYSTEM BREACH',     'Win your first run on any map and difficulty.', 'progression', 30,  (s) => s.stats.totalWins, 1),
  numericQuest('q_ten_wins',      'VETERAN NETRUNNER', 'Win 10 runs total.', 'progression', 100, (s) => s.stats.totalWins, 10),
  boolQuest   ('q_medium_win',    'ESCALATION',        'Win any run on Medium difficulty.', 'progression', 40,  (s) => Object.values(s.completed).some((c) => c.medium)),
  boolQuest   ('q_hard_win',      'MAXIMUM SECURITY',  'Win any run on Hard difficulty.', 'progression', 80,  (s) => Object.values(s.completed).some((c) => c.hard)),
  boolQuest   ('q_all_diff',      'TRIPLE BREACH',     'Complete all 3 difficulties on any single map.', 'progression', 75,  (s) => Object.values(s.completed).some((c) => c.easy && c.medium && c.hard)),
  numericQuest('q_xp_5000',       'DEEP LEARNING',     'Earn 5,000 total XP across all runs.', 'progression', 75,  (s) => s.stats.totalXpEarned ?? 0, 5000),
  numericQuest('q_protocols_500', 'PROTOCOL MAGNATE',  'Earn 500 total Protocols across all runs.', 'progression', 60,  (s) => s.stats.totalProtocolsEarned ?? 0, 500),

  // ── COMBAT ───────────────────────────────────────────────────────────────
  numericQuest('q_kill_100',      'EXTERMINATOR',        'Eliminate 100 enemies across all runs.', 'combat', 20,  (s) => s.stats.totalKills, 100),
  numericQuest('q_kill_1k',       'MASS DELETION',       'Eliminate 1,000 enemies across all runs.', 'combat', 75,  (s) => s.stats.totalKills, 1000),
  numericQuest('q_kill_10k',      'DIGITAL APOCALYPSE',  'Eliminate 10,000 enemies across all runs.', 'combat', 250, (s) => s.stats.totalKills, 10000),
  numericQuest('q_boss_5',        'BOSS HUNTER',         'Defeat 5 boss-class entities.', 'combat', 50,  (s) => s.stats.bossKills, 5),
  numericQuest('q_boss_25',       'APEX PREDATOR',       'Defeat 25 boss-class entities.', 'combat', 150, (s) => s.stats.bossKills, 25),

  // ── MASTERY ───────────────────────────────────────────────────────────────
  numericQuest('q_tower_6',       'DIVERSIFIED ARSENAL', 'Deploy 6 different tower types across all your runs.', 'mastery', 60,  (s) => s.stats.towersEverDeployed?.length ?? 0, 6),
  numericQuest('q_tower_all',     'FULL LOADOUT',        'Deploy all 12 tower types across any combination of runs.', 'mastery', 200, (s) => s.stats.towersEverDeployed?.length ?? 0, 12),
  numericQuest('q_legendary_1',   'RARE ACQUISITION',    'Draft a Legendary card.', 'mastery', 50,  (s) => s.stats.legendaryDrafts ?? 0, 1),
  numericQuest('q_legendary_5',   'LEGEND COLLECTOR',    'Draft 5 Legendary cards total across all runs.', 'mastery', 150, (s) => s.stats.legendaryDrafts ?? 0, 5),
  numericQuest('q_survival_20',   'ENDLESS NIGHT',       'Survive to wave 20 in Survival mode.', 'mastery', 75,  (s) => s.stats.survivalBestWave ?? 0, 20),
  numericQuest('q_survival_40',   'ETERNAL BREACH',      'Survive to wave 40 in Survival mode.', 'mastery', 175, (s) => s.stats.survivalBestWave ?? 0, 40),
];

export const QUESTS_BY_ID: Record<string, QuestDef> = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

export const QUEST_CATEGORY_LABELS: Record<string, string> = {
  progression: 'PROGRESSION',
  combat: 'COMBAT',
  mastery: 'MASTERY',
};
