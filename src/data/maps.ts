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
      easyClear:   { type: 'unlock-tower', id: 'data_miner' },
      mediumClear: { type: 'unlock-tower', id: 'quantum' },
      hardClear:   { type: 'unlock-tower', id: 'antivirus' },
    },
    sector: 1,
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
      easyClear:   { type: 'unlock-tower', id: 'scrambler' },
      mediumClear: { type: 'unlock-tower', id: 'pulse' },
      hardClear:   { type: 'unlock-card',  id: 'exotic_kill_feed' },
    },
    sector: 1,
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
      easyClear:   { type: 'unlock-tower', id: 'chain' },
      mediumClear: { type: 'unlock-tower', id: 'ice' },
      hardClear:   { type: 'unlock-card',  id: 'exotic_redundancy' },
    },
    sector: 1,
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
      easyClear:   { type: 'unlock-tower', id: 'sniper' },
      mediumClear: { type: 'unlock-tower', id: 'mine' },
      hardClear:   { type: 'unlock-card',  id: 'syn_fw_hp' },
    },
    sector: 1,
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
      easyClear:   { type: 'unlock-tower', id: 'sentinel' },
      mediumClear: { type: 'unlock-tower', id: 'railgun' },
      hardClear:   { type: 'unlock-card',  id: 'syn_hp_se' },
    },
    sector: 1,
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
      easyClear:   { type: 'unlock-card', id: 'syn_av_sn' },
      mediumClear: { type: 'unlock-card', id: 'syn_av_qm' },
      hardClear:   { type: 'unlock-card', id: 'exotic_time_dilation' },
    },
    sector: 2,
    modifiers: { packetBursts: 0.3 },
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
      easyClear:   { type: 'unlock-card', id: 'syn_ic_sc' },
      mediumClear: { type: 'unlock-card', id: 'syn_qm_sc' },
      hardClear:   { type: 'unlock-card', id: 'syn_ch_ps' },
    },
    sector: 2,
    modifiers: { packetBursts: 0.3 },
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
      easyClear:   { type: 'unlock-card', id: 'syn_fw_av' },
      mediumClear: { type: 'unlock-card', id: 'syn_hp_ic' },
      hardClear:   { type: 'unlock-card', id: 'exotic_replicator' },
    },
    sector: 2,
    modifiers: { packetBursts: 0.3 },
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
      easyClear:   { type: 'unlock-card', id: 'syn_fw_se' },
      mediumClear: { type: 'unlock-card', id: 'syn_ch_se' },
      hardClear:   { type: 'unlock-card', id: 'syn_rl_sn' },
    },
    sector: 2,
    modifiers: { packetBursts: 0.3 },
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
      easyClear:   { type: 'unlock-card', id: 'syn_qm_sn' },
      mediumClear: { type: 'unlock-card', id: 'syn_fw_ch' },
      hardClear:   { type: 'unlock-card', id: 'heal_revive' },
    },
    sector: 2,
    modifiers: { packetBursts: 0.3 },
  },

  // ========================================================================
  // SECTOR 3 — DEEP CORE (encrypted payloads)
  // ========================================================================

  // ============ 11. HARDLOCK ============
  {
    id: 'hardlock',
    name: 'HARDLOCK',
    fullName: 'SEALED VAULT',
    order: 11,
    cols: 10,
    rows: 13,
    paths: [{
      points: [
        { x: 0, y: 2 }, { x: 6, y: 2 }, { x: 6, y: 5 }, { x: 2, y: 5 },
        { x: 2, y: 9 }, { x: 9, y: 9 }, { x: 9, y: 12 },
      ],
    }],
    bgColor: '#100400',
    accentColor: '#ff3355',
    secondaryColor: '#ff6600',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['worm', 'spider'],
      phase2: ['trojan', 'rootkit', 'juggernaut'],
      phase3: ['rootkit', 'juggernaut', 'daemon'],
    },
    bosses: {
      easy:   { 10: 'kernel', 20: 'daemon' },
      medium: { 10: 'kernel', 20: 'daemon', 30: 'leviathan' },
      hard:   { 10: 'kernel', 20: 'daemon', 30: 'leviathan', 40: 'corruptor', 50: 'leviathan' },
    },
    rewards: {
      easyClear:   { type: 'unlock-card', id: 'syn_hp_mn' },
      mediumClear: { type: 'protocols',   id: '50' },
      hardClear:   { type: 'unlock-card', id: 'exotic_replicator' },
    },
    sector: 3,
    modifiers: { encrypted: 0.20 },
  },

  // ============ 12. IRONFRAME ============
  {
    id: 'ironframe',
    name: 'IRONFRAME',
    fullName: 'REINFORCED LATTICE',
    order: 12,
    cols: 11,
    rows: 14,
    paths: [{
      points: [
        { x: 0, y: 3 }, { x: 4, y: 3 }, { x: 4, y: 7 }, { x: 8, y: 7 },
        { x: 8, y: 2 }, { x: 10, y: 2 }, { x: 10, y: 11 }, { x: 5, y: 11 }, { x: 5, y: 13 },
      ],
    }],
    bgColor: '#100400',
    accentColor: '#ff3355',
    secondaryColor: '#ff6600',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['spider', 'trojan'],
      phase2: ['trojan', 'rootkit', 'juggernaut'],
      phase3: ['juggernaut', 'kernel', 'daemon'],
    },
    bosses: {
      easy:   { 10: 'kernel', 20: 'leviathan' },
      medium: { 10: 'kernel', 20: 'daemon', 30: 'leviathan' },
      hard:   { 10: 'kernel', 20: 'daemon', 30: 'leviathan', 40: 'swarm', 50: 'leviathan' },
    },
    rewards: {
      easyClear:   { type: 'unlock-card', id: 'syn_ic_ps' },
      mediumClear: { type: 'unlock-card', id: 'exotic_redundancy' },
      hardClear:   { type: 'protocols',   id: '100' },
    },
    sector: 3,
    modifiers: { encrypted: 0.20 },
  },

  // ============ 13. BASTION ============
  {
    id: 'bastion',
    name: 'BASTION',
    fullName: 'OUTER WARD',
    order: 13,
    cols: 11,
    rows: 14,
    paths: [{
      points: [
        { x: 0, y: 6 }, { x: 3, y: 6 }, { x: 3, y: 2 }, { x: 7, y: 2 },
        { x: 7, y: 9 }, { x: 1, y: 9 }, { x: 1, y: 12 }, { x: 10, y: 12 }, { x: 10, y: 13 },
      ],
    }],
    bgColor: '#100400',
    accentColor: '#ff3355',
    secondaryColor: '#ff6600',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['worm', 'spider', 'trojan'],
      phase2: ['rootkit', 'juggernaut', 'daemon'],
      phase3: ['juggernaut', 'kernel', 'daemon'],
    },
    bosses: {
      easy:   { 10: 'daemon', 20: 'leviathan' },
      medium: { 10: 'kernel', 20: 'daemon', 30: 'leviathan' },
      hard:   { 10: 'kernel', 20: 'daemon', 30: 'leviathan', 40: 'corruptor', 50: 'leviathan' },
    },
    rewards: {
      easyClear:   { type: 'unlock-card', id: 'syn_rl_mn' },
      mediumClear: { type: 'protocols',   id: '50' },
      hardClear:   { type: 'unlock-card', id: 'heal_revive' },
    },
    sector: 3,
    modifiers: { encrypted: 0.20 },
  },

  // ============ 14. RAMPART ============
  {
    id: 'rampart',
    name: 'RAMPART',
    fullName: 'CRIMSON BULWARK',
    order: 14,
    cols: 12,
    rows: 14,
    paths: [{
      points: [
        { x: 0, y: 1 }, { x: 5, y: 1 }, { x: 5, y: 5 }, { x: 2, y: 5 },
        { x: 2, y: 9 }, { x: 9, y: 9 }, { x: 9, y: 4 }, { x: 11, y: 4 },
        { x: 11, y: 12 }, { x: 3, y: 12 }, { x: 3, y: 13 },
      ],
    }],
    bgColor: '#100400',
    accentColor: '#ff3355',
    secondaryColor: '#ff6600',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['spider', 'trojan', 'worm'],
      phase2: ['rootkit', 'juggernaut', 'kernel'],
      phase3: ['juggernaut', 'kernel', 'daemon'],
    },
    bosses: {
      easy:   { 10: 'kernel', 20: 'daemon' },
      medium: { 10: 'daemon', 20: 'kernel', 30: 'leviathan' },
      hard:   { 10: 'kernel', 20: 'daemon', 30: 'leviathan', 40: 'swarm', 50: 'leviathan' },
    },
    rewards: {
      easyClear:   { type: 'protocols',   id: '50' },
      mediumClear: { type: 'unlock-card', id: 'syn_sc_ps' },
      hardClear:   { type: 'protocols',   id: '100' },
    },
    sector: 3,
    modifiers: { encrypted: 0.20 },
  },

  // ============ 15. KEEPSAKE ============
  {
    id: 'keepsake',
    name: 'KEEPSAKE',
    fullName: 'INNER SANCTUM',
    order: 15,
    cols: 12,
    rows: 15,
    paths: [
      {
        points: [
          { x: 0, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 7 }, { x: 8, y: 7 },
          { x: 8, y: 11 }, { x: 6, y: 11 }, { x: 6, y: 14 },
        ],
      },
      {
        points: [
          { x: 0, y: 13 }, { x: 2, y: 13 }, { x: 2, y: 9 }, { x: 4, y: 9 },
          { x: 4, y: 12 }, { x: 6, y: 12 }, { x: 6, y: 14 },
        ],
      },
    ],
    bgColor: '#100400',
    accentColor: '#ff3355',
    secondaryColor: '#ff6600',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['spider', 'trojan', 'worm'],
      phase2: ['rootkit', 'kernel', 'daemon'],
      phase3: ['juggernaut', 'daemon', 'leviathan'],
    },
    bosses: {
      easy:   { 10: 'daemon', 20: 'leviathan' },
      medium: { 10: 'daemon', 20: 'leviathan', 30: 'corruptor' },
      hard:   { 10: 'kernel', 20: 'daemon', 30: 'leviathan', 40: 'corruptor', 50: 'leviathan' },
    },
    rewards: {
      easyClear:   { type: 'unlock-card', id: 'syn_ch_mn' },
      mediumClear: { type: 'unlock-card', id: 'exotic_replicator' },
      hardClear:   { type: 'protocols',   id: '150' },
    },
    sector: 3,
    modifiers: { encrypted: 0.20 },
  },

  // ========================================================================
  // SECTOR 4 — NEON UNDERGROUND (stealth protocol)
  // ========================================================================

  // ============ 16. GLITCHWIRE ============
  {
    id: 'glitchwire',
    name: 'GLITCHWIRE',
    fullName: 'UNSTABLE MESH',
    order: 16,
    cols: 10,
    rows: 13,
    paths: [{
      points: [
        { x: 0, y: 4 }, { x: 3, y: 4 }, { x: 3, y: 1 }, { x: 7, y: 1 },
        { x: 7, y: 6 }, { x: 2, y: 6 }, { x: 2, y: 10 }, { x: 9, y: 10 }, { x: 9, y: 12 },
      ],
    }],
    bgColor: '#0e0014',
    accentColor: '#ff2d95',
    secondaryColor: '#b847ff',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['spider', 'glitch'],
      phase2: ['trojan', 'phantom', 'glitch'],
      phase3: ['stealth', 'phantom', 'parasite'],
    },
    bosses: {
      easy:   { 10: 'phantom', 20: 'daemon' },
      medium: { 10: 'phantom', 20: 'daemon', 30: 'voidlord' },
      hard:   { 10: 'phantom', 20: 'daemon', 30: 'voidlord', 40: 'corruptor', 50: 'voidlord' },
    },
    rewards: {
      easyClear:   { type: 'protocols',   id: '50' },
      mediumClear: { type: 'unlock-card', id: 'exotic_redundancy' },
      hardClear:   { type: 'protocols',   id: '100' },
    },
    sector: 4,
    modifiers: { stealthChance: 0.30 },
  },

  // ============ 17. NEON SPRAWL ============
  {
    id: 'neonsprawl',
    name: 'NEON SPRAWL',
    fullName: 'CHROME CORRIDOR',
    order: 17,
    cols: 11,
    rows: 14,
    paths: [{
      points: [
        { x: 0, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 6 }, { x: 9, y: 6 },
        { x: 9, y: 3 }, { x: 6, y: 3 }, { x: 6, y: 10 }, { x: 2, y: 10 },
        { x: 2, y: 13 },
      ],
    }],
    bgColor: '#0e0014',
    accentColor: '#ff2d95',
    secondaryColor: '#b847ff',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['spider', 'glitch', 'trojan'],
      phase2: ['phantom', 'rootkit', 'glitch'],
      phase3: ['stealth', 'phantom', 'wraith'],
    },
    bosses: {
      easy:   { 10: 'phantom', 20: 'daemon' },
      medium: { 10: 'phantom', 20: 'daemon', 30: 'voidlord' },
      hard:   { 10: 'phantom', 20: 'daemon', 30: 'voidlord', 40: 'swarm', 50: 'voidlord' },
    },
    rewards: {
      easyClear:   { type: 'unlock-card', id: 'heal_revive' },
      mediumClear: { type: 'protocols',   id: '75' },
      hardClear:   { type: 'unlock-card', id: 'exotic_replicator' },
    },
    sector: 4,
    modifiers: { stealthChance: 0.30 },
  },

  // ============ 18. CHROME ALLEY ============
  {
    id: 'chromealley',
    name: 'CHROME ALLEY',
    fullName: 'BACK-DOOR RUN',
    order: 18,
    cols: 11,
    rows: 14,
    paths: [{
      points: [
        { x: 0, y: 5 }, { x: 3, y: 5 }, { x: 3, y: 2 }, { x: 8, y: 2 },
        { x: 8, y: 8 }, { x: 5, y: 8 }, { x: 5, y: 11 }, { x: 10, y: 11 },
        { x: 10, y: 13 },
      ],
    }],
    bgColor: '#0e0014',
    accentColor: '#ff2d95',
    secondaryColor: '#b847ff',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['spider', 'trojan'],
      phase2: ['phantom', 'stealth', 'rootkit'],
      phase3: ['stealth', 'phantom', 'parasite'],
    },
    bosses: {
      easy:   { 10: 'phantom', 20: 'daemon' },
      medium: { 10: 'daemon', 20: 'voidlord', 30: 'corruptor' },
      hard:   { 10: 'phantom', 20: 'daemon', 30: 'voidlord', 40: 'leviathan', 50: 'voidlord' },
    },
    rewards: {
      easyClear:   { type: 'protocols',   id: '50' },
      mediumClear: { type: 'unlock-card', id: 'exotic_replicator' },
      hardClear:   { type: 'protocols',   id: '100' },
    },
    sector: 4,
    modifiers: { stealthChance: 0.30 },
  },

  // ============ 19. BLACKMARKET ============
  {
    id: 'blackmarket',
    name: 'BLACKMARKET',
    fullName: 'SHADOW BAZAAR',
    order: 19,
    cols: 12,
    rows: 14,
    paths: [
      {
        points: [
          { x: 0, y: 3 }, { x: 4, y: 3 }, { x: 4, y: 6 }, { x: 8, y: 6 },
          { x: 8, y: 10 }, { x: 5, y: 10 }, { x: 5, y: 13 },
        ],
      },
      {
        points: [
          { x: 0, y: 11 }, { x: 2, y: 11 }, { x: 2, y: 8 }, { x: 6, y: 8 },
          { x: 6, y: 12 }, { x: 5, y: 12 }, { x: 5, y: 13 },
        ],
      },
    ],
    bgColor: '#0e0014',
    accentColor: '#ff2d95',
    secondaryColor: '#b847ff',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['trojan', 'spider', 'glitch'],
      phase2: ['phantom', 'stealth', 'rootkit'],
      phase3: ['stealth', 'wraith', 'parasite'],
    },
    bosses: {
      easy:   { 10: 'phantom', 20: 'daemon' },
      medium: { 10: 'daemon', 20: 'voidlord', 30: 'corruptor' },
      hard:   { 10: 'phantom', 20: 'daemon', 30: 'voidlord', 40: 'swarm', 50: 'voidlord' },
    },
    rewards: {
      easyClear:   { type: 'unlock-card', id: 'syn_hp_mn' },
      mediumClear: { type: 'protocols',   id: '75' },
      hardClear:   { type: 'unlock-card', id: 'heal_revive' },
    },
    sector: 4,
    modifiers: { stealthChance: 0.30 },
  },

  // ============ 20. GHOST.RUN ============
  {
    id: 'ghostrun',
    name: 'GHOST.RUN',
    fullName: 'SILENT PROTOCOL',
    order: 20,
    cols: 12,
    rows: 15,
    paths: [
      {
        points: [
          { x: 0, y: 2 }, { x: 5, y: 2 }, { x: 5, y: 6 }, { x: 9, y: 6 },
          { x: 9, y: 11 }, { x: 4, y: 11 }, { x: 4, y: 14 },
        ],
      },
      {
        points: [
          { x: 0, y: 9 }, { x: 2, y: 9 }, { x: 2, y: 13 }, { x: 6, y: 13 },
          { x: 6, y: 12 }, { x: 4, y: 12 }, { x: 4, y: 14 },
        ],
      },
    ],
    bgColor: '#0e0014',
    accentColor: '#ff2d95',
    secondaryColor: '#b847ff',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['spider', 'trojan', 'glitch'],
      phase2: ['stealth', 'phantom', 'rootkit'],
      phase3: ['stealth', 'phantom', 'wraith', 'parasite'],
    },
    bosses: {
      easy:   { 10: 'phantom', 20: 'voidlord' },
      medium: { 10: 'phantom', 20: 'daemon', 30: 'voidlord' },
      hard:   { 10: 'phantom', 20: 'daemon', 30: 'voidlord', 40: 'corruptor', 50: 'voidlord' },
    },
    rewards: {
      easyClear:   { type: 'unlock-card', id: 'exotic_redundancy' },
      mediumClear: { type: 'protocols',   id: '100' },
      hardClear:   { type: 'protocols',   id: '150' },
    },
    sector: 4,
    modifiers: { stealthChance: 0.30 },
  },

  // ========================================================================
  // SECTOR 5 — VOID NETWORK (replication virus)
  // ========================================================================

  // ============ 21. VOIDREACH ============
  {
    id: 'voidreach',
    name: 'VOIDREACH',
    fullName: 'OUTER NULL',
    order: 21,
    cols: 11,
    rows: 14,
    paths: [
      {
        points: [
          { x: 0, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 6 }, { x: 8, y: 6 },
          { x: 8, y: 10 }, { x: 5, y: 10 }, { x: 5, y: 13 },
        ],
      },
      {
        points: [
          { x: 0, y: 11 }, { x: 2, y: 11 }, { x: 2, y: 7 }, { x: 6, y: 7 },
          { x: 6, y: 12 }, { x: 5, y: 12 }, { x: 5, y: 13 },
        ],
      },
    ],
    bgColor: '#040010',
    accentColor: '#5a00aa',
    secondaryColor: '#3300aa',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['worm', 'spider'],
      phase2: ['swarm', 'leech', 'bomber'],
      phase3: ['swarm', 'parasite', 'glitch'],
    },
    bosses: {
      easy:   { 10: 'trojan', 20: 'leviathan' },
      medium: { 10: 'trojan', 20: 'leviathan', 30: 'voidlord' },
      hard:   { 10: 'trojan', 20: 'leviathan', 30: 'voidlord', 40: 'swarm', 50: 'voidlord' },
    },
    rewards: {
      easyClear:   { type: 'unlock-card', id: 'syn_sc_ps' },
      mediumClear: { type: 'protocols',   id: '75' },
      hardClear:   { type: 'unlock-card', id: 'exotic_replicator' },
    },
    sector: 5,
    modifiers: { replication: 0.25 },
  },

  // ============ 22. NULL SECTOR ============
  {
    id: 'nullsector',
    name: 'NULL SECTOR',
    fullName: 'DEAD ZONE',
    order: 22,
    cols: 12,
    rows: 14,
    paths: [
      {
        points: [
          { x: 0, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 7 }, { x: 7, y: 7 },
          { x: 7, y: 10 }, { x: 10, y: 10 }, { x: 10, y: 13 },
        ],
      },
      {
        points: [
          { x: 0, y: 9 }, { x: 5, y: 9 }, { x: 5, y: 11 }, { x: 8, y: 11 },
          { x: 8, y: 12 }, { x: 10, y: 12 }, { x: 10, y: 13 },
        ],
      },
    ],
    bgColor: '#040010',
    accentColor: '#5a00aa',
    secondaryColor: '#3300aa',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['worm', 'spider', 'swarm'],
      phase2: ['swarm', 'leech', 'bomber'],
      phase3: ['swarm', 'parasite', 'glitch'],
    },
    bosses: {
      easy:   { 10: 'trojan', 20: 'leviathan' },
      medium: { 10: 'leviathan', 20: 'voidlord', 30: 'corruptor' },
      hard:   { 10: 'trojan', 20: 'leviathan', 30: 'voidlord', 40: 'swarm', 50: 'voidlord' },
    },
    rewards: {
      easyClear:   { type: 'unlock-card', id: 'syn_ic_ps' },
      mediumClear: { type: 'unlock-card', id: 'heal_revive' },
      hardClear:   { type: 'protocols',   id: '100' },
    },
    sector: 5,
    modifiers: { replication: 0.25 },
  },

  // ============ 23. FRACTAL DEPTH ============
  {
    id: 'fractaldepth',
    name: 'FRACTAL DEPTH',
    fullName: 'RECURSIVE VOID',
    order: 23,
    cols: 12,
    rows: 15,
    paths: [
      {
        points: [
          { x: 0, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 5 }, { x: 7, y: 5 },
          { x: 7, y: 8 }, { x: 4, y: 8 }, { x: 4, y: 11 }, { x: 9, y: 11 },
          { x: 9, y: 14 },
        ],
      },
      {
        points: [
          { x: 0, y: 10 }, { x: 2, y: 10 }, { x: 2, y: 13 }, { x: 6, y: 13 },
          { x: 6, y: 12 }, { x: 9, y: 12 }, { x: 9, y: 14 },
        ],
      },
    ],
    bgColor: '#040010',
    accentColor: '#5a00aa',
    secondaryColor: '#3300aa',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['spider', 'worm', 'swarm'],
      phase2: ['leech', 'bomber', 'parasite'],
      phase3: ['swarm', 'glitch', 'parasite', 'bomber'],
    },
    bosses: {
      easy:   { 10: 'trojan', 20: 'leviathan' },
      medium: { 10: 'leviathan', 20: 'voidlord', 30: 'corruptor' },
      hard:   { 10: 'trojan', 20: 'leviathan', 30: 'voidlord', 40: 'corruptor', 50: 'voidlord' },
    },
    rewards: {
      easyClear:   { type: 'protocols',   id: '75' },
      mediumClear: { type: 'unlock-card', id: 'exotic_redundancy' },
      hardClear:   { type: 'protocols',   id: '150' },
    },
    sector: 5,
    modifiers: { replication: 0.25 },
  },

  // ============ 24. BREACH POINT ============
  {
    id: 'breachpoint',
    name: 'BREACH POINT',
    fullName: 'COLLAPSING NODE',
    order: 24,
    cols: 12,
    rows: 15,
    paths: [
      {
        points: [
          { x: 0, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 6 }, { x: 9, y: 6 },
          { x: 9, y: 10 }, { x: 6, y: 10 }, { x: 6, y: 14 },
        ],
      },
      {
        points: [
          { x: 0, y: 12 }, { x: 3, y: 12 }, { x: 3, y: 8 }, { x: 7, y: 8 },
          { x: 7, y: 13 }, { x: 6, y: 13 }, { x: 6, y: 14 },
        ],
      },
    ],
    bgColor: '#040010',
    accentColor: '#5a00aa',
    secondaryColor: '#3300aa',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['worm', 'spider', 'swarm'],
      phase2: ['leech', 'bomber', 'parasite', 'glitch'],
      phase3: ['swarm', 'parasite', 'bomber', 'glitch'],
    },
    bosses: {
      easy:   { 10: 'leviathan', 20: 'voidlord' },
      medium: { 10: 'leviathan', 20: 'voidlord', 30: 'corruptor' },
      hard:   { 10: 'trojan', 20: 'leviathan', 30: 'voidlord', 40: 'swarm', 50: 'voidlord' },
    },
    rewards: {
      easyClear:   { type: 'unlock-card', id: 'exotic_replicator' },
      mediumClear: { type: 'protocols',   id: '100' },
      hardClear:   { type: 'unlock-card', id: 'heal_revive' },
    },
    sector: 5,
    modifiers: { replication: 0.25 },
  },

  // ============ 25. ANTIMATTER ============
  {
    id: 'antimatter',
    name: 'ANTIMATTER',
    fullName: 'REVERSED CORE',
    order: 25,
    cols: 12,
    rows: 16,
    paths: [
      {
        points: [
          { x: 0, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 6 }, { x: 8, y: 6 },
          { x: 8, y: 2 }, { x: 11, y: 2 }, { x: 11, y: 10 }, { x: 5, y: 10 },
          { x: 5, y: 15 },
        ],
      },
      {
        points: [
          { x: 0, y: 13 }, { x: 2, y: 13 }, { x: 2, y: 8 }, { x: 7, y: 8 },
          { x: 7, y: 12 }, { x: 5, y: 12 }, { x: 5, y: 15 },
        ],
      },
    ],
    bgColor: '#040010',
    accentColor: '#5a00aa',
    secondaryColor: '#3300aa',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['spider', 'worm', 'swarm'],
      phase2: ['leech', 'bomber', 'parasite'],
      phase3: ['swarm', 'glitch', 'parasite', 'bomber'],
    },
    bosses: {
      easy:   { 10: 'leviathan', 20: 'voidlord' },
      medium: { 10: 'leviathan', 20: 'voidlord', 30: 'corruptor' },
      hard:   { 10: 'trojan', 20: 'leviathan', 30: 'voidlord', 40: 'corruptor', 50: 'voidlord' },
    },
    rewards: {
      easyClear:   { type: 'protocols',   id: '100' },
      mediumClear: { type: 'unlock-card', id: 'exotic_replicator' },
      hardClear:   { type: 'protocols',   id: '200' },
    },
    sector: 5,
    modifiers: { replication: 0.25 },
  },

  // ========================================================================
  // SECTOR 6 — APEX RUIN (rootkit intrusion)
  // ========================================================================

  // ============ 26. APEX ============
  {
    id: 'apex',
    name: 'APEX',
    fullName: 'SUMMIT NODE',
    order: 26,
    cols: 12,
    rows: 15,
    paths: [
      {
        points: [
          { x: 0, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 6 }, { x: 8, y: 6 },
          { x: 8, y: 10 }, { x: 5, y: 10 }, { x: 5, y: 14 },
        ],
      },
      {
        points: [
          { x: 0, y: 12 }, { x: 3, y: 12 }, { x: 3, y: 8 }, { x: 7, y: 8 },
          { x: 7, y: 13 }, { x: 5, y: 13 }, { x: 5, y: 14 },
        ],
      },
    ],
    bgColor: '#0a0a05',
    accentColor: '#ffd600',
    secondaryColor: '#ffffff',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['trojan', 'rootkit', 'juggernaut'],
      phase2: ['wraith', 'juggernaut', 'daemon'],
      phase3: ['wraith', 'daemon', 'kernel'],
    },
    bosses: {
      easy:   { 10: 'daemon', 20: 'voidlord' },
      medium: { 10: 'daemon', 20: 'voidlord', 30: 'corruptor' },
      hard:   { 10: 'daemon', 20: 'voidlord', 30: 'leviathan', 40: 'voidlord', 50: 'corruptor' },
    },
    rewards: {
      easyClear:   { type: 'unlock-card', id: 'heal_revive' },
      mediumClear: { type: 'protocols',   id: '100' },
      hardClear:   { type: 'unlock-card', id: 'exotic_redundancy' },
    },
    sector: 6,
    modifiers: { rootkit: 8 },
  },

  // ============ 27. OBLITERATOR ============
  {
    id: 'obliterator',
    name: 'OBLITERATOR',
    fullName: 'BURN PROTOCOL',
    order: 27,
    cols: 12,
    rows: 15,
    paths: [
      {
        points: [
          { x: 0, y: 3 }, { x: 5, y: 3 }, { x: 5, y: 7 }, { x: 9, y: 7 },
          { x: 9, y: 11 }, { x: 3, y: 11 }, { x: 3, y: 14 },
        ],
      },
      {
        points: [
          { x: 0, y: 9 }, { x: 2, y: 9 }, { x: 2, y: 5 }, { x: 7, y: 5 },
          { x: 7, y: 13 }, { x: 3, y: 13 }, { x: 3, y: 14 },
        ],
      },
    ],
    bgColor: '#0a0a05',
    accentColor: '#ffd600',
    secondaryColor: '#ffffff',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['trojan', 'rootkit', 'juggernaut'],
      phase2: ['wraith', 'juggernaut', 'daemon'],
      phase3: ['wraith', 'daemon', 'kernel'],
    },
    bosses: {
      easy:   { 10: 'daemon', 20: 'voidlord' },
      medium: { 10: 'daemon', 20: 'voidlord', 30: 'corruptor' },
      hard:   { 10: 'daemon', 20: 'voidlord', 30: 'leviathan', 40: 'voidlord', 50: 'corruptor' },
    },
    rewards: {
      easyClear:   { type: 'protocols',   id: '100' },
      mediumClear: { type: 'unlock-card', id: 'exotic_replicator' },
      hardClear:   { type: 'protocols',   id: '200' },
    },
    sector: 6,
    modifiers: { rootkit: 8 },
  },

  // ============ 28. OMEGA ============
  {
    id: 'omega',
    name: 'OMEGA',
    fullName: 'LAST CIPHER',
    order: 28,
    cols: 12,
    rows: 16,
    paths: [
      {
        points: [
          { x: 0, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 6 }, { x: 9, y: 6 },
          { x: 9, y: 10 }, { x: 6, y: 10 }, { x: 6, y: 15 },
        ],
      },
      {
        points: [
          { x: 0, y: 13 }, { x: 3, y: 13 }, { x: 3, y: 8 }, { x: 7, y: 8 },
          { x: 7, y: 14 }, { x: 6, y: 14 }, { x: 6, y: 15 },
        ],
      },
    ],
    bgColor: '#0a0a05',
    accentColor: '#ffd600',
    secondaryColor: '#ffffff',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['rootkit', 'juggernaut', 'wraith'],
      phase2: ['wraith', 'juggernaut', 'daemon'],
      phase3: ['daemon', 'kernel', 'wraith'],
    },
    bosses: {
      easy:   { 10: 'daemon', 20: 'corruptor' },
      medium: { 10: 'daemon', 20: 'voidlord', 30: 'corruptor' },
      hard:   { 10: 'daemon', 20: 'voidlord', 30: 'leviathan', 40: 'voidlord', 50: 'corruptor' },
    },
    rewards: {
      easyClear:   { type: 'unlock-card', id: 'exotic_replicator' },
      mediumClear: { type: 'protocols',   id: '150' },
      hardClear:   { type: 'unlock-card', id: 'heal_revive' },
    },
    sector: 6,
    modifiers: { rootkit: 8 },
  },

  // ============ 29. FINAL CASCADE ============
  {
    id: 'finalcascade',
    name: 'FINAL CASCADE',
    fullName: 'TERMINAL FALL',
    order: 29,
    cols: 12,
    rows: 16,
    paths: [
      {
        points: [
          { x: 0, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 6 }, { x: 7, y: 6 },
          { x: 7, y: 2 }, { x: 10, y: 2 }, { x: 10, y: 9 }, { x: 5, y: 9 },
          { x: 5, y: 13 }, { x: 8, y: 13 }, { x: 8, y: 15 },
        ],
      },
      {
        points: [
          { x: 0, y: 11 }, { x: 2, y: 11 }, { x: 2, y: 14 }, { x: 6, y: 14 },
          { x: 6, y: 12 }, { x: 8, y: 12 }, { x: 8, y: 15 },
        ],
      },
    ],
    bgColor: '#0a0a05',
    accentColor: '#ffd600',
    secondaryColor: '#ffffff',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['rootkit', 'juggernaut', 'wraith'],
      phase2: ['wraith', 'daemon', 'kernel'],
      phase3: ['daemon', 'kernel', 'wraith'],
    },
    bosses: {
      easy:   { 10: 'daemon', 20: 'voidlord' },
      medium: { 10: 'daemon', 20: 'voidlord', 30: 'corruptor' },
      hard:   { 10: 'daemon', 20: 'voidlord', 30: 'leviathan', 40: 'voidlord', 50: 'corruptor' },
    },
    rewards: {
      easyClear:   { type: 'protocols',   id: '100' },
      mediumClear: { type: 'unlock-card', id: 'exotic_redundancy' },
      hardClear:   { type: 'protocols',   id: '200' },
    },
    sector: 6,
    modifiers: { rootkit: 8 },
  },

  // ============ 30. RUIN.PROTOCOL ============
  {
    id: 'ruinprotocol',
    name: 'RUIN.PROTOCOL',
    fullName: 'FINAL INTRUSION',
    order: 30,
    cols: 12,
    rows: 16,
    paths: [
      {
        points: [
          { x: 0, y: 2 }, { x: 5, y: 2 }, { x: 5, y: 5 }, { x: 2, y: 5 },
          { x: 2, y: 9 }, { x: 9, y: 9 }, { x: 9, y: 4 }, { x: 11, y: 4 },
          { x: 11, y: 12 }, { x: 6, y: 12 }, { x: 6, y: 15 },
        ],
      },
      {
        points: [
          { x: 0, y: 13 }, { x: 3, y: 13 }, { x: 3, y: 10 }, { x: 7, y: 10 },
          { x: 7, y: 14 }, { x: 6, y: 14 }, { x: 6, y: 15 },
        ],
      },
    ],
    bgColor: '#0a0a05',
    accentColor: '#ffd600',
    secondaryColor: '#ffffff',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['rootkit', 'juggernaut', 'wraith'],
      phase2: ['wraith', 'daemon', 'kernel'],
      phase3: ['daemon', 'kernel', 'wraith', 'juggernaut'],
    },
    bosses: {
      easy:   { 10: 'voidlord', 20: 'corruptor' },
      medium: { 10: 'daemon', 20: 'voidlord', 30: 'corruptor' },
      hard:   { 10: 'daemon', 20: 'voidlord', 30: 'leviathan', 40: 'voidlord', 50: 'corruptor' },
    },
    rewards: {
      easyClear:   { type: 'protocols',   id: '150' },
      mediumClear: { type: 'unlock-card', id: 'heal_revive' },
      hardClear:   { type: 'protocols',   id: '500' },
    },
    sector: 6,
    modifiers: { rootkit: 8 },
  },

  // ============ ∞ SURVIVAL.EXE — Infinite Null Zone ============
  {
    id: 'survival',
    name: 'SURVIVAL.EXE',
    fullName: 'NULL ZONE',
    order: 99,
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
