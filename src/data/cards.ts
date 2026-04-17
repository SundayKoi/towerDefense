import type { CardDef, RunState, TowerId } from '@/types';

// ==================== HELPERS ====================

function addToken(s: RunState, id: TowerId, count: number): void {
  s.deployTokens[id] = (s.deployTokens[id] ?? 0) + count;
}

function addEffect(s: RunState, tower: TowerId, tag: string): void {
  if (!s.towerEffects[tower]) s.towerEffects[tower] = new Set<string>();
  s.towerEffects[tower]!.add(tag);
}

// ==================== DEPLOY CARDS ====================

const DEPLOY: CardDef[] = [
  {
    id: 'deploy_firewall',
    name: 'DEPLOY: FIREWALL',
    rarity: 'common',
    category: 'deploy',
    towerHint: 'firewall',
    description: 'Gain a FIREWALL deploy token. Kinetic frontline.',
    apply: (s) => { addToken(s, 'firewall', 1); },
  },
  {
    id: 'deploy_firewall_2x',
    name: 'DEPLOY: FIREWALL \u00d72',
    rarity: 'rare',
    category: 'deploy',
    towerHint: 'firewall',
    description: 'Gain 2 FIREWALL deploy tokens.',
    apply: (s) => { addToken(s, 'firewall', 2); },
  },
  {
    id: 'deploy_honeypot',
    name: 'DEPLOY: HONEYPOT',
    rarity: 'common',
    category: 'deploy',
    towerHint: 'honeypot',
    description: 'Gain a HONEYPOT deploy token. Slows enemies 45% and drops goo puddles.',
    apply: (s) => { addToken(s, 'honeypot', 1); },
  },
  {
    id: 'deploy_antivirus',
    name: 'DEPLOY: ANTIVIRUS',
    rarity: 'rare',
    category: 'deploy',
    towerHint: 'antivirus',
    description: 'Gain an ANTIVIRUS deploy token. Long-range piercer. Fires 2 shots.',
    apply: (s) => { addToken(s, 'antivirus', 1); },
  },
  {
    id: 'deploy_quantum',
    name: 'DEPLOY: QUANTUM',
    rarity: 'rare',
    category: 'deploy',
    towerHint: 'quantum',
    description: 'Gain a QUANTUM deploy token. 35% crit chance, 3.5\u00d7 crit damage.',
    apply: (s) => { addToken(s, 'quantum', 1); },
  },
  {
    id: 'deploy_ice',
    name: 'DEPLOY: ICE-BREAKER',
    rarity: 'epic',
    category: 'deploy',
    towerHint: 'ice',
    description: 'Gain an ICE-BREAKER deploy token. Explosive AOE shredder.',
    apply: (s) => { addToken(s, 'ice', 1); },
  },
  {
    id: 'deploy_mine',
    name: 'DEPLOY: LOGIC MINE \u00d72',
    rarity: 'rare',
    category: 'deploy',
    towerHint: 'mine',
    description: 'Gain 2 LOGIC MINE tokens. Proximity detonation, one-shot.',
    apply: (s) => { addToken(s, 'mine', 2); },
  },
  {
    id: 'deploy_chain',
    name: 'DEPLOY: CHAIN LIGHTNING',
    rarity: 'epic',
    category: 'deploy',
    towerHint: 'chain',
    description: 'Gain a CHAIN LIGHTNING deploy token. Arcs through 3 enemies.',
    apply: (s) => { addToken(s, 'chain', 1); },
  },
  {
    id: 'deploy_railgun',
    name: 'DEPLOY: RAILGUN',
    rarity: 'legendary',
    category: 'deploy',
    towerHint: 'railgun',
    description: 'Gain a RAILGUN deploy token. Pierces every enemy in its path.',
    apply: (s) => { addToken(s, 'railgun', 1); },
  },
];

// ==================== UPGRADE CARDS (behavioral changes only) ====================

const UPGRADE: CardDef[] = [
  // --- FIREWALL ---
  {
    id: 'fw_burst',
    name: 'FIREWALL: BURST PROTOCOL',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'firewall',
    description: 'Every 4th FIREWALL shot fires a triple spread burst.',
    apply: (s) => { addEffect(s, 'firewall', 'burst'); },
  },
  {
    id: 'fw_incendiary',
    name: 'FIREWALL: INCENDIARY.EXE',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'firewall',
    description: 'FIREWALL shots leave a small fire zone that burns nearby enemies.',
    apply: (s) => { addEffect(s, 'firewall', 'incendiary'); },
  },

  // --- HONEYPOT ---
  {
    id: 'hp_persistent',
    name: 'HONEYPOT: PERSISTENT PAYLOAD',
    rarity: 'common',
    category: 'upgrade',
    towerHint: 'honeypot',
    description: 'HONEYPOT goo puddles last twice as long.',
    apply: (s) => { addEffect(s, 'honeypot', 'persistent'); },
  },
  {
    id: 'hp_acid',
    name: 'HONEYPOT: ACID BATH',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'honeypot',
    description: 'HONEYPOT goo puddles burn enemies for 10 damage per second.',
    apply: (s) => { addEffect(s, 'honeypot', 'acid'); },
  },
  {
    id: 'hp_overflow',
    name: 'HONEYPOT: OVERFLOW',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'honeypot',
    description: 'HONEYPOT goo puddles double in radius.',
    apply: (s) => { addEffect(s, 'honeypot', 'overflow'); },
  },

  // --- ANTIVIRUS ---
  {
    id: 'av_quarantine',
    name: 'ANTIVIRUS: QUARANTINE',
    rarity: 'common',
    category: 'upgrade',
    towerHint: 'antivirus',
    description: 'ANTIVIRUS hits apply a 30% slow for 1.2s.',
    apply: (s) => { addEffect(s, 'antivirus', 'quarantine'); },
  },
  {
    id: 'av_triple',
    name: 'ANTIVIRUS: TRIPLE SCAN',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'antivirus',
    description: 'ANTIVIRUS fires 3 projectiles per shot instead of 2.',
    apply: (s) => { addEffect(s, 'antivirus', 'triple'); },
  },
  {
    id: 'av_precision',
    name: 'ANTIVIRUS: PRECISION TARGETING',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'antivirus',
    description: 'ANTIVIRUS secondary (and tertiary) shots always critically strike.',
    apply: (s) => { addEffect(s, 'antivirus', 'precision'); },
  },

  // --- CHAIN ---
  {
    id: 'ch_storm',
    name: 'CHAIN: STORM SURGE',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'chain',
    description: 'CHAIN LIGHTNING arcs to 2 additional targets.',
    apply: (s) => { addEffect(s, 'chain', 'storm'); },
  },
  {
    id: 'ch_discharge',
    name: 'CHAIN: FULL DISCHARGE',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'chain',
    description: 'CHAIN LIGHTNING jumps deal full damage with no falloff.',
    apply: (s) => { addEffect(s, 'chain', 'discharge'); },
  },
  {
    id: 'ch_nova',
    name: 'CHAIN: ARC NOVA',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'chain',
    description: 'CHAIN LIGHTNING arc reach doubles.',
    apply: (s) => { addEffect(s, 'chain', 'nova'); },
  },

  // --- ICE ---
  {
    id: 'ic_wide',
    name: 'ICE: BLIZZARD FIELD',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'ice',
    description: 'ICE-BREAKER explosion radius is 70% wider.',
    apply: (s) => { addEffect(s, 'ice', 'wide'); },
  },
  {
    id: 'ic_freeze',
    name: 'ICE: ABSOLUTE ZERO',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'ice',
    description: 'ICE-BREAKER stops enemies completely for 0.6s instead of slowing.',
    apply: (s) => { addEffect(s, 'ice', 'freeze'); },
  },
  {
    id: 'ic_shards',
    name: 'ICE: SHARD STORM',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'ice',
    description: 'ICE-BREAKER blasts spawn 6 slow fields in a ring.',
    apply: (s) => { addEffect(s, 'ice', 'shards'); },
  },

  // --- QUANTUM ---
  {
    id: 'qm_double',
    name: 'QUANTUM: SUPERPOSITION',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'quantum',
    description: 'QUANTUM has a 35% chance to fire twice per shot.',
    apply: (s) => { addEffect(s, 'quantum', 'double'); },
  },
  {
    id: 'qm_entangle',
    name: 'QUANTUM: ENTANGLEMENT',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'quantum',
    description: 'QUANTUM critical hits arc to the nearest enemy for 60% damage.',
    apply: (s) => { addEffect(s, 'quantum', 'entangle'); },
  },
  {
    id: 'qm_phase',
    name: 'QUANTUM: PHASE SHIFT',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'quantum',
    description: 'QUANTUM shots ignore all enemy armor.',
    apply: (s) => { addEffect(s, 'quantum', 'phase'); },
  },

  // --- RAILGUN ---
  {
    id: 'rl_sabot',
    name: 'RAILGUN: SABOT ROUND',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'railgun',
    description: 'RAILGUN shots cause a small explosion at each enemy pierced.',
    apply: (s) => { addEffect(s, 'railgun', 'sabot'); },
  },
  {
    id: 'rl_shockwave',
    name: 'RAILGUN: SHOCKWAVE',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'railgun',
    description: 'RAILGUN pierced enemies are slowed 70% for 1.5s.',
    apply: (s) => { addEffect(s, 'railgun', 'shockwave'); },
  },
  {
    id: 'rl_capacitor',
    name: 'RAILGUN: CAPACITOR',
    rarity: 'legendary',
    category: 'upgrade',
    towerHint: 'railgun',
    description: 'RAILGUN charges for 8s then auto-fires a 5\u00d7 damage mega shot.',
    apply: (s) => { addEffect(s, 'railgun', 'capacitor'); },
  },

  // --- MINE ---
  {
    id: 'mn_wide',
    name: 'LOGIC MINE: WIDE BLAST',
    rarity: 'common',
    category: 'upgrade',
    towerHint: 'mine',
    description: 'LOGIC MINE explosion radius doubles.',
    apply: (s) => { addEffect(s, 'mine', 'wide'); },
  },
  {
    id: 'mn_cluster',
    name: 'LOGIC MINE: CLUSTER CHARGE',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'mine',
    description: 'LOGIC MINE detonation triggers 2 additional explosions nearby.',
    apply: (s) => { addEffect(s, 'mine', 'cluster'); },
  },
  {
    id: 'mn_resupply',
    name: 'LOGIC MINE: AUTO-RESUPPLY',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'mine',
    description: '60% chance LOGIC MINE respawns after detonation.',
    apply: (s) => { addEffect(s, 'mine', 'resupply'); },
  },
];

// ==================== HEAL CARDS ====================

const HEAL: CardDef[] = [
  {
    id: 'heal_small',
    name: 'INTEGRITY PATCH',
    rarity: 'common',
    category: 'heal',
    description: 'Restore 3 INTEGRITY.',
    apply: (s) => { s.hp = Math.min(s.maxHp, s.hp + 3); },
  },
  {
    id: 'heal_med',
    name: 'SYSTEM RESTORE',
    rarity: 'rare',
    category: 'heal',
    description: 'Restore 6 INTEGRITY.',
    apply: (s) => { s.hp = Math.min(s.maxHp, s.hp + 6); },
  },
  {
    id: 'heal_max',
    name: 'HARDENED CORE',
    rarity: 'epic',
    category: 'heal',
    description: '+5 MAX INTEGRITY and fully heal.',
    apply: (s) => { s.maxHp += 5; s.hp = s.maxHp; },
  },
  {
    id: 'heal_revive',
    name: 'IMMORTAL PROTOCOL',
    rarity: 'legendary',
    category: 'heal',
    description: 'Revive once on defeat with 5 INTEGRITY.',
    apply: (s) => { s.mods.revive = true; },
  },
];

// ==================== EXOTIC ====================

const EXOTIC: CardDef[] = [
  {
    id: 'exotic_time_dilation',
    name: 'TIME DILATION',
    rarity: 'legendary',
    category: 'exotic',
    description: 'All enemies move 25% slower for the rest of the run.',
    apply: (s) => { s.mods.enemySpeedMult *= 0.75; },
  },
  {
    id: 'exotic_replicator',
    name: 'REPLICATOR',
    rarity: 'legendary',
    category: 'exotic',
    description: 'Gain 1 deploy token for every tower type you have placed.',
    apply: (s) => {
      const placed = new Set(s.towers.map((t) => t.def));
      for (const id of placed) addToken(s, id, 1);
    },
  },
  {
    id: 'exotic_overclock',
    name: 'SYSTEM OVERCLOCK',
    rarity: 'epic',
    category: 'exotic',
    description: 'All towers fire 40% faster for the rest of the run.',
    apply: (s) => { s.mods.globalRatePct += 0.4; },
  },
];

// ==================== EXPORTS ====================

export const CARDS: CardDef[] = [
  ...DEPLOY,
  ...UPGRADE,
  ...HEAL,
  ...EXOTIC,
];

export const CARDS_BY_ID: Record<string, CardDef> = Object.fromEntries(CARDS.map((c) => [c.id, c]));

export const STARTING_UNLOCKED_CARDS = [
  // All deploy cards except railgun (legendary)
  ...DEPLOY.filter((c) => c.rarity !== 'legendary').map((c) => c.id),
  // Common/rare upgrades only
  ...UPGRADE.filter((c) => c.rarity === 'common' || c.rarity === 'rare').map((c) => c.id),
  // All heals except legendary
  ...HEAL.filter((c) => c.rarity !== 'legendary').map((c) => c.id),
  // One exotic starter
  'exotic_overclock',
];

const BASE_WEIGHTS: Record<string, number> = { common: 60, rare: 28, epic: 10, legendary: 2 };
const PER_LEVEL: Record<string, number> = { common: 0, rare: 0.5, epic: 0.3, legendary: 0.15 };

export interface DraftContext {
  placedTowerTypes: Set<TowerId>;
  towerCount: number;
}

function categoryWeight(category: string, level: number, ctx: DraftContext): number {
  const n = ctx.towerCount;
  switch (category) {
    case 'deploy':  return Math.max(0.3, 2.5 - n * 0.28);
    case 'upgrade': return Math.min(2.5, 0.1 + n * 0.38);
    case 'heal':    return 1.0;
    case 'exotic':  return Math.min(1.5, 0.2 + level * 0.1);
    default:        return 1.0;
  }
}

export function drawDraft(level: number, unlockedIds: Set<string>, context: DraftContext, count = 3): string[] {
  const pool = CARDS.filter((c) => {
    if (!unlockedIds.has(c.id)) return false;
    if (c.category === 'upgrade' && c.towerHint && !context.placedTowerTypes.has(c.towerHint)) return false;
    return true;
  });
  if (pool.length === 0) return [];

  const rarityW: Record<string, number> = {};
  for (const r of Object.keys(BASE_WEIGHTS)) {
    rarityW[r] = BASE_WEIGHTS[r] + PER_LEVEL[r] * level;
  }

  const picks: string[] = [];
  const used = new Set<string>();
  while (picks.length < count) {
    const weighted = pool
      .filter((c) => !used.has(c.id))
      .map((c) => ({ card: c, weight: rarityW[c.rarity] * categoryWeight(c.category, level, context) }));
    const totalW = weighted.reduce((sum, x) => sum + x.weight, 0);
    if (totalW <= 0 || weighted.length === 0) break;
    let r = Math.random() * totalW;
    let picked = weighted[weighted.length - 1];
    for (const w of weighted) { r -= w.weight; if (r <= 0) { picked = w; break; } }
    used.add(picked.card.id);
    picks.push(picked.card.id);
  }
  return picks;
}
