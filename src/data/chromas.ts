import type { SaveData, TowerId } from '@/types';

// ─── CHROMAS (cosmetic tower color overrides) ─────────────────────────────
// Earn-and-equip cosmetics. Each chroma overrides the turret's accent +
// projectile + trail color triplet — no gameplay impact. Designed to be the
// first genuine "I want to play more" long-tail hook: the shop/prestige/cards
// all buff power, but chromas reward specific playstyles (kills with X tower,
// crits, bosses, survival waves).
//
// Unlock criteria reference save.stats.killsByTower and other lifetime stats.
// Checked after each run; new unlocks auto-equip so players see the change
// immediately without a mandatory menu visit.

export interface ChromaDef {
  id: string;
  name: string;
  tower: TowerId;
  accent: string;
  projectile: string;
  trail: string;
  unlockDescription: string;
  unlocked: (save: SaveData) => boolean;
}

export const CHROMAS: ChromaDef[] = [
  {
    id: 'firewall_neon',
    name: 'NEON',
    tower: 'firewall',
    accent: '#ff6bff',
    projectile: '#ff2d95',
    trail: '#8800aa',
    unlockDescription: 'Reach 200 total lifetime kills.',
    unlocked: (s) => (s.stats.totalKills ?? 0) >= 200,
  },
  {
    id: 'antivirus_crimson',
    name: 'CRIMSON',
    tower: 'antivirus',
    accent: '#ff3355',
    projectile: '#ff0000',
    trail: '#aa0000',
    unlockDescription: 'Defeat 25 bosses.',
    unlocked: (s) => (s.stats.bossKills ?? 0) >= 25,
  },
  {
    id: 'quantum_prism',
    name: 'PRISM',
    tower: 'quantum',
    accent: '#00fff0',
    projectile: '#ffffff',
    trail: '#00ffcc',
    unlockDescription: 'Draft 3 legendary cards.',
    unlocked: (s) => (s.stats.legendaryDrafts ?? 0) >= 3,
  },
  {
    id: 'sniper_eclipse',
    name: 'ECLIPSE',
    tower: 'sniper',
    accent: '#b847ff',
    projectile: '#ff00ff',
    trail: '#6622aa',
    unlockDescription: 'Reach survival wave 15.',
    unlocked: (s) => (s.stats.survivalBestWave ?? 0) >= 15,
  },
  {
    id: 'ice_arctic',
    name: 'ARCTIC',
    tower: 'ice',
    accent: '#ffffff',
    projectile: '#e0f4ff',
    trail: '#aaccff',
    unlockDescription: 'Complete 10 total runs.',
    unlocked: (s) => (s.stats.totalRuns ?? 0) >= 10,
  },
];

export const CHROMAS_BY_ID: Record<string, ChromaDef> = Object.fromEntries(CHROMAS.map((c) => [c.id, c]));

// Check which chromas are newly unlocked by the current save state. Updates
// save.unlockedChromas in-place and auto-equips new entries. Returns the list
// of newly unlocked chromas for the UI to celebrate.
export function refreshChromaUnlocks(save: SaveData): ChromaDef[] {
  const u = save.unlockedChromas ?? [];
  const eq = save.equippedChromas ?? {};
  const fresh: ChromaDef[] = [];
  for (const c of CHROMAS) {
    if (u.includes(c.id)) continue;
    if (c.unlocked(save)) {
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
