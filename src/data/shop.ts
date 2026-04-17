import type { ShopUpgradeDef, SaveData } from '@/types';

// Meta-progression purchases. Protocols earned persist across runs.
// Effects write to save.metaBoosts which createRun reads when seeding a new RunState.

export const SHOP_UPGRADES: ShopUpgradeDef[] = [
  {
    id: 'adaptive_weapons',
    name: 'ADAPTIVE WEAPONS',
    description: 'Every run begins with +2% global damage. Stacks.',
    icon: '\u25BC',
    baseCost: 30,
    stackStep: 20,
    maxStacks: 20,
    category: 'power',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.globalDamagePct = stacks * 0.02; },
  },
  {
    id: 'neural_booster',
    name: 'NEURAL BOOSTER',
    description: 'Start each run at level +1. Stacks.',
    icon: '\u2206',
    baseCost: 80,
    stackStep: 120,
    maxStacks: 5,
    category: 'power',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.startingLevel = stacks; },
  },
  {
    id: 'card_bandwidth',
    name: 'CARD BANDWIDTH',
    description: 'Draw +1 card option per draft.',
    icon: '\u25CF\u25CF',
    baseCost: 200,
    stackStep: 400,
    maxStacks: 2,
    category: 'utility',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.extraDraftCards = stacks; },
  },
  {
    id: 'reroll_cache',
    name: 'REROLL CACHE',
    description: 'Start each draft with +1 reroll available.',
    icon: '\u21BB',
    baseCost: 60,
    stackStep: 70,
    maxStacks: 4,
    category: 'utility',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.extraRerolls = stacks; },
  },
  {
    id: 'protocol_audit',
    name: 'PROTOCOL AUDIT',
    description: 'Gain +5% XP from kills. Stacks.',
    icon: '\u25A3',
    baseCost: 50,
    stackStep: 40,
    maxStacks: 10,
    category: 'economy',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.xpBoostPct = stacks * 0.05; },
  },
  {
    id: 'starter_firewall',
    name: 'STARTER: FIREWALL',
    description: 'Begin each run with +1 FIREWALL deploy token.',
    icon: '\u25A0',
    baseCost: 75,
    stackStep: 100,
    maxStacks: 3,
    category: 'power',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.startingDeployTokens.firewall = stacks; },
  },
  {
    id: 'starter_honeypot',
    name: 'STARTER: HONEYPOT',
    description: 'Begin each run with +1 HONEYPOT deploy token.',
    icon: '\u2B21',
    baseCost: 90,
    stackStep: 120,
    maxStacks: 2,
    category: 'power',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.startingDeployTokens.honeypot = stacks; },
  },
];

export const SHOP_BY_ID: Record<string, ShopUpgradeDef> = Object.fromEntries(SHOP_UPGRADES.map((u) => [u.id, u]));

export function shopCost(u: ShopUpgradeDef, nextStack: number): number {
  // Cost for purchasing the Nth stack (1-indexed): baseCost for 1st, + stackStep per additional
  return u.baseCost + (nextStack - 1) * u.stackStep;
}

// Recompute metaBoosts from scratch based on shopPurchased map. Call after any purchase.
export function recomputeMetaBoosts(save: SaveData): void {
  save.metaBoosts = {
    globalDamagePct: 0,
    startingLevel: 0,
    extraDraftCards: 0,
    extraRerolls: 0,
    xpBoostPct: 0,
    startingDeployTokens: {},
  };
  for (const u of SHOP_UPGRADES) {
    const stacks = save.shopPurchased[u.id] ?? 0;
    if (stacks > 0) u.effect(save, stacks);
  }
}
