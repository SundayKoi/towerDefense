import type { CardDef, RunState, TowerId } from '@/types';

// ==================== DEPLOY CARDS (grant placement tokens) ====================
// Drafting one adds a token that lets you place the tower on an empty cell.
// Common deploy cards are abundant; rare/epic give premium towers.

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
    description: 'Gain a HONEYPOT deploy token. Slows enemies 45%.',
    apply: (s) => { addToken(s, 'honeypot', 1); },
  },
  {
    id: 'deploy_antivirus',
    name: 'DEPLOY: ANTIVIRUS',
    rarity: 'rare',
    category: 'deploy',
    towerHint: 'antivirus',
    description: 'Gain an ANTIVIRUS deploy token. Long-range pierce.',
    apply: (s) => { addToken(s, 'antivirus', 1); },
  },
  {
    id: 'deploy_quantum',
    name: 'DEPLOY: QUANTUM',
    rarity: 'rare',
    category: 'deploy',
    towerHint: 'quantum',
    description: 'Gain a QUANTUM deploy token. 35% crit, ignores phase resist.',
    apply: (s) => { addToken(s, 'quantum', 1); },
  },
  {
    id: 'deploy_ice',
    name: 'DEPLOY: ICE-BREAKER',
    rarity: 'epic',
    category: 'deploy',
    towerHint: 'ice',
    description: 'Gain an ICE-BREAKER deploy token. AOE shredder.',
    apply: (s) => { addToken(s, 'ice', 1); },
  },
  {
    id: 'deploy_mine',
    name: 'DEPLOY: LOGIC MINE \u00d72',
    rarity: 'rare',
    category: 'deploy',
    towerHint: 'mine',
    description: 'Gain 2 LOGIC MINE tokens. One-shot AOE detonation.',
    apply: (s) => { addToken(s, 'mine', 2); },
  },
  {
    id: 'deploy_chain',
    name: 'DEPLOY: CHAIN LIGHTNING',
    rarity: 'epic',
    category: 'deploy',
    towerHint: 'chain',
    description: 'Gain a CHAIN LIGHTNING deploy token. Arcs through 3.',
    apply: (s) => { addToken(s, 'chain', 1); },
  },
  {
    id: 'deploy_railgun',
    name: 'DEPLOY: RAILGUN',
    rarity: 'legendary',
    category: 'deploy',
    towerHint: 'railgun',
    description: 'Gain a RAILGUN deploy token. Pierces every enemy in line.',
    apply: (s) => { addToken(s, 'railgun', 1); },
  },
];

// ==================== UPGRADE CARDS (tower-specific buffs) ====================
// Stack permanently on the tower type for the rest of the run.

const UPGRADE: CardDef[] = [
  // --- Firewall ---
  {
    id: 'up_firewall_dmg',
    name: 'FIREWALL: AMP ROUNDS',
    rarity: 'common',
    category: 'upgrade',
    towerHint: 'firewall',
    description: 'All FIREWALL towers +25% damage.',
    apply: (s) => { s.mods.towerDmg.firewall = (s.mods.towerDmg.firewall ?? 0) + 0.25; },
  },
  {
    id: 'up_firewall_rate',
    name: 'FIREWALL: HYPERCYCLE',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'firewall',
    description: 'All FIREWALL towers fire 35% faster.',
    apply: (s) => { s.mods.towerRate.firewall = (s.mods.towerRate.firewall ?? 0) + 0.35; },
  },
  {
    id: 'up_firewall_range',
    name: 'FIREWALL: EXTENDED OPTICS',
    rarity: 'common',
    category: 'upgrade',
    towerHint: 'firewall',
    description: 'All FIREWALL towers +30% range.',
    apply: (s) => { s.mods.towerRange.firewall = (s.mods.towerRange.firewall ?? 0) + 0.3; },
  },
  // --- Honeypot ---
  {
    id: 'up_honeypot_rate',
    name: 'HONEYPOT: SWARM TRAP',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'honeypot',
    description: 'All HONEYPOTs fire 50% faster.',
    apply: (s) => { s.mods.towerRate.honeypot = (s.mods.towerRate.honeypot ?? 0) + 0.5; },
  },
  {
    id: 'up_honeypot_range',
    name: 'HONEYPOT: FIELD GENERATOR',
    rarity: 'common',
    category: 'upgrade',
    towerHint: 'honeypot',
    description: 'All HONEYPOTs +40% range.',
    apply: (s) => { s.mods.towerRange.honeypot = (s.mods.towerRange.honeypot ?? 0) + 0.4; },
  },
  // --- Antivirus ---
  {
    id: 'up_antivirus_dmg',
    name: 'ANTIVIRUS: HOT LOAD',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'antivirus',
    description: 'All ANTIVIRUS +50% damage.',
    apply: (s) => { s.mods.towerDmg.antivirus = (s.mods.towerDmg.antivirus ?? 0) + 0.5; },
  },
  {
    id: 'up_antivirus_range',
    name: 'ANTIVIRUS: SNIPER PROTOCOL',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'antivirus',
    description: 'All ANTIVIRUS +75% range.',
    apply: (s) => { s.mods.towerRange.antivirus = (s.mods.towerRange.antivirus ?? 0) + 0.75; },
  },
  {
    id: 'up_antivirus_rate',
    name: 'ANTIVIRUS: QUICK RELOAD',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'antivirus',
    description: 'All ANTIVIRUS fire 30% faster.',
    apply: (s) => { s.mods.towerRate.antivirus = (s.mods.towerRate.antivirus ?? 0) + 0.3; },
  },
  // --- Quantum ---
  {
    id: 'up_quantum_crit',
    name: 'QUANTUM: CRIT THEORIST',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'quantum',
    description: 'All QUANTUM towers +15% crit chance.',
    apply: (s) => { s.mods.towerCrit.quantum = (s.mods.towerCrit.quantum ?? 0) + 0.15; },
  },
  {
    id: 'up_quantum_dmg',
    name: 'QUANTUM: ENTANGLED ROUNDS',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'quantum',
    description: 'All QUANTUM towers +40% damage.',
    apply: (s) => { s.mods.towerDmg.quantum = (s.mods.towerDmg.quantum ?? 0) + 0.4; },
  },
  // --- Ice ---
  {
    id: 'up_ice_radius',
    name: 'ICE: SHATTER FIELD',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'ice',
    description: 'All ICE-BREAKERS +40% damage.',
    apply: (s) => { s.mods.towerDmg.ice = (s.mods.towerDmg.ice ?? 0) + 0.4; },
  },
  {
    id: 'up_ice_rate',
    name: 'ICE: OVERCLOCK',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'ice',
    description: 'All ICE-BREAKERS fire 40% faster.',
    apply: (s) => { s.mods.towerRate.ice = (s.mods.towerRate.ice ?? 0) + 0.4; },
  },
  // --- Chain ---
  {
    id: 'up_chain_dmg',
    name: 'CHAIN: AMPLIFIER',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'chain',
    description: 'All CHAIN towers +45% damage.',
    apply: (s) => { s.mods.towerDmg.chain = (s.mods.towerDmg.chain ?? 0) + 0.45; },
  },
  // --- Railgun ---
  {
    id: 'up_railgun_dmg',
    name: 'RAILGUN: OVERCHARGE',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'railgun',
    description: 'All RAILGUNS +60% damage.',
    apply: (s) => { s.mods.towerDmg.railgun = (s.mods.towerDmg.railgun ?? 0) + 0.6; },
  },
];

// ==================== GLOBAL BUFFS ====================

const BUFFS: CardDef[] = [
  {
    id: 'buff_dmg_1',
    name: 'OVERCLOCK v1',
    rarity: 'common',
    category: 'buff',
    description: 'All towers +12% damage.',
    apply: (s) => { s.mods.globalDamagePct += 0.12; },
  },
  {
    id: 'buff_dmg_2',
    name: 'OVERCLOCK v2',
    rarity: 'rare',
    category: 'buff',
    description: 'All towers +22% damage.',
    apply: (s) => { s.mods.globalDamagePct += 0.22; },
  },
  {
    id: 'buff_dmg_3',
    name: 'OVERCLOCK v3',
    rarity: 'epic',
    category: 'buff',
    description: 'All towers +40% damage.',
    apply: (s) => { s.mods.globalDamagePct += 0.4; },
  },
  {
    id: 'buff_dmg_max',
    name: 'OVERCLOCK: MAX',
    rarity: 'legendary',
    category: 'buff',
    description: 'All towers +75% damage.',
    apply: (s) => { s.mods.globalDamagePct += 0.75; },
  },
  {
    id: 'buff_range_1',
    name: 'SIGNAL EXTENDER',
    rarity: 'common',
    category: 'buff',
    description: 'All towers +15% range.',
    apply: (s) => { s.mods.globalRangePct += 0.15; },
  },
  {
    id: 'buff_range_2',
    name: 'SIGNAL AMPLIFIER',
    rarity: 'rare',
    category: 'buff',
    description: 'All towers +30% range.',
    apply: (s) => { s.mods.globalRangePct += 0.3; },
  },
  {
    id: 'buff_rate_1',
    name: 'CYCLE BOOST',
    rarity: 'common',
    category: 'buff',
    description: 'All towers fire 15% faster.',
    apply: (s) => { s.mods.globalRatePct += 0.15; },
  },
  {
    id: 'buff_rate_2',
    name: 'HYPERTHREAD',
    rarity: 'rare',
    category: 'buff',
    description: 'All towers fire 30% faster.',
    apply: (s) => { s.mods.globalRatePct += 0.3; },
  },
  {
    id: 'buff_crit',
    name: 'CRIT INJECTOR',
    rarity: 'rare',
    category: 'buff',
    description: 'All towers +10% crit chance (3\u00d7 damage).',
    apply: (s) => { s.mods.globalCritChance += 0.1; },
  },
  {
    id: 'buff_xp',
    name: 'DATA LEECH',
    rarity: 'rare',
    category: 'buff',
    description: 'Gain +30% XP from kills.',
    apply: (s) => { s.mods.xpMult += 0.3; },
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
    description: '+4 MAX INTEGRITY and fully heal.',
    apply: (s) => { s.maxHp += 4; s.hp = s.maxHp; },
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

// ==================== EXOTIC / LEGENDARY ====================

const EXOTIC: CardDef[] = [
  {
    id: 'exotic_time_dilation',
    name: 'TIME DILATION',
    rarity: 'legendary',
    category: 'exotic',
    description: 'All enemies -25% speed for the rest of the run.',
    apply: (s) => { s.mods.enemySpeedMult *= 0.75; },
  },
  {
    id: 'exotic_replicator',
    name: 'REPLICATOR',
    rarity: 'legendary',
    category: 'exotic',
    description: 'Gain a deploy token of every tower you currently own.',
    apply: (s) => {
      for (const t of s.towers) {
        addToken(s, t.def, 1);
      }
    },
  },
  {
    id: 'exotic_mass_deploy',
    name: 'FORK BOMB',
    rarity: 'epic',
    category: 'exotic',
    description: 'Gain 3 FIREWALL tokens.',
    apply: (s) => { addToken(s, 'firewall', 3); },
  },
];

export const CARDS: CardDef[] = [
  ...DEPLOY,
  ...UPGRADE,
  ...BUFFS,
  ...HEAL,
  ...EXOTIC,
];

export const CARDS_BY_ID: Record<string, CardDef> = Object.fromEntries(CARDS.map((c) => [c.id, c]));

// Starting unlocked pool (persists in save). Intentionally generous so early runs feel rich.
export const STARTING_UNLOCKED_CARDS = [
  ...DEPLOY.filter((c) => c.rarity !== 'legendary').map((c) => c.id),
  ...UPGRADE.filter((c) => c.rarity !== 'epic').map((c) => c.id),
  ...BUFFS.filter((c) => c.rarity !== 'legendary').map((c) => c.id),
  ...HEAL.filter((c) => c.rarity !== 'legendary').map((c) => c.id),
  'exotic_mass_deploy',
];

const BASE_WEIGHTS: Record<string, number> = { common: 60, rare: 28, epic: 10, legendary: 2 };
const PER_LEVEL: Record<string, number> = { common: 0, rare: 0.4, epic: 0.25, legendary: 0.15 };

export interface DraftContext {
  placedTowerTypes: Set<TowerId>;
  towerCount: number;
}

// Category weight — biases the draft toward DEPLOY cards early (you need towers) and
// UPGRADE cards later once you have things to upgrade. Buffs/heals stay constant.
function categoryWeight(category: string, level: number, ctx: DraftContext): number {
  const n = ctx.towerCount;
  switch (category) {
    case 'deploy':
      // 2.5 at 0 towers, falls to 0.4 by 8 towers
      return Math.max(0.4, 2.5 - n * 0.25);
    case 'upgrade':
      // Useless at 0 towers, rises sharply with tower count
      return Math.min(2.2, 0.15 + n * 0.32);
    case 'buff':
      return 1.1;
    case 'heal':
      return 1.0;
    case 'exotic':
      return Math.min(1.4, 0.25 + level * 0.1);
    default:
      return 1.0;
  }
}

// Card pool given player state. Level controls rarity weighting; context controls category mix.
// Upgrade cards targeting a tower you don't own are filtered entirely — you can't get "AMP ROUNDS:
// FIREWALL" if you haven't placed a Firewall yet.
export function drawDraft(level: number, unlockedIds: Set<string>, context: DraftContext, count = 3): string[] {
  const pool = CARDS.filter((c) => {
    if (!unlockedIds.has(c.id)) return false;
    if (c.category === 'upgrade' && c.towerHint && !context.placedTowerTypes.has(c.towerHint)) return false;
    return true;
  });
  if (pool.length === 0) return [];

  const rarityW: Record<string, number> = { common: 0, rare: 0, epic: 0, legendary: 0 };
  for (const r of Object.keys(BASE_WEIGHTS)) {
    rarityW[r] = BASE_WEIGHTS[r] + PER_LEVEL[r] * level;
  }

  const picks: string[] = [];
  const used = new Set<string>();
  while (picks.length < count) {
    // Recompute weights per candidate each iteration (small pool, cheap).
    const weighted = pool
      .filter((c) => !used.has(c.id))
      .map((c) => ({
        card: c,
        weight: rarityW[c.rarity] * categoryWeight(c.category, level, context),
      }));
    const totalW = weighted.reduce((s, x) => s + x.weight, 0);
    if (totalW <= 0 || weighted.length === 0) break;
    let r = Math.random() * totalW;
    let picked = weighted[weighted.length - 1];
    for (const w of weighted) {
      r -= w.weight;
      if (r <= 0) { picked = w; break; }
    }
    used.add(picked.card.id);
    picks.push(picked.card.id);
  }
  return picks;
}

function addToken(s: RunState, id: TowerId, count: number): void {
  s.deployTokens[id] = (s.deployTokens[id] ?? 0) + count;
}
