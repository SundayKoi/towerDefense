import type { SaveData, TowerId } from '@/types';

// ─── CHROMAS (cosmetic tower color overrides) ─────────────────────────────
// Earn-and-equip cosmetics. Each chroma overrides the turret's accent +
// projectile + trail color triplet — no gameplay impact. Scattered across
// many different milestone types so players pick them up at varied cadences
// through the game (kill counts, boss kills, legendary drafts, hard clears,
// sector clears, survival depth, full-roster deploys).
//
// Design goal: one chroma per turret (14 total). Unlock thresholds tuned so
// ~half appear during the campaign and the rest during post-campaign play.
//
// Equip from the CHROMAS tab in the Databank, or the per-turret chip row
// in ARSENAL. Unlocks are checked after each run; new entries auto-equip.

export interface ChromaDef {
  id: string;
  name: string;
  tower: TowerId;
  accent: string;
  projectile: string;
  trail: string;
  unlockDescription: string;
  // Numeric progress tuple [current, target] for rendering progress bars in
  // the CHROMAS tab. For boolean unlocks, returns [0,1] or [1,1].
  progress: (save: SaveData) => [number, number];
}

// ── Helpers for compound stats ────────────────────────────────────────────
function hardWinCount(save: SaveData): number {
  return Object.values(save.completed ?? {}).filter((c) => c && c.hard).length;
}
function mediumWinCount(save: SaveData): number {
  return Object.values(save.completed ?? {}).filter((c) => c && c.medium).length;
}
function sectorsHardCleared(save: SaveData): number {
  return Object.values(save.sectorClears ?? {}).filter(Boolean).length;
}
function anyMapWithAllDifficulties(save: SaveData): number {
  const hits = Object.values(save.completed ?? {}).filter((c) => c && c.easy && c.medium && c.hard).length;
  return Math.min(1, hits);
}

export const CHROMAS: ChromaDef[] = [
  {
    id: 'firewall_neon',
    name: 'NEON',
    tower: 'firewall',
    accent: '#ff6bff', projectile: '#ff2d95', trail: '#8800aa',
    unlockDescription: 'Reach 200 total lifetime kills.',
    progress: (s) => [Math.min(200, s.stats.totalKills ?? 0), 200],
  },
  {
    id: 'honeypot_goldrush',
    name: 'GOLDRUSH',
    tower: 'honeypot',
    accent: '#ffaa00', projectile: '#ffdd00', trail: '#aa6600',
    unlockDescription: 'Win 3 runs on MEDIUM or HARD difficulty.',
    progress: (s) => [Math.min(3, mediumWinCount(s) + hardWinCount(s)), 3],
  },
  {
    id: 'antivirus_crimson',
    name: 'CRIMSON',
    tower: 'antivirus',
    accent: '#ff3355', projectile: '#ff0000', trail: '#aa0000',
    unlockDescription: 'Defeat 25 bosses.',
    progress: (s) => [Math.min(25, s.stats.bossKills ?? 0), 25],
  },
  {
    id: 'quantum_prism',
    name: 'PRISM',
    tower: 'quantum',
    accent: '#00fff0', projectile: '#ffffff', trail: '#00ffcc',
    unlockDescription: 'Draft 3 legendary cards.',
    progress: (s) => [Math.min(3, s.stats.legendaryDrafts ?? 0), 3],
  },
  {
    id: 'ice_arctic',
    name: 'ARCTIC',
    tower: 'ice',
    accent: '#ffffff', projectile: '#e0f4ff', trail: '#aaccff',
    unlockDescription: 'Complete 10 total runs.',
    progress: (s) => [Math.min(10, s.stats.totalRuns ?? 0), 10],
  },
  {
    id: 'mine_mortar',
    name: 'MORTAR',
    tower: 'mine',
    accent: '#ff4400', projectile: '#ff6600', trail: '#aa2200',
    unlockDescription: 'Win any run on HARD.',
    progress: (s) => [Math.min(1, hardWinCount(s)), 1],
  },
  {
    id: 'chain_stormcore',
    name: 'STORMCORE',
    tower: 'chain',
    accent: '#aaffff', projectile: '#ffffff', trail: '#4488cc',
    unlockDescription: 'Reach 1,000 total lifetime kills.',
    progress: (s) => [Math.min(1000, s.stats.totalKills ?? 0), 1000],
  },
  {
    id: 'railgun_tungsten',
    name: 'TUNGSTEN',
    tower: 'railgun',
    accent: '#ccddee', projectile: '#eeeeff', trail: '#556677',
    unlockDescription: 'Win 3 HARD runs.',
    progress: (s) => [Math.min(3, hardWinCount(s)), 3],
  },
  {
    id: 'pulse_ionic',
    name: 'IONIC',
    tower: 'pulse',
    accent: '#ff8833', projectile: '#ffcc33', trail: '#cc3300',
    unlockDescription: 'Defeat 50 bosses.',
    progress: (s) => [Math.min(50, s.stats.bossKills ?? 0), 50],
  },
  {
    id: 'sniper_eclipse',
    name: 'ECLIPSE',
    tower: 'sniper',
    accent: '#b847ff', projectile: '#ff00ff', trail: '#6622aa',
    unlockDescription: 'Reach survival wave 15.',
    progress: (s) => [Math.min(15, s.stats.survivalBestWave ?? 0), 15],
  },
  {
    id: 'scrambler_violet',
    name: 'VIOLET',
    tower: 'scrambler',
    accent: '#cc55ff', projectile: '#ff99ff', trail: '#661188',
    unlockDescription: 'Draft 5 legendary cards.',
    progress: (s) => [Math.min(5, s.stats.legendaryDrafts ?? 0), 5],
  },
  {
    id: 'sentinel_verdant',
    name: 'VERDANT',
    tower: 'sentinel',
    accent: '#44ffaa', projectile: '#88ffcc', trail: '#00aa55',
    unlockDescription: 'Hard-clear every map in any one sector (act).',
    progress: (s) => [Math.min(1, sectorsHardCleared(s)), 1],
  },
  {
    id: 'booster_aurum',
    name: 'AURUM',
    tower: 'booster_node',
    accent: '#ffd700', projectile: '#ffe066', trail: '#aa7700',
    unlockDescription: 'Deploy all 14 tower types across any runs.',
    progress: (s) => [Math.min(14, s.stats.towersEverDeployed?.length ?? 0), 14],
  },
  {
    id: 'data_miner_obsidian',
    name: 'OBSIDIAN',
    tower: 'data_miner',
    accent: '#aa44ff', projectile: '#cc55ff', trail: '#220044',
    unlockDescription: 'Complete all 3 difficulties on any single map.',
    progress: (s) => [anyMapWithAllDifficulties(s), 1],
  },
];

export const CHROMAS_BY_ID: Record<string, ChromaDef> = Object.fromEntries(CHROMAS.map((c) => [c.id, c]));

export function chromaUnlocked(save: SaveData, def: ChromaDef): boolean {
  const [cur, tgt] = def.progress(save);
  return cur >= tgt;
}

// Check which chromas are newly unlocked by the current save state. Updates
// save.unlockedChromas in-place and auto-equips new entries. Returns the list
// of newly unlocked chromas for the game-over screen to celebrate.
export function refreshChromaUnlocks(save: SaveData): ChromaDef[] {
  const u = save.unlockedChromas ?? [];
  const eq = save.equippedChromas ?? {};
  const fresh: ChromaDef[] = [];
  for (const c of CHROMAS) {
    if (u.includes(c.id)) continue;
    if (chromaUnlocked(save, c)) {
      u.push(c.id);
      fresh.push(c);
      // Auto-equip on first unlock so the player sees the effect immediately.
      if (!eq[c.tower]) eq[c.tower] = c.id;
    }
  }
  save.unlockedChromas = u;
  save.equippedChromas = eq;
  return fresh;
}

export function getEquippedChroma(save: SaveData, tower: TowerId): ChromaDef | undefined {
  const id = save.equippedChromas?.[tower];
  if (!id) return undefined;
  return CHROMAS_BY_ID[id];
}
