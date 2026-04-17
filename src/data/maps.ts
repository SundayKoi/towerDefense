import type { MapDef } from '@/types';

// Standard tier config — consistent scaling across all campaign maps.
const STANDARD_DIFFICULTIES = {
  easy:   { waves: 20, startHp: 20, hpScale: 1.22, speedScale: 1.02, rewardScale: 1.0  },
  medium: { waves: 35, startHp: 18, hpScale: 1.28, speedScale: 1.04, rewardScale: 0.95 },
  hard:   { waves: 50, startHp: 15, hpScale: 1.34, speedScale: 1.06, rewardScale: 0.9  },
} as const;

export const MAPS: MapDef[] = [
  // ============ 1. GRID.01 — Training Subnet ============
  {
    id: 'grid01',
    name: 'GRID.01',
    fullName: 'TRAINING SUBNET',
    order: 1,
    cols: 9,
    rows: 13,
    paths: [{
      points: [
        { x: 0, y: 1 }, { x: 3, y: 1 }, { x: 3, y: 4 }, { x: 6, y: 4 },
        { x: 6, y: 7 }, { x: 2, y: 7 }, { x: 2, y: 10 }, { x: 8, y: 10 }, { x: 8, y: 12 },
      ],
    }],
    bgColor: '#020a14',
    accentColor: '#00fff0',
    secondaryColor: '#00aaff',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['worm', 'spider'],
      phase2: ['worm', 'spider', 'trojan'],
      phase3: ['trojan', 'rootkit'],
    },
    bosses: {
      easy:   { 10: 'kernel', 20: 'daemon' },
      medium: { 10: 'kernel', 20: 'daemon', 30: 'leviathan' },
      hard:   { 10: 'kernel', 20: 'daemon', 30: 'leviathan', 40: 'daemon', 50: 'voidlord' },
    },
    rewards: {
      easyClear:   { type: 'unlock-card',  id: 'honeypot_chip' },
      mediumClear: { type: 'unlock-tower', id: 'quantum' },
      hardClear:   { type: 'unlock-card',  id: 'legendary_overclock' },
    },
  },

  // ============ 2. NEXUS HUB — Corporate Backbone ============
  {
    id: 'nexus',
    name: 'NEXUS HUB',
    fullName: 'CORPORATE BACKBONE',
    order: 2,
    cols: 9,
    rows: 13,
    paths: [
      {
        points: [
          { x: 0, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 6 },
          { x: 4, y: 10 }, { x: 8, y: 10 }, { x: 8, y: 12 },
        ],
      },
      {
        points: [
          { x: 8, y: 0 }, { x: 8, y: 6 }, { x: 4, y: 6 },
          { x: 4, y: 10 }, { x: 8, y: 10 }, { x: 8, y: 12 },
        ],
      },
    ],
    bgColor: '#0a0218',
    accentColor: '#b847ff',
    secondaryColor: '#ff2d95',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['worm', 'spider'],
      phase2: ['spider', 'trojan', 'phantom'],
      phase3: ['trojan', 'rootkit', 'phantom'],
    },
    bosses: {
      easy:   { 10: 'daemon', 20: 'kernel' },
      medium: { 10: 'daemon', 20: 'kernel', 30: 'leviathan' },
      hard:   { 10: 'daemon', 20: 'kernel', 30: 'leviathan', 40: 'swarm', 50: 'voidlord' },
    },
    rewards: {
      easyClear:   { type: 'unlock-card',  id: 'antivirus_chip' },
      mediumClear: { type: 'unlock-tower', id: 'ice' },
      hardClear:   { type: 'unlock-card',  id: 'time_dilation' },
    },
  },

  // ============ 3. BLACK ICE — Deep System Core ============
  {
    id: 'blackice',
    name: 'BLACK ICE',
    fullName: 'DEEP SYSTEM CORE',
    order: 3,
    cols: 11,
    rows: 13,
    paths: [
      { points: [{ x: 0, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 7 }, { x: 5, y: 7 }, { x: 5, y: 12 }] },
      { points: [{ x: 10, y: 3 }, { x: 7, y: 3 }, { x: 7, y: 7 }, { x: 5, y: 7 }, { x: 5, y: 12 }] },
      { points: [{ x: 5, y: 0 }, { x: 5, y: 7 }, { x: 5, y: 12 }] },
    ],
    bgColor: '#140202',
    accentColor: '#ff3355',
    secondaryColor: '#ff6600',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['spider', 'trojan', 'glitch'],
      phase2: ['trojan', 'phantom', 'bomber'],
      phase3: ['rootkit', 'phantom', 'wraith', 'parasite'],
    },
    bosses: {
      easy:   { 10: 'kernel', 20: 'leviathan' },
      medium: { 10: 'kernel', 20: 'daemon', 30: 'leviathan' },
      hard:   { 10: 'kernel', 20: 'daemon', 30: 'leviathan', 40: 'corruptor', 50: 'voidlord' },
    },
    rewards: {
      easyClear:   { type: 'unlock-card',  id: 'ice_chip' },
      mediumClear: { type: 'unlock-card',  id: 'overclock_3' },
      hardClear:   { type: 'unlock-card',  id: 'immortal_protocol' },
    },
  },

  // ============ 4. MAINFRAME — Retro Mainframe ============
  {
    id: 'mainframe',
    name: 'MAINFRAME',
    fullName: 'LEGACY TERMINAL',
    order: 4,
    cols: 9,
    rows: 15,
    paths: [{
      points: [
        { x: 0, y: 1 }, { x: 7, y: 1 }, { x: 7, y: 4 }, { x: 1, y: 4 },
        { x: 1, y: 7 }, { x: 7, y: 7 }, { x: 7, y: 10 }, { x: 1, y: 10 },
        { x: 1, y: 13 }, { x: 7, y: 13 }, { x: 7, y: 14 },
      ],
    }],
    bgColor: '#020a02',
    accentColor: '#00ff88',
    secondaryColor: '#3eff9c',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['worm', 'spider', 'glitch'],
      phase2: ['worm', 'trojan', 'leech'],
      phase3: ['trojan', 'rootkit', 'leech', 'juggernaut'],
    },
    bosses: {
      easy:   { 10: 'kernel', 20: 'swarm' },
      medium: { 10: 'kernel', 20: 'daemon', 30: 'swarm' },
      hard:   { 10: 'kernel', 20: 'daemon', 30: 'swarm', 40: 'leviathan', 50: 'voidlord' },
    },
    rewards: {
      easyClear:   { type: 'unlock-card',  id: 'economist' },
      mediumClear: { type: 'unlock-tower', id: 'mine' },
      hardClear:   { type: 'unlock-card',  id: 'prism_account' },
    },
  },

  // ============ 5. DATA LAKE — Aquatic Data Storage ============
  {
    id: 'datalake',
    name: 'DATA LAKE',
    fullName: 'AQUATIC ARCHIVE',
    order: 5,
    cols: 11,
    rows: 13,
    paths: [
      {
        points: [
          { x: 0, y: 3 }, { x: 4, y: 3 }, { x: 4, y: 9 }, { x: 10, y: 9 }, { x: 10, y: 12 },
        ],
      },
      {
        points: [
          { x: 10, y: 0 }, { x: 10, y: 5 }, { x: 6, y: 5 }, { x: 6, y: 9 }, { x: 10, y: 9 }, { x: 10, y: 12 },
        ],
      },
    ],
    bgColor: '#001a24',
    accentColor: '#00aaff',
    secondaryColor: '#00fff0',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['spider', 'worm'],
      phase2: ['phantom', 'leech', 'trojan'],
      phase3: ['phantom', 'rootkit', 'wraith'],
    },
    bosses: {
      easy:   { 10: 'leviathan', 20: 'kernel' },
      medium: { 10: 'leviathan', 20: 'daemon', 30: 'swarm' },
      hard:   { 10: 'leviathan', 20: 'daemon', 30: 'corruptor', 40: 'swarm', 50: 'voidlord' },
    },
    rewards: {
      easyClear:   { type: 'unlock-card',  id: 'crit_injector' },
      mediumClear: { type: 'unlock-card',  id: 'hardened_core' },
      hardClear:   { type: 'unlock-tower', id: 'chain' },
    },
  },

  // ============ 6. CRYPTO VAULT — Spiral Vault ============
  {
    id: 'crypto',
    name: 'CRYPTO VAULT',
    fullName: 'COLD STORAGE',
    order: 6,
    cols: 11,
    rows: 13,
    paths: [{
      points: [
        { x: 0, y: 6 }, { x: 9, y: 6 }, { x: 9, y: 1 }, { x: 1, y: 1 },
        { x: 1, y: 11 }, { x: 8, y: 11 }, { x: 8, y: 4 }, { x: 4, y: 4 },
        { x: 4, y: 8 }, { x: 6, y: 8 }, { x: 6, y: 9 },
      ],
    }],
    bgColor: '#1a1000',
    accentColor: '#ffd600',
    secondaryColor: '#ffae00',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['worm', 'spider', 'trojan'],
      phase2: ['trojan', 'rootkit', 'bomber', 'glitch'],
      phase3: ['rootkit', 'wraith', 'bomber', 'juggernaut'],
    },
    bosses: {
      easy:   { 10: 'daemon', 20: 'swarm' },
      medium: { 10: 'daemon', 20: 'swarm', 30: 'corruptor' },
      hard:   { 10: 'daemon', 20: 'swarm', 30: 'corruptor', 40: 'leviathan', 50: 'voidlord' },
    },
    rewards: {
      easyClear:   { type: 'unlock-card',  id: 'dark_pool' },
      mediumClear: { type: 'unlock-card',  id: 'overclock_3' },
      hardClear:   { type: 'unlock-card',  id: 'replicator' },
    },
  },

  // ============ 7. NEON DISTRICT — Street-level Cyberpunk ============
  {
    id: 'neondistrict',
    name: 'NEON DISTRICT',
    fullName: 'STREET GRID',
    order: 7,
    cols: 11,
    rows: 13,
    paths: [
      {
        points: [
          { x: 0, y: 2 }, { x: 7, y: 2 }, { x: 7, y: 6 }, { x: 3, y: 6 },
          { x: 3, y: 10 }, { x: 10, y: 10 }, { x: 10, y: 12 },
        ],
      },
      {
        points: [
          { x: 10, y: 0 }, { x: 10, y: 4 }, { x: 3, y: 4 }, { x: 3, y: 8 },
          { x: 8, y: 8 }, { x: 8, y: 10 }, { x: 10, y: 10 }, { x: 10, y: 12 },
        ],
      },
    ],
    bgColor: '#120020',
    accentColor: '#ff2d95',
    secondaryColor: '#b847ff',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['spider', 'worm'],
      phase2: ['phantom', 'stealth', 'trojan'],
      phase3: ['stealth', 'wraith', 'rootkit'],
    },
    bosses: {
      easy:   { 10: 'daemon', 20: 'corruptor' },
      medium: { 10: 'daemon', 20: 'corruptor', 30: 'leviathan' },
      hard:   { 10: 'daemon', 20: 'corruptor', 30: 'leviathan', 40: 'swarm', 50: 'voidlord' },
    },
    rewards: {
      easyClear:   { type: 'unlock-card',  id: 'sniper_protocol' },
      mediumClear: { type: 'unlock-card',  id: 'signal_amplifier' },
      hardClear:   { type: 'unlock-card',  id: 'legendary_overclock' },
    },
  },

  // ============ 8. ORBITAL NODE — Space Station ============
  {
    id: 'orbital',
    name: 'ORBITAL',
    fullName: 'LAGRANGE STATION',
    order: 8,
    cols: 11,
    rows: 13,
    paths: [
      { points: [{ x: 0, y: 6 }, { x: 4, y: 6 }, { x: 4, y: 10 }, { x: 5, y: 10 }, { x: 5, y: 12 }] },
      { points: [{ x: 10, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 10 }, { x: 5, y: 10 }, { x: 5, y: 12 }] },
      { points: [{ x: 5, y: 0 }, { x: 5, y: 4 }, { x: 5, y: 10 }, { x: 5, y: 12 }] },
    ],
    bgColor: '#050818',
    accentColor: '#00fff0',
    secondaryColor: '#8fccff',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['spider', 'worm', 'trojan'],
      phase2: ['phantom', 'stealth', 'rootkit'],
      phase3: ['wraith', 'stealth', 'rootkit'],
    },
    bosses: {
      easy:   { 10: 'swarm', 20: 'leviathan' },
      medium: { 10: 'swarm', 20: 'leviathan', 30: 'corruptor' },
      hard:   { 10: 'swarm', 20: 'leviathan', 30: 'corruptor', 40: 'daemon', 50: 'voidlord' },
    },
    rewards: {
      easyClear:   { type: 'unlock-card',  id: 'firewall_specialist' },
      mediumClear: { type: 'unlock-card',  id: 'hyperthread' },
      hardClear:   { type: 'unlock-card',  id: 'time_dilation' },
    },
  },

  // ============ 9. INFERNET — Corrupted Hellscape ============
  {
    id: 'infernet',
    name: 'INFERNET',
    fullName: 'CORRUPTED SECTOR',
    order: 9,
    cols: 11,
    rows: 13,
    paths: [
      {
        points: [
          { x: 0, y: 3 }, { x: 5, y: 3 }, { x: 5, y: 8 },
          { x: 5, y: 12 },
        ],
      },
      {
        points: [
          { x: 10, y: 3 }, { x: 5, y: 3 }, { x: 5, y: 8 }, { x: 5, y: 12 },
        ],
      },
      // Shortcut path (carries elites)
      {
        points: [
          { x: 5, y: 0 }, { x: 5, y: 12 },
        ],
      },
    ],
    bgColor: '#200800',
    accentColor: '#ff6600',
    secondaryColor: '#ff3355',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['spider', 'trojan', 'bomber'],
      phase2: ['bomber', 'phantom', 'wraith', 'parasite'],
      phase3: ['wraith', 'rootkit', 'corruptor', 'juggernaut'],
    },
    bosses: {
      easy:   { 10: 'daemon', 20: 'corruptor' },
      medium: { 10: 'daemon', 20: 'corruptor', 30: 'swarm' },
      hard:   { 10: 'daemon', 20: 'corruptor', 30: 'swarm', 40: 'leviathan', 50: 'voidlord' },
    },
    rewards: {
      easyClear:   { type: 'unlock-card',  id: 'crypto_heist' },
      mediumClear: { type: 'unlock-card',  id: 'economist' },
      hardClear:   { type: 'unlock-tower', id: 'railgun' },
    },
  },

  // ============ 10. DEEP ROOT — Organic Endgame ============
  {
    id: 'deeproot',
    name: 'DEEP ROOT',
    fullName: 'RHIZOMAL NETWORK',
    order: 10,
    cols: 11,
    rows: 15,
    paths: [
      {
        points: [
          { x: 0, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 7 }, { x: 5, y: 7 }, { x: 5, y: 11 }, { x: 5, y: 14 },
        ],
      },
      {
        points: [
          { x: 10, y: 2 }, { x: 7, y: 2 }, { x: 7, y: 7 }, { x: 5, y: 7 }, { x: 5, y: 11 }, { x: 5, y: 14 },
        ],
      },
      {
        points: [
          { x: 2, y: 0 }, { x: 2, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 11 }, { x: 5, y: 14 },
        ],
      },
      {
        points: [
          { x: 8, y: 0 }, { x: 8, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 11 }, { x: 5, y: 14 },
        ],
      },
    ],
    bgColor: '#020a00',
    accentColor: '#00ff88',
    secondaryColor: '#3eff9c',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['trojan', 'spider', 'leech'],
      phase2: ['rootkit', 'phantom', 'wraith'],
      phase3: ['wraith', 'stealth', 'corruptor'],
    },
    bosses: {
      easy:   { 10: 'leviathan', 20: 'voidlord' },
      medium: { 10: 'leviathan', 20: 'corruptor', 30: 'voidlord' },
      hard:   { 10: 'leviathan', 20: 'corruptor', 30: 'swarm', 40: 'daemon', 50: 'voidlord' },
    },
    rewards: {
      easyClear:   { type: 'unlock-card',  id: 'time_dilation' },
      mediumClear: { type: 'unlock-card',  id: 'replicator' },
      hardClear:   { type: 'unlock-card',  id: 'immortal_protocol' },
    },
  },

  // ============ ∞ SURVIVAL.EXE — Infinite Null Zone ============
  {
    id: 'survival',
    name: 'SURVIVAL.EXE',
    fullName: 'NULL ZONE',
    order: 11,
    cols: 9,
    rows: 15,
    paths: [{
      points: [
        { x: 0, y: 2 }, { x: 6, y: 2 }, { x: 6, y: 5 }, { x: 2, y: 5 },
        { x: 2, y: 8 }, { x: 6, y: 8 }, { x: 6, y: 11 }, { x: 2, y: 11 },
        { x: 2, y: 14 },
      ],
    }],
    bgColor: '#0a0014',
    accentColor: '#b847ff',
    secondaryColor: '#ff2d95',
    difficulties: {
      // All three tiers set to "infinite" (9999 waves). UI will show ∞.
      easy:   { waves: 9999, startHp: 25, hpScale: 1.22, speedScale: 1.02, rewardScale: 1.0 },
      medium: { waves: 9999, startHp: 20, hpScale: 1.26, speedScale: 1.03, rewardScale: 0.95 },
      hard:   { waves: 9999, startHp: 15, hpScale: 1.32, speedScale: 1.05, rewardScale: 0.9 },
    },
    enemyPool: {
      phase1: ['worm', 'spider', 'trojan'],
      phase2: ['phantom', 'rootkit', 'wraith'],
      phase3: ['wraith', 'stealth', 'corruptor'],
    },
    bosses: {
      // Repeating boss cycle every 10 waves
      easy:   { 10: 'kernel', 20: 'daemon', 30: 'leviathan', 40: 'swarm', 50: 'corruptor', 60: 'voidlord', 70: 'kernel', 80: 'daemon', 90: 'leviathan', 100: 'voidlord' },
      medium: { 10: 'daemon', 20: 'leviathan', 30: 'corruptor', 40: 'swarm', 50: 'voidlord', 60: 'daemon', 70: 'leviathan', 80: 'corruptor', 90: 'swarm', 100: 'voidlord' },
      hard:   { 10: 'leviathan', 20: 'corruptor', 30: 'swarm', 40: 'voidlord', 50: 'voidlord', 60: 'leviathan', 70: 'corruptor', 80: 'swarm', 90: 'voidlord', 100: 'voidlord' },
    },
    rewards: {},
  },
];

export function getMap(id: string): MapDef {
  const m = MAPS.find((m) => m.id === id);
  if (!m) throw new Error(`Unknown map: ${id}`);
  return m;
}

// Convert a path (grid corners) to a list of interpolated grid-space points for smooth movement.
export function pathSegments(path: { points: { x: number; y: number }[] }): Array<{
  from: { x: number; y: number };
  to: { x: number; y: number };
  length: number;
  cumulative: number;
}> {
  const segs: Array<{
    from: { x: number; y: number };
    to: { x: number; y: number };
    length: number;
    cumulative: number;
  }> = [];
  let cumulative = 0;
  for (let i = 0; i < path.points.length - 1; i++) {
    const from = path.points[i];
    const to = path.points[i + 1];
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    segs.push({ from, to, length, cumulative });
    cumulative += length;
  }
  return segs;
}

export function pathLength(path: { points: { x: number; y: number }[] }): number {
  let total = 0;
  for (let i = 0; i < path.points.length - 1; i++) {
    total += Math.hypot(path.points[i + 1].x - path.points[i].x, path.points[i + 1].y - path.points[i].y);
  }
  return total;
}

// Get position along path given progress in grid units.
export function posOnPath(
  path: { points: { x: number; y: number }[] },
  progress: number,
): { x: number; y: number; angle: number } {
  const segs = pathSegments(path);
  for (const s of segs) {
    if (progress <= s.cumulative + s.length) {
      const t = (progress - s.cumulative) / s.length;
      const x = s.from.x + (s.to.x - s.from.x) * t;
      const y = s.from.y + (s.to.y - s.from.y) * t;
      const angle = Math.atan2(s.to.y - s.from.y, s.to.x - s.from.x);
      return { x, y, angle };
    }
  }
  const last = path.points[path.points.length - 1];
  const prev = path.points[path.points.length - 2];
  return { x: last.x, y: last.y, angle: Math.atan2(last.y - prev.y, last.x - prev.x) };
}

// Is a grid cell on any path (or adjacent to it, which we disallow for building)?
export function isPathCell(map: MapDef, gx: number, gy: number): boolean {
  for (const p of map.paths) {
    for (let i = 0; i < p.points.length - 1; i++) {
      const a = p.points[i];
      const b = p.points[i + 1];
      const steps = Math.max(1, Math.floor(Math.hypot(b.x - a.x, b.y - a.y) * 4));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        if (Math.abs(x - gx) < 0.5 && Math.abs(y - gy) < 0.5) return true;
      }
    }
  }
  return false;
}

export function isSurvival(mapId: string): boolean { return mapId === 'survival'; }
