import type { MapDef } from '@/types';

// ─────────────────────────────────────────────────────────────────────────
// NETRUNNER — 28-map / 7-act campaign.
//
// Each act has a named mechanical identity (ACT_META) that surfaces in the
// map-select header and act-briefing modal. Difficulty tiers aren't just
// numeric inflation: the waves module reads DIFFICULTY_PROFILE to swap in
// smaller card drafts, earlier enemy gates, composition skew, and (on hard)
// a random turret lock.
//
// Turret unlock schedule — slow burn, one every ~2 maps across acts 1–3,
// paired with the act's theme:
//   Starter          : FIREWALL + HONEYPOT + ANTIVIRUS
//   Act 1 / Map 1 E  : BOOSTER NODE   (gentle intro to support towers)
//   Act 1 / Map 2 E  : QUANTUM        (high-crit generalist)
//   Act 1 / Map 3 E  : CHAIN LIGHTNING(early AOE)
//   Act 1 / Map 4 E  : ICE-BREAKER    (AOE + reveal — stealth counter)
//   Act 2 / Map 1 E  : SCRAMBLER      (armor strip for act 3 prep)
//   Act 2 / Map 3 E  : PULSE          (EMP burst, big arena clears on lag spikes)
//   Act 2 / Map 4 M  : ARTILLERY      (heavy AOE — rewarded for medium clear)
//   Act 3 / Map 1 E  : SNIPER         (extreme single-target)
//   Act 3 / Map 3 E  : RAILGUN        (pierce legendary)
//   Act 3 / Map 4 M  : SENTINEL NODE  (passive DoT field)
//   Act 4 / Map 1 E  : DATA MINER     (decrypt aura — the final toolkit piece)
// ─────────────────────────────────────────────────────────────────────────

// Tier config after the overhaul. Easy/medium/hard differ by wave count
// and HP-per-wave — but the REAL tier differentiation lives in waves.ts
// (draft size, reroll bonus, phase thresholds, enemy gates, turret lock).
// Rewards scale with tier clear via flat bonuses in main.ts finishRun.
const STANDARD_DIFFICULTIES = {
  easy:   { waves: 20, startHp: 25, hpScale: 1.10, speedScale: 1.01, rewardScale: 1.0  },
  medium: { waves: 30, startHp: 20, hpScale: 1.17, speedScale: 1.03, rewardScale: 0.95 },
  hard:   { waves: 40, startHp: 15, hpScale: 1.24, speedScale: 1.05, rewardScale: 0.9  },
} as const;

// Act display metadata. Referenced by the start screen and the act-briefing
// modal (future) so the player sees a themed lead-in per 4-map arc.
export interface ActMeta {
  act: number;
  name: string;         // "SYSTEM BOOT"
  tagline: string;      // one-line hook
  brief: string;        // longer tutorialish paragraph for briefing modal
}

export const ACTS: ActMeta[] = [
  { act: 1, name: 'SYSTEM BOOT',     tagline: 'Learn the grid.',
    brief: 'Standard intrusions — no network modifiers. Learn your turrets, your card drafts, and the singleton rule. Each map rewards a new turret.' },
  { act: 2, name: 'PACKET STORM',    tagline: 'The network lags — enemies warp.',
    brief: 'LAG SPIKE: every 20s of a wave, every enemy on the grid surges at 2× speed for 1s. Read the telegraph and front-load burst before the surge closes the distance. PULSE arrives early this act.' },
  { act: 3, name: 'ENCRYPTED CORE',  tagline: 'Crack the shield, expose the target.',
    brief: 'ENCRYPTED PAYLOADS: enemies spawn with regenerating data shields absorbed before HP. Cracking a shield EXPOSES the enemy — +25% damage for 3s. Chain, pulse, and scrambler strip shields efficiently. RAILGUN unlocks here.' },
  { act: 4, name: 'STEALTH NET',     tagline: 'Reveal or die.',
    brief: 'STEALTH PROTOCOL: 30% of enemies spawn permanently cloaked. AOE hits reveal them. ICE and pulse are your main counters — DATA MINER unlocks this act.' },
  { act: 5, name: 'VOID SWARM',      tagline: 'Kill the chain reaction.',
    brief: 'REPLICATION VIRUS: killed enemies have a 25% chance to spawn a worm. AOE is essential; lethal-chain builds help you stay ahead.' },
  { act: 6, name: 'APEX RUIN',       tagline: 'Your towers are the target.',
    brief: 'ROOTKIT INTRUSION: every 8 seconds while a boss is alive, a random tower is jammed for 2s. Redundant coverage and boss burn are critical.' },
  { act: 7, name: 'OMEGA PROTOCOL',  tagline: 'Every layer at once.',
    brief: 'FUSION: all five act modifiers are active simultaneously at reduced strength — lag spikes, shield cracks, stealth, replication, and rootkit intrusions. The finale — only proven builds clear Act 7 hard.' },
];

export const MAPS: MapDef[] = [
  // ═════════════════════════════════════════════════════════════════════
  // ACT 1 — SYSTEM BOOT. No modifiers. Turret-unlock waterfall.
  // ═════════════════════════════════════════════════════════════════════

  {
    id: 'grid01',
    name: 'GRID.01',
    fullName: 'TRAINING SUBNET',
    order: 1,
    cols: 18,
    rows: 10,
    // ACT 1 SHAPE: simple single S-curve. Teaches the player how to read paths.
    paths: [{
      points: [
        { x: 0, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 2 }, { x: 12, y: 2 },
        { x: 12, y: 8 }, { x: 18, y: 8 },
      ],
    }],
    bgColor: '#020a14',
    accentColor: '#00fff0',
    secondaryColor: '#00aaff',
    difficulties: STANDARD_DIFFICULTIES,
    // Tutorial pool — no rootkits here. The player only has the 3 starter
    // turrets on their first run and rootkit's 260 HP + 5 armor + 0.45×
    // kinetic resist eats too much time with just firewall/antivirus.
    // Rootkits show up starting on Map 2 (nexus) where the pressure is
    // implicit-permission-granted via the BOOSTER NODE unlock from clearing
    // this map. Medium+ still sees rootkits to keep re-runs spicy.
    enemyPool: {
      phase1: ['worm', 'spider'],
      phase2: ['worm', 'spider', 'trojan'],
      phase3: ['trojan', 'glitch'],
    },
    bosses: {
      easy:   { 10: 'kernel', 20: 'daemon' },
      medium: { 10: 'kernel', 20: 'daemon', 30: 'leviathan' },
      hard:   { 10: 'kernel', 20: 'daemon', 30: 'leviathan', 40: 'voidlord' },
    },
    rewards: {
      easyClear:   { type: 'unlock-tower', id: 'booster_node' },
      mediumClear: { type: 'unlock-card',  id: 'syn_fw_hp' },
      hardClear:   { type: 'unlock-card',  id: 'exotic_kill_feed' },
    },
    sector: 1, act: 1, actName: 'SYSTEM BOOT', actTag: 'Learn the grid.',
  },

  {
    id: 'nexus',
    name: 'NEXUS HUB',
    fullName: 'CORPORATE BACKBONE',
    order: 2,
    cols: 18,
    rows: 10,
    // ACT 1 SHAPE: zigzag with three turns. Introduces longer travel time.
    paths: [{
      points: [
        { x: 0, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 7 }, { x: 10, y: 7 },
        { x: 10, y: 3 }, { x: 15, y: 3 }, { x: 15, y: 8 }, { x: 18, y: 8 },
      ],
    }],
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
      hard:   { 10: 'daemon', 20: 'kernel', 30: 'leviathan', 40: 'swarm' },
    },
    rewards: {
      easyClear:   { type: 'unlock-tower', id: 'quantum' },
      mediumClear: { type: 'unlock-card',  id: 'syn_av_qm' },
      hardClear:   { type: 'protocols',    id: '75' },
    },
    sector: 1, act: 1, actName: 'SYSTEM BOOT', actTag: 'Learn the grid.',
  },

  {
    id: 'mainframe',
    name: 'MAINFRAME',
    fullName: 'LEGACY TERMINAL',
    order: 3,
    cols: 20,
    rows: 11,
    // ACT 1 SHAPE: long horizontal serpentine — the "legacy mainframe" tape-reader
    // feel. Three sweeps left-right with vertical jumps.
    paths: [{
      points: [
        { x: 0, y: 1 }, { x: 16, y: 1 }, { x: 16, y: 4 }, { x: 3, y: 4 },
        { x: 3, y: 7 }, { x: 16, y: 7 }, { x: 16, y: 9 }, { x: 20, y: 9 },
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
      hard:   { 10: 'kernel', 20: 'daemon', 30: 'swarm', 40: 'leviathan' },
    },
    rewards: {
      easyClear:   { type: 'unlock-tower', id: 'chain' },
      mediumClear: { type: 'unlock-card',  id: 'syn_fw_ch' },
      hardClear:   { type: 'unlock-card',  id: 'exotic_redundancy' },
    },
    sector: 1, act: 1, actName: 'SYSTEM BOOT', actTag: 'Learn the grid.',
  },

  {
    id: 'datalake',
    name: 'DATA LAKE',
    fullName: 'AQUATIC ARCHIVE',
    order: 4,
    cols: 19,
    rows: 10,
    // ACT 1 SHAPE: two streams converging at a central junction, then a single
    // exit. Introduces multi-path before the dual-lane Act 2.
    paths: [
      { points: [
        { x: 0, y: 2 }, { x: 8, y: 2 }, { x: 8, y: 5 }, { x: 14, y: 5 }, { x: 19, y: 5 },
      ]},
      { points: [
        { x: 0, y: 8 }, { x: 8, y: 8 }, { x: 8, y: 5 }, { x: 14, y: 5 }, { x: 19, y: 5 },
      ]},
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
      hard:   { 10: 'leviathan', 20: 'daemon', 30: 'corruptor', 40: 'voidlord' },
    },
    rewards: {
      easyClear:   { type: 'unlock-tower', id: 'ice' },
      mediumClear: { type: 'unlock-card',  id: 'syn_hp_ic' },
      hardClear:   { type: 'protocols',    id: '100' },
    },
    sector: 1, act: 1, actName: 'SYSTEM BOOT', actTag: 'Learn the grid.',
  },

  // ═════════════════════════════════════════════════════════════════════
  // ACT 2 — PACKET STORM. LAG SPIKE modifier (20s interval, 1s 2× speed surge).
  // ═════════════════════════════════════════════════════════════════════

  {
    id: 'neondistrict',
    name: 'NEON DISTRICT',
    fullName: 'STREET GRID',
    order: 5,
    cols: 18,
    rows: 10,
    // ACT 2 SHAPE: dual parallel lanes with mirrored zigzags. Packet bursts
    // mean both lanes spawn density bursts simultaneously.
    paths: [
      { points: [
        { x: 0, y: 2 }, { x: 5, y: 2 }, { x: 5, y: 4 }, { x: 12, y: 4 },
        { x: 12, y: 2 }, { x: 18, y: 2 },
      ]},
      { points: [
        { x: 0, y: 8 }, { x: 5, y: 8 }, { x: 5, y: 6 }, { x: 12, y: 6 },
        { x: 12, y: 8 }, { x: 18, y: 8 },
      ]},
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
      hard:   { 10: 'daemon', 20: 'corruptor', 30: 'leviathan', 40: 'swarm' },
    },
    rewards: {
      easyClear:   { type: 'unlock-tower', id: 'scrambler' },
      mediumClear: { type: 'unlock-card',  id: 'syn_qm_sc' },
      hardClear:   { type: 'unlock-card',  id: 'exotic_time_dilation' },
    },
    sector: 2, act: 2, actName: 'PACKET STORM', actTag: 'The network lags — enemies warp.',
    modifiers: { lagSpike: 1 },
  },

  {
    id: 'crypto',
    name: 'CRYPTO VAULT',
    fullName: 'COLD STORAGE',
    order: 6,
    cols: 18,
    rows: 10,
    // ACT 2 SHAPE: vault-mirror — two lanes meeting at a central choke (x=14)
    // before separating again. Forces a hot-zone of overlap.
    paths: [
      { points: [
        { x: 0, y: 1 }, { x: 4, y: 1 }, { x: 4, y: 5 }, { x: 14, y: 5 },
        { x: 14, y: 1 }, { x: 18, y: 1 },
      ]},
      { points: [
        { x: 0, y: 9 }, { x: 4, y: 9 }, { x: 4, y: 5 }, { x: 14, y: 5 },
        { x: 14, y: 9 }, { x: 18, y: 9 },
      ]},
    ],
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
      hard:   { 10: 'daemon', 20: 'swarm', 30: 'corruptor', 40: 'leviathan' },
    },
    rewards: {
      easyClear:   { type: 'unlock-card', id: 'syn_av_sn' },
      mediumClear: { type: 'unlock-card', id: 'syn_ch_ps' },
      hardClear:   { type: 'protocols',   id: '125' },
    },
    sector: 2, act: 2, actName: 'PACKET STORM', actTag: 'The network lags — enemies warp.',
    modifiers: { lagSpike: 1 },
  },

  {
    id: 'orbital',
    name: 'ORBITAL',
    fullName: 'LAGRANGE STATION',
    order: 7,
    cols: 20,
    rows: 11,
    // ACT 2 SHAPE: three orbital approaches converging on a central station,
    // then a single shared exit. Top, middle, and bottom approach lanes.
    paths: [
      { points: [
        { x: 0, y: 2 }, { x: 10, y: 2 }, { x: 10, y: 5 }, { x: 20, y: 5 },
      ]},
      { points: [
        { x: 0, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 8 }, { x: 15, y: 8 },
        { x: 15, y: 5 }, { x: 20, y: 5 },
      ]},
      { points: [
        { x: 0, y: 9 }, { x: 10, y: 9 }, { x: 10, y: 5 }, { x: 20, y: 5 },
      ]},
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
      hard:   { 10: 'swarm', 20: 'leviathan', 30: 'corruptor', 40: 'daemon' },
    },
    rewards: {
      easyClear:   { type: 'unlock-tower', id: 'pulse' },
      mediumClear: { type: 'unlock-card',  id: 'syn_fw_av' },
      hardClear:   { type: 'unlock-card',  id: 'exotic_replicator' },
    },
    sector: 2, act: 2, actName: 'PACKET STORM', actTag: 'The network lags — enemies warp.',
    modifiers: { lagSpike: 1 },
  },

  {
    id: 'infernet',
    name: 'INFERNET',
    fullName: 'CORRUPTED SECTOR',
    order: 8,
    cols: 20,
    rows: 11,
    // ACT 2 SHAPE: dual lanes hugging the top and bottom edges with a hot
    // central choke at x=14 where both squeeze inward before exiting.
    paths: [
      { points: [
        { x: 0, y: 2 }, { x: 6, y: 2 }, { x: 6, y: 5 }, { x: 14, y: 5 },
        { x: 14, y: 2 }, { x: 20, y: 2 },
      ]},
      { points: [
        { x: 0, y: 9 }, { x: 6, y: 9 }, { x: 6, y: 7 }, { x: 14, y: 7 },
        { x: 14, y: 9 }, { x: 20, y: 9 },
      ]},
    ],
    bgColor: '#200800',
    accentColor: '#ff6600',
    secondaryColor: '#ff3355',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['spider', 'trojan', 'bomber'],
      phase2: ['bomber', 'phantom', 'wraith', 'parasite'],
      phase3: ['wraith', 'rootkit', 'bomber', 'juggernaut'],
    },
    bosses: {
      easy:   { 10: 'daemon', 20: 'corruptor' },
      medium: { 10: 'daemon', 20: 'corruptor', 30: 'swarm' },
      hard:   { 10: 'daemon', 20: 'corruptor', 30: 'swarm', 40: 'voidlord' },
    },
    rewards: {
      easyClear:   { type: 'unlock-card',  id: 'syn_fw_se' },
      mediumClear: { type: 'unlock-tower', id: 'mine' },
      hardClear:   { type: 'protocols',    id: '150' },
    },
    sector: 2, act: 2, actName: 'PACKET STORM', actTag: 'The network lags — enemies warp.',
    modifiers: { lagSpike: 1 },
  },

  // ═════════════════════════════════════════════════════════════════════
  // ACT 3 — ENCRYPTED CORE. Shield-regen enemies. Heavy-armor focus.
  // ═════════════════════════════════════════════════════════════════════

  {
    id: 'hardlock',
    name: 'HARDLOCK',
    fullName: 'SEALED VAULT',
    order: 9,
    cols: 18,
    rows: 10,
    // ACT 3 SHAPE: three entries on the left collapse to a single choke point
    // at the right. The choke is where shield-stripping turrets earn their pay.
    paths: [
      { points: [
        { x: 0, y: 2 }, { x: 10, y: 2 }, { x: 10, y: 5 }, { x: 18, y: 5 },
      ]},
      { points: [
        { x: 0, y: 5 }, { x: 8, y: 5 }, { x: 10, y: 5 }, { x: 18, y: 5 },
      ]},
      { points: [
        { x: 0, y: 8 }, { x: 10, y: 8 }, { x: 10, y: 5 }, { x: 18, y: 5 },
      ]},
    ],
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
      hard:   { 10: 'kernel', 20: 'daemon', 30: 'leviathan', 40: 'corruptor' },
    },
    rewards: {
      easyClear:   { type: 'unlock-tower', id: 'sniper' },
      mediumClear: { type: 'unlock-card',  id: 'syn_qm_sn' },
      hardClear:   { type: 'unlock-card',  id: 'heal_revive' },
    },
    sector: 3, act: 3, actName: 'ENCRYPTED CORE', actTag: 'Strip their shields fast.',
    modifiers: { encrypted: 0.20 },
  },

  {
    id: 'ironframe',
    name: 'IRONFRAME',
    fullName: 'REINFORCED LATTICE',
    order: 10,
    cols: 19,
    rows: 10,
    // ACT 3 SHAPE: parallel converging lanes — top and bottom feed a central
    // long stretch where stacked turrets shred the shield-regen enemies.
    paths: [
      { points: [
        { x: 0, y: 3 }, { x: 8, y: 3 }, { x: 8, y: 5 }, { x: 19, y: 5 },
      ]},
      { points: [
        { x: 0, y: 7 }, { x: 8, y: 7 }, { x: 8, y: 5 }, { x: 19, y: 5 },
      ]},
    ],
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
      hard:   { 10: 'kernel', 20: 'daemon', 30: 'leviathan', 40: 'swarm' },
    },
    rewards: {
      easyClear:   { type: 'unlock-card',  id: 'syn_rl_sn' },
      mediumClear: { type: 'unlock-card',  id: 'syn_ch_se' },
      hardClear:   { type: 'protocols',    id: '150' },
    },
    sector: 3, act: 3, actName: 'ENCRYPTED CORE', actTag: 'Strip their shields fast.',
    modifiers: { encrypted: 0.20 },
  },

  {
    id: 'bastion',
    name: 'BASTION',
    fullName: 'OUTER WARD',
    order: 11,
    cols: 20,
    rows: 11,
    // ACT 3 SHAPE: two diagonal approaches converging into a central column.
    // Diagonals cover lots of cells, leaving a wide tower zone in the middle.
    paths: [
      { points: [
        { x: 0, y: 1 }, { x: 5, y: 1 }, { x: 10, y: 5 }, { x: 20, y: 5 },
      ]},
      { points: [
        { x: 0, y: 9 }, { x: 5, y: 9 }, { x: 10, y: 5 }, { x: 20, y: 5 },
      ]},
    ],
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
      hard:   { 10: 'kernel', 20: 'daemon', 30: 'leviathan', 40: 'corruptor' },
    },
    rewards: {
      easyClear:   { type: 'unlock-tower', id: 'railgun' },
      mediumClear: { type: 'unlock-card',  id: 'syn_rl_mn' },
      hardClear:   { type: 'protocols',    id: '200' },
    },
    sector: 3, act: 3, actName: 'ENCRYPTED CORE', actTag: 'Strip their shields fast.',
    modifiers: { encrypted: 0.20 },
  },

  {
    id: 'keepsake',
    name: 'KEEPSAKE',
    fullName: 'INNER SANCTUM',
    order: 12,
    cols: 20,
    rows: 11,
    // ACT 3 SHAPE: triple convergence — three lanes feed a sanctum corridor
    // on the right. Final shield-wall stand before the stealth act.
    paths: [
      { points: [
        { x: 0, y: 2 }, { x: 12, y: 2 }, { x: 15, y: 5 }, { x: 20, y: 5 },
      ]},
      { points: [
        { x: 0, y: 5 }, { x: 12, y: 5 }, { x: 15, y: 5 }, { x: 20, y: 5 },
      ]},
      { points: [
        { x: 0, y: 8 }, { x: 12, y: 8 }, { x: 15, y: 5 }, { x: 20, y: 5 },
      ]},
    ],
    bgColor: '#100400',
    accentColor: '#ff3355',
    secondaryColor: '#ff6600',
    difficulties: STANDARD_DIFFICULTIES,
    enemyPool: {
      phase1: ['spider', 'trojan', 'worm'],
      phase2: ['rootkit', 'kernel', 'daemon'],
      phase3: ['juggernaut', 'daemon', 'wraith'],
    },
    bosses: {
      easy:   { 10: 'daemon', 20: 'leviathan' },
      medium: { 10: 'daemon', 20: 'leviathan', 30: 'corruptor' },
      hard:   { 10: 'kernel', 20: 'daemon', 30: 'leviathan', 40: 'corruptor' },
    },
    rewards: {
      easyClear:   { type: 'unlock-card',  id: 'syn_ch_mn' },
      mediumClear: { type: 'unlock-tower', id: 'sentinel' },
      hardClear:   { type: 'protocols',    id: '200' },
    },
    sector: 3, act: 3, actName: 'ENCRYPTED CORE', actTag: 'Strip their shields fast.',
    modifiers: { encrypted: 0.20 },
  },

  // ═════════════════════════════════════════════════════════════════════
  // ACT 4 — STEALTH NET. Cloaked enemies. Final turret unlock (DATA MINER).
  // ═════════════════════════════════════════════════════════════════════

  {
    id: 'glitchwire',
    name: 'GLITCHWIRE',
    fullName: 'UNSTABLE MESH',
    order: 13,
    cols: 18,
    rows: 10,
    // ACT 4 SHAPE: clean X-cross. Two diagonals through the middle.
    // Stealth enemies on crossing paths force AOE coverage of the center.
    paths: [
      { points: [{ x: 0, y: 1 }, { x: 9, y: 5 }, { x: 18, y: 9 }] },
      { points: [{ x: 0, y: 9 }, { x: 9, y: 5 }, { x: 18, y: 1 }] },
    ],
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
      hard:   { 10: 'phantom', 20: 'daemon', 30: 'voidlord', 40: 'corruptor' },
    },
    rewards: {
      easyClear:   { type: 'unlock-tower',  id: 'data_miner' },
      mediumClear: { type: 'unlock-card',   id: 'syn_ic_sc' },
      hardClear:   { type: 'unlock-branch', id: 'firewall.brst' },
    },
    sector: 4, act: 4, actName: 'STEALTH NET', actTag: 'Reveal or die.',
    modifiers: { stealthChance: 0.30 },
  },

  {
    id: 'chromealley',
    name: 'CHROME ALLEY',
    fullName: 'BACK-DOOR RUN',
    order: 14,
    cols: 19,
    rows: 10,
    // ACT 4 SHAPE: zigzag X — two paths swap sides midway. Stealth spawns
    // hide in the swap region.
    paths: [
      { points: [
        { x: 0, y: 2 }, { x: 5, y: 2 }, { x: 10, y: 7 }, { x: 15, y: 7 }, { x: 19, y: 2 },
      ]},
      { points: [
        { x: 0, y: 8 }, { x: 5, y: 8 }, { x: 10, y: 3 }, { x: 15, y: 3 }, { x: 19, y: 8 },
      ]},
    ],
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
      hard:   { 10: 'phantom', 20: 'daemon', 30: 'voidlord', 40: 'leviathan' },
    },
    rewards: {
      easyClear:   { type: 'unlock-card',   id: 'syn_ic_ps' },
      mediumClear: { type: 'unlock-card',   id: 'syn_hp_mn' },
      hardClear:   { type: 'unlock-branch', id: 'honeypot.con' },
    },
    sector: 4, act: 4, actName: 'STEALTH NET', actTag: 'Reveal or die.',
    modifiers: { stealthChance: 0.30 },
  },

  {
    id: 'blackmarket',
    name: 'BLACKMARKET',
    fullName: 'SHADOW BAZAAR',
    order: 15,
    cols: 20,
    rows: 11,
    // ACT 4 SHAPE: triple cross — three paths swap rows at the center.
    // Maximum stealth-overlap at x=10.
    paths: [
      { points: [{ x: 0, y: 2 }, { x: 10, y: 9 }, { x: 20, y: 2 }] },
      { points: [{ x: 0, y: 5 }, { x: 10, y: 5 }, { x: 20, y: 5 }] },
      { points: [{ x: 0, y: 9 }, { x: 10, y: 2 }, { x: 20, y: 9 }] },
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
      hard:   { 10: 'phantom', 20: 'daemon', 30: 'voidlord', 40: 'swarm' },
    },
    rewards: {
      easyClear:   { type: 'unlock-card',   id: 'syn_sc_ps' },
      mediumClear: { type: 'unlock-card',   id: 'syn_hp_se' },
      hardClear:   { type: 'unlock-branch', id: 'antivirus.pierce' },
    },
    sector: 4, act: 4, actName: 'STEALTH NET', actTag: 'Reveal or die.',
    modifiers: { stealthChance: 0.30 },
  },

  {
    id: 'ghostrun',
    name: 'GHOST.RUN',
    fullName: 'SILENT PROTOCOL',
    order: 16,
    cols: 20,
    rows: 11,
    // ACT 4 SHAPE: diamond cross — paths converge to a single midpoint then
    // diverge again. The midpoint is the only safe-coverage zone vs stealth.
    paths: [
      { points: [{ x: 0, y: 1 }, { x: 10, y: 5 }, { x: 20, y: 9 }] },
      { points: [{ x: 0, y: 9 }, { x: 10, y: 5 }, { x: 20, y: 1 }] },
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
      hard:   { 10: 'phantom', 20: 'daemon', 30: 'voidlord', 40: 'corruptor' },
    },
    rewards: {
      easyClear:   { type: 'unlock-branch', id: 'quantum.col' },
      mediumClear: { type: 'unlock-branch', id: 'ice.frz' },
      hardClear:   { type: 'unlock-branch', id: 'chain.vlt' },
    },
    sector: 4, act: 4, actName: 'STEALTH NET', actTag: 'Reveal or die.',
    modifiers: { stealthChance: 0.30 },
  },

  // ═════════════════════════════════════════════════════════════════════
  // ACT 5 — VOID SWARM. Replication-on-death virus. AOE / chain priority.
  // ═════════════════════════════════════════════════════════════════════

  {
    id: 'voidreach',
    name: 'VOIDREACH',
    fullName: 'OUTER NULL',
    order: 17,
    cols: 18,
    rows: 10,
    // ACT 5 SHAPE: single entry diverges into three exits — branching tree.
    // Replicating swarms force you to cover all three exits.
    paths: [
      { points: [
        { x: 0, y: 5 }, { x: 5, y: 5 }, { x: 10, y: 2 }, { x: 18, y: 2 },
      ]},
      { points: [
        { x: 0, y: 5 }, { x: 5, y: 5 }, { x: 10, y: 5 }, { x: 18, y: 5 },
      ]},
      { points: [
        { x: 0, y: 5 }, { x: 5, y: 5 }, { x: 10, y: 8 }, { x: 18, y: 8 },
      ]},
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
      hard:   { 10: 'trojan', 20: 'leviathan', 30: 'voidlord', 40: 'swarm' },
    },
    rewards: {
      easyClear:   { type: 'unlock-branch', id: 'mine.dem' },
      mediumClear: { type: 'protocols',     id: '225' },
      hardClear:   { type: 'unlock-branch', id: 'railgun.hyp' },
    },
    sector: 5, act: 5, actName: 'VOID SWARM', actTag: 'Kill the chain reaction.',
    modifiers: { replication: 0.25 },
  },

  {
    id: 'nullsector',
    name: 'NULL SECTOR',
    fullName: 'DEAD ZONE',
    order: 18,
    cols: 19,
    rows: 10,
    // ACT 5 SHAPE: 2-into-2 fork — twin entries cross at center then split
    // again into twin exits. Maximum spawn dispersion for replication waves.
    paths: [
      { points: [{ x: 0, y: 2 }, { x: 10, y: 5 }, { x: 19, y: 2 }] },
      { points: [{ x: 0, y: 2 }, { x: 10, y: 5 }, { x: 19, y: 8 }] },
      { points: [{ x: 0, y: 8 }, { x: 10, y: 5 }, { x: 19, y: 8 }] },
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
      hard:   { 10: 'trojan', 20: 'leviathan', 30: 'voidlord', 40: 'swarm' },
    },
    rewards: {
      easyClear:   { type: 'protocols',     id: '200' },
      mediumClear: { type: 'unlock-branch', id: 'pulse.ovl' },
      hardClear:   { type: 'protocols',     id: '325' },
    },
    sector: 5, act: 5, actName: 'VOID SWARM', actTag: 'Kill the chain reaction.',
    modifiers: { replication: 0.25 },
  },

  {
    id: 'fractaldepth',
    name: 'FRACTAL DEPTH',
    fullName: 'RECURSIVE VOID',
    order: 19,
    cols: 20,
    rows: 11,
    // ACT 5 SHAPE: recursive split — each path branches at the middle into a
    // sub-path. Recursive feel: 1 → 2 → 3 effective endpoints.
    paths: [
      { points: [
        { x: 0, y: 5 }, { x: 8, y: 5 }, { x: 8, y: 2 }, { x: 14, y: 2 }, { x: 20, y: 2 },
      ]},
      { points: [
        { x: 0, y: 5 }, { x: 8, y: 5 }, { x: 8, y: 8 }, { x: 14, y: 8 }, { x: 20, y: 8 },
      ]},
      { points: [
        { x: 0, y: 5 }, { x: 8, y: 5 }, { x: 15, y: 5 }, { x: 20, y: 5 },
      ]},
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
      hard:   { 10: 'trojan', 20: 'leviathan', 30: 'voidlord', 40: 'corruptor' },
    },
    rewards: {
      easyClear:   { type: 'unlock-branch', id: 'sniper.exe' },
      mediumClear: { type: 'protocols',     id: '275' },
      hardClear:   { type: 'unlock-branch', id: 'scrambler.sab' },
    },
    sector: 5, act: 5, actName: 'VOID SWARM', actTag: 'Kill the chain reaction.',
    modifiers: { replication: 0.25 },
  },

  {
    id: 'breachpoint',
    name: 'BREACH POINT',
    fullName: 'COLLAPSING NODE',
    order: 20,
    cols: 20,
    rows: 11,
    // ACT 5 SHAPE: triple divergence from a left-side junction. The collapsing
    // node spawns enemies that scatter to all three exits.
    paths: [
      { points: [{ x: 0, y: 2 }, { x: 5, y: 5 }, { x: 12, y: 2 }, { x: 20, y: 2 }] },
      { points: [{ x: 0, y: 5 }, { x: 5, y: 5 }, { x: 12, y: 5 }, { x: 20, y: 5 }] },
      { points: [{ x: 0, y: 8 }, { x: 5, y: 5 }, { x: 12, y: 8 }, { x: 20, y: 8 }] },
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
      hard:   { 10: 'trojan', 20: 'leviathan', 30: 'voidlord', 40: 'swarm' },
    },
    rewards: {
      easyClear:   { type: 'protocols',     id: '250' },
      mediumClear: { type: 'unlock-branch', id: 'sentinel.thr' },
      hardClear:   { type: 'protocols',     id: '375' },
    },
    sector: 5, act: 5, actName: 'VOID SWARM', actTag: 'Kill the chain reaction.',
    modifiers: { replication: 0.25 },
  },

  // ═════════════════════════════════════════════════════════════════════
  // ACT 6 — APEX RUIN. Rootkit tower-jam while bosses live. Boss fights.
  // ═════════════════════════════════════════════════════════════════════

  {
    id: 'blackice',
    name: 'BLACK ICE',
    fullName: 'DEEP SYSTEM CORE',
    order: 21,
    cols: 20,
    rows: 11,
    // ACT 6 SHAPE: tight serpentine — three sweeps with rootkit jam zones.
    // Long path means more time for towers to fire, but also more turret
    // exposure to rootkit jams.
    paths: [{
      points: [
        { x: 0, y: 1 }, { x: 15, y: 1 }, { x: 15, y: 4 }, { x: 4, y: 4 },
        { x: 4, y: 7 }, { x: 15, y: 7 }, { x: 15, y: 9 }, { x: 20, y: 9 },
      ],
    }],
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
      hard:   { 10: 'kernel', 20: 'daemon', 30: 'leviathan', 40: 'corruptor' },
    },
    rewards: {
      easyClear:   { type: 'unlock-branch', id: 'firewall.siege' },
      mediumClear: { type: 'protocols',     id: '325' },
      hardClear:   { type: 'unlock-branch', id: 'honeypot.vol' },
    },
    sector: 6, act: 6, actName: 'APEX RUIN', actTag: 'Your towers are the target.',
    modifiers: { rootkit: 8 },
  },

  {
    id: 'apex',
    name: 'APEX',
    fullName: 'SUMMIT NODE',
    order: 22,
    cols: 19,
    rows: 10,
    // ACT 6 SHAPE: single longest path of the campaign — full back-and-forth
    // serpentine touching all three rows.
    paths: [{
      points: [
        { x: 0, y: 2 }, { x: 14, y: 2 }, { x: 14, y: 5 }, { x: 3, y: 5 },
        { x: 3, y: 8 }, { x: 15, y: 8 }, { x: 19, y: 8 },
      ],
    }],
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
      hard:   { 10: 'daemon', 20: 'voidlord', 30: 'leviathan', 40: 'corruptor' },
    },
    rewards: {
      easyClear:   { type: 'unlock-branch', id: 'antivirus.vol' },
      mediumClear: { type: 'protocols',     id: '350' },
      hardClear:   { type: 'unlock-branch', id: 'quantum.obs' },
    },
    sector: 6, act: 6, actName: 'APEX RUIN', actTag: 'Your towers are the target.',
    modifiers: { rootkit: 8 },
  },

  {
    id: 'omega',
    name: 'OMEGA',
    fullName: 'LAST CIPHER',
    order: 23,
    cols: 20,
    rows: 11,
    // ACT 6 SHAPE: dual winding paths — twin serpents weaving through the cipher.
    paths: [
      { points: [
        { x: 0, y: 1 }, { x: 12, y: 1 }, { x: 12, y: 4 }, { x: 5, y: 4 },
        { x: 5, y: 7 }, { x: 15, y: 7 }, { x: 20, y: 7 },
      ]},
      { points: [
        { x: 0, y: 9 }, { x: 17, y: 9 }, { x: 20, y: 9 },
      ]},
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
      hard:   { 10: 'daemon', 20: 'voidlord', 30: 'leviathan', 40: 'corruptor' },
    },
    rewards: {
      easyClear:   { type: 'protocols',     id: '325' },
      mediumClear: { type: 'unlock-branch', id: 'ice.shr' },
      hardClear:   { type: 'protocols',     id: '475' },
    },
    sector: 6, act: 6, actName: 'APEX RUIN', actTag: 'Your towers are the target.',
    modifiers: { rootkit: 8 },
  },

  {
    id: 'finalcascade',
    name: 'FINAL CASCADE',
    fullName: 'TERMINAL FALL',
    order: 24,
    cols: 20,
    rows: 11,
    // ACT 6 SHAPE: cascading falls — the path tiers down through four levels
    // like a waterfall, each tier sweeping the opposite direction.
    paths: [{
      points: [
        { x: 0, y: 1 }, { x: 8, y: 1 }, { x: 8, y: 3 }, { x: 16, y: 3 },
        { x: 16, y: 5 }, { x: 4, y: 5 }, { x: 4, y: 7 }, { x: 13, y: 7 },
        { x: 13, y: 9 }, { x: 20, y: 9 },
      ],
    }],
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
      hard:   { 10: 'daemon', 20: 'voidlord', 30: 'leviathan', 40: 'corruptor' },
    },
    rewards: {
      easyClear:   { type: 'unlock-branch', id: 'mine.scr' },
      mediumClear: { type: 'protocols',     id: '425' },
      hardClear:   { type: 'unlock-tower',  id: 'heat_sink' },
    },
    sector: 6, act: 6, actName: 'APEX RUIN', actTag: 'Your towers are the target.',
    modifiers: { rootkit: 8 },
  },

  // ═════════════════════════════════════════════════════════════════════
  // ACT 7 — OMEGA PROTOCOL. FUSION: every prior act modifier simultaneously,
  // at reduced strength. The finale. Hard rewards scale accordingly.
  // ═════════════════════════════════════════════════════════════════════

  {
    id: 'deeproot',
    name: 'DEEP ROOT',
    fullName: 'RHIZOMAL NETWORK',
    order: 25,
    cols: 20,
    rows: 11,
    // ACT 7 SHAPE: rhizomal network — three left entries + one top entry
    // converge through a central junction then diverge to three exits.
    paths: [
      { points: [
        { x: 0, y: 1 }, { x: 8, y: 1 }, { x: 10, y: 5 }, { x: 20, y: 3 },
      ]},
      { points: [
        { x: 0, y: 5 }, { x: 8, y: 5 }, { x: 10, y: 5 }, { x: 20, y: 5 },
      ]},
      { points: [
        { x: 0, y: 9 }, { x: 8, y: 9 }, { x: 10, y: 5 }, { x: 20, y: 7 },
      ]},
      { points: [
        { x: 10, y: 0 }, { x: 10, y: 5 }, { x: 20, y: 9 },
      ]},
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
      hard:   { 10: 'leviathan', 20: 'corruptor', 30: 'swarm', 40: 'voidlord' },
    },
    rewards: {
      easyClear:   { type: 'unlock-branch', id: 'chain.grd' },
      mediumClear: { type: 'unlock-branch', id: 'railgun.cap' },
      hardClear:   { type: 'unlock-branch', id: 'data_miner.eco' },
    },
    sector: 7, act: 7, actName: 'OMEGA PROTOCOL', actTag: 'Every layer at once.',
    modifiers: { lagSpike: 0.5, encrypted: 0.10, stealthChance: 0.15, replication: 0.12, rootkit: 12 },
  },

  {
    id: 'rampart',
    name: 'RAMPART',
    fullName: 'CRIMSON BULWARK',
    order: 26,
    cols: 20,
    rows: 11,
    // ACT 7 SHAPE: crossing + winding — two long paths swap rows then merge.
    // Combines Act 4 + Act 6 patterns.
    paths: [
      { points: [
        { x: 0, y: 2 }, { x: 8, y: 2 }, { x: 12, y: 8 }, { x: 20, y: 8 },
      ]},
      { points: [
        { x: 0, y: 8 }, { x: 8, y: 8 }, { x: 12, y: 2 }, { x: 20, y: 2 },
      ]},
      { points: [
        { x: 0, y: 5 }, { x: 10, y: 5 }, { x: 20, y: 5 },
      ]},
    ],
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
      hard:   { 10: 'kernel', 20: 'daemon', 30: 'leviathan', 40: 'corruptor' },
    },
    rewards: {
      easyClear:   { type: 'unlock-branch', id: 'pulse.ion' },
      mediumClear: { type: 'unlock-branch', id: 'sniper.spt' },
      hardClear:   { type: 'unlock-branch', id: 'data_miner.mta' },
    },
    sector: 7, act: 7, actName: 'OMEGA PROTOCOL', actTag: 'Every layer at once.',
    modifiers: { lagSpike: 0.5, encrypted: 0.10, stealthChance: 0.15, replication: 0.12, rootkit: 12 },
  },

  {
    id: 'antimatter',
    name: 'ANTIMATTER',
    fullName: 'REVERSED CORE',
    order: 27,
    cols: 20,
    rows: 11,
    // ACT 7 SHAPE: reversed flow — paths enter from top AND right edges (atypical),
    // wind through the core, exit bottom + left. The "antimatter" theme = inverted
    // direction of travel.
    paths: [
      { points: [
        { x: 5, y: 0 }, { x: 5, y: 5 }, { x: 15, y: 5 }, { x: 15, y: 10 },
      ]},
      { points: [
        { x: 15, y: 0 }, { x: 15, y: 3 }, { x: 5, y: 3 }, { x: 5, y: 8 },
        { x: 15, y: 8 }, { x: 15, y: 10 },
      ]},
      { points: [
        { x: 0, y: 5 }, { x: 10, y: 5 }, { x: 20, y: 5 },
      ]},
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
      hard:   { 10: 'trojan', 20: 'leviathan', 30: 'voidlord', 40: 'corruptor' },
    },
    rewards: {
      easyClear:   { type: 'unlock-branch', id: 'scrambler.crs' },
      mediumClear: { type: 'unlock-branch', id: 'sentinel.plz' },
      hardClear:   { type: 'unlock-branch', id: 'heat_sink.wrd' },
    },
    sector: 7, act: 7, actName: 'OMEGA PROTOCOL', actTag: 'Every layer at once.',
    modifiers: { lagSpike: 0.5, encrypted: 0.10, stealthChance: 0.15, replication: 0.12, rootkit: 12 },
  },

  {
    id: 'ruinprotocol',
    name: 'RUIN.PROTOCOL',
    fullName: 'FINAL INTRUSION',
    order: 28,
    cols: 20,
    rows: 11,
    // ACT 7 SHAPE: the maze finale — four entries (left top/bottom + top + bottom)
    // all funnel through the central column to a single right-side exit.
    // Final intrusion: every angle of attack at once.
    paths: [
      { points: [
        { x: 0, y: 1 }, { x: 5, y: 1 }, { x: 5, y: 5 }, { x: 15, y: 5 }, { x: 20, y: 5 },
      ]},
      { points: [
        { x: 0, y: 9 }, { x: 5, y: 9 }, { x: 5, y: 5 }, { x: 15, y: 5 }, { x: 20, y: 5 },
      ]},
      { points: [
        { x: 5, y: 0 }, { x: 5, y: 5 }, { x: 15, y: 5 }, { x: 20, y: 5 },
      ]},
      { points: [
        { x: 5, y: 10 }, { x: 5, y: 5 }, { x: 15, y: 5 }, { x: 20, y: 5 },
      ]},
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
      hard:   { 10: 'daemon', 20: 'voidlord', 30: 'leviathan', 40: 'corruptor' },
    },
    rewards: {
      easyClear:   { type: 'unlock-branch', id: 'booster_node.res' },
      mediumClear: { type: 'unlock-branch', id: 'booster_node.crt' },
      hardClear:   { type: 'unlock-branch', id: 'heat_sink.prg' },
    },
    sector: 7, act: 7, actName: 'OMEGA PROTOCOL', actTag: 'Every layer at once.',
    modifiers: { lagSpike: 0.5, encrypted: 0.10, stealthChance: 0.15, replication: 0.12, rootkit: 12 },
  },

  // ═════════════════════════════════════════════════════════════════════
  // SURVIVAL — Unlocked after first Act 7 hard clear. Infinite waves.
  // ═════════════════════════════════════════════════════════════════════
  {
    id: 'survival',
    name: 'SURVIVAL.EXE',
    fullName: 'NULL ZONE',
    order: 99,
    cols: 20,
    rows: 11,
    // SURVIVAL: extra-long serpentine for maximum tower-coverage opportunity.
    // Endless waves need every shooting frame they can get.
    paths: [{
      points: [
        { x: 0, y: 1 }, { x: 17, y: 1 }, { x: 17, y: 4 }, { x: 3, y: 4 },
        { x: 3, y: 7 }, { x: 17, y: 7 }, { x: 17, y: 9 }, { x: 20, y: 9 },
      ],
    }],
    bgColor: '#0a0014',
    accentColor: '#b847ff',
    secondaryColor: '#ff2d95',
    difficulties: {
      easy:   { waves: 9999, startHp: 25, hpScale: 1.15, speedScale: 1.02, rewardScale: 1.0 },
      medium: { waves: 9999, startHp: 20, hpScale: 1.20, speedScale: 1.03, rewardScale: 0.95 },
      hard:   { waves: 9999, startHp: 15, hpScale: 1.26, speedScale: 1.04, rewardScale: 0.9 },
    },
    enemyPool: {
      phase1: ['worm', 'spider', 'trojan'],
      phase2: ['phantom', 'rootkit', 'wraith'],
      phase3: ['wraith', 'stealth', 'corruptor'],
    },
    bosses: {
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
