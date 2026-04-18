import type { ShopUpgradeDef, SaveData } from '@/types';

// Meta-progression purchases. Protocols earned persist across runs.
// Effects write to save.metaBoosts which createRun reads when seeding a new RunState.

export const SHOP_UPGRADES: ShopUpgradeDef[] = [
  // ── COMBAT ───────────────────────────────────────────────────────────────
  {
    id: 'adaptive_weapons',
    name: 'ADAPTIVE WEAPONS',
    description: 'Every run begins with +2% global damage. Stacks up to 20x.',
    icon: '▲',
    baseCost: 30,
    stackStep: 20,
    maxStacks: 20,
    category: 'power',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.globalDamagePct = stacks * 0.02; },
  },
  {
    id: 'neural_booster',
    name: 'NEURAL BOOSTER',
    description: 'Start each run at level +1 with a free draft. Max 2 stacks — skipping further past early drafts warps the branch commitment curve.',
    icon: '∆',
    baseCost: 120,
    stackStep: 180,
    maxStacks: 2,
    category: 'power',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.startingLevel = stacks; },
  },
  {
    id: 'critical_matrix',
    name: 'CRITICAL MATRIX',
    description: 'All towers gain +2% crit chance per run. Stacks up to 15x.',
    icon: '◈',
    baseCost: 40,
    stackStep: 30,
    maxStacks: 15,
    category: 'power',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.globalCritChancePct = stacks * 0.02; },
  },
  {
    id: 'overclocked',
    name: 'OVERCLOCKED CORE',
    description: 'All towers fire +3% faster per run. Stacks up to 10x.',
    icon: '⚡',
    baseCost: 50,
    stackStep: 40,
    maxStacks: 10,
    category: 'power',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.globalRatePct = stacks * 0.03; },
  },
  {
    id: 'extended_sensors',
    name: 'EXTENDED SENSORS',
    description: 'All towers gain +2% range per run. Stacks up to 10x.',
    icon: '◎',
    baseCost: 45,
    stackStep: 35,
    maxStacks: 10,
    category: 'power',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.globalRangePct = stacks * 0.02; },
  },
  {
    id: 'hardened_core',
    name: 'HARDENED CORE',
    description: 'Start each run with +15 bonus HP. Stacks up to 5x.',
    icon: '♦',
    baseCost: 60,
    stackStep: 80,
    maxStacks: 5,
    category: 'power',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.bonusStartingHp = stacks * 15; },
  },

  // ── AUGMENTS ──────────────────────────────────────────────────────────────
  {
    id: 'revive_module',
    name: 'REVIVE MODULE',
    description: 'Once per run, survive a lethal hit at 1 HP instead of dying.',
    icon: '↺',
    baseCost: 300,
    stackStep: 0,
    maxStacks: 1,
    category: 'loadout',
    effect: (save: SaveData) => { save.metaBoosts.hasRevive = true; },
  },
  {
    id: 'suppression_field',
    name: 'SUPPRESSION FIELD',
    description: 'All enemies move 3% slower per run. Stacks up to 5x.',
    icon: '⇓',
    baseCost: 50,
    stackStep: 50,
    maxStacks: 5,
    category: 'loadout',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.enemySpeedDebuff = stacks * 0.03; },
  },
  {
    id: 'repair_protocol',
    name: 'REPAIR PROTOCOL',
    description: 'Recover +2 HP each wave cleared. Stacks up to 4x.',
    icon: '♥',
    baseCost: 70,
    stackStep: 60,
    maxStacks: 4,
    category: 'loadout',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.hpRegenPerWave = stacks * 2; },
  },
  {
    id: 'armor_crack',
    name: 'ARMOR CRACK',
    description: 'All enemies spawn with -1 armor per run. Stacks up to 3x.',
    icon: '⚔',
    baseCost: 60,
    stackStep: 50,
    maxStacks: 3,
    category: 'loadout',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.globalArmorReduction = stacks; },
  },
  {
    id: 'bounty_chip',
    name: 'BOUNTY CHIP',
    description: 'Earn +1 extra Protocol per boss kill. Stacks up to 5x.',
    icon: '◈',
    baseCost: 80,
    stackStep: 60,
    maxStacks: 5,
    category: 'loadout',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.bossProtocolBonus = stacks; },
  },

  // ── ECONOMY ───────────────────────────────────────────────────────────────
  // PROTOCOL AUDIT removed — stacking XP boost past wave 20 blew past the
  // draft pool even after nerfing the rate.
  {
    id: 'data_harvest',
    name: 'DATA HARVEST',
    description: 'Earn +1 bonus Protocol each wave cleared. Max 3 stacks.',
    icon: '◆',
    baseCost: 80,
    stackStep: 90,
    maxStacks: 3,
    category: 'economy',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.bonusProtocolsPerWave = stacks; },
  },

  // ── UTILITY ───────────────────────────────────────────────────────────────
  {
    id: 'card_bandwidth',
    name: 'CARD BANDWIDTH',
    description: 'Draw +1 card option per draft. Stacks up to 2x.',
    icon: '●●',
    baseCost: 200,
    stackStep: 400,
    maxStacks: 2,
    category: 'utility',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.extraDraftCards = stacks; },
  },
  {
    id: 'reroll_cache',
    name: 'REROLL CACHE',
    description: 'Start each draft with +1 reroll available. Stacks up to 4x.',
    icon: '↻',
    baseCost: 60,
    stackStep: 70,
    maxStacks: 4,
    category: 'utility',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.extraRerolls = stacks; },
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
    globalCritChancePct: 0,
    globalRatePct: 0,
    globalRangePct: 0,
    bonusStartingHp: 0,
    bonusProtocolsPerWave: 0,
    startingLevel: 0,
    extraDraftCards: 0,
    extraRerolls: 0,
    xpBoostPct: 0,
    startingDeployTokens: {},
    hasRevive: false,
    enemySpeedDebuff: 0,
    hpRegenPerWave: 0,
    globalArmorReduction: 0,
    bossProtocolBonus: 0,
  };
  for (const u of SHOP_UPGRADES) {
    const stacks = save.shopPurchased[u.id] ?? 0;
    if (stacks > 0) u.effect(save, stacks);
  }
}
