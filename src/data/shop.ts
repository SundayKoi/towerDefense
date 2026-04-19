import type { ShopUpgradeDef, SaveData } from '@/types';

// Meta-progression purchases. Protocols earned persist across runs.
// Effects write to save.metaBoosts which createRun reads when seeding a new RunState.

// REBALANCE (v2): shop stacks were too decisive — max adaptive-weapons alone
// gave +40% damage and CRITICAL MATRIX pushed crit chance so high that
// quantum was crit-on-every-shot. New philosophy: shop upgrades are a gentle
// "new game" lean, not a power spike. Per-stack effects are small,
// generic boosts cap at 10 stacks, and costs ramp hard so committing to
// the full cap takes real play time. Specialty upgrades (NEURAL BOOSTER,
// CARD BANDWIDTH, REVIVE, ARMOR CRACK, etc.) keep smaller stack caps
// because their per-stack impact is too strong to scale to 10.
export const SHOP_UPGRADES: ShopUpgradeDef[] = [
  // ── COMBAT (generic stat boosts — +1%/stack, cap 10) ────────────────────
  {
    id: 'adaptive_weapons',
    name: 'ADAPTIVE WEAPONS',
    description: '+1% global damage per stack. Max 10 stacks (+10%).',
    icon: '▲',
    baseCost: 50,
    stackStep: 60,
    maxStacks: 10,
    category: 'power',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.globalDamagePct = stacks * 0.01; },
  },
  {
    id: 'neural_booster',
    name: 'NEURAL BOOSTER',
    description: 'Start each run at level +1 with a free draft. Max 2 stacks — further skips past early drafts warp branch commitment.',
    icon: '∆',
    baseCost: 250,
    stackStep: 400,
    maxStacks: 2,
    category: 'power',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.startingLevel = stacks; },
  },
  {
    id: 'critical_matrix',
    name: 'CRITICAL MATRIX',
    description: '+0.5% crit chance per stack. Max 10 stacks (+5%).',
    icon: '◈',
    baseCost: 60,
    stackStep: 70,
    maxStacks: 10,
    category: 'power',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.globalCritChancePct = stacks * 0.005; },
  },
  {
    id: 'overclocked',
    name: 'OVERCLOCKED CORE',
    description: '+1% fire rate per stack. Max 10 stacks (+10%).',
    icon: '⚡',
    baseCost: 60,
    stackStep: 70,
    maxStacks: 10,
    category: 'power',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.globalRatePct = stacks * 0.01; },
  },
  {
    id: 'extended_sensors',
    name: 'EXTENDED SENSORS',
    description: '+1% turret range per stack. Max 10 stacks (+10%).',
    icon: '◎',
    baseCost: 50,
    stackStep: 60,
    maxStacks: 10,
    category: 'power',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.globalRangePct = stacks * 0.01; },
  },
  {
    id: 'hardened_core',
    name: 'HARDENED CORE',
    description: '+3 starting HP per stack. Max 5 stacks (+15 HP).',
    icon: '♦',
    baseCost: 70,
    stackStep: 80,
    maxStacks: 5,
    category: 'power',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.bonusStartingHp = stacks * 3; },
  },

  // ── AUGMENTS (specialty — smaller caps, each stack matters more) ────────
  {
    id: 'revive_module',
    name: 'REVIVE MODULE',
    description: 'Once per run, survive a lethal hit at 1 HP instead of dying.',
    icon: '↺',
    baseCost: 500,
    stackStep: 0,
    maxStacks: 1,
    category: 'loadout',
    effect: (save: SaveData) => { save.metaBoosts.hasRevive = true; },
  },
  {
    id: 'suppression_field',
    name: 'SUPPRESSION FIELD',
    description: '-1% enemy speed per stack. Max 5 stacks (-5%).',
    icon: '⇓',
    baseCost: 90,
    stackStep: 100,
    maxStacks: 5,
    category: 'loadout',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.enemySpeedDebuff = stacks * 0.01; },
  },
  {
    id: 'repair_protocol',
    name: 'REPAIR PROTOCOL',
    description: '+1 HP/wave per stack. Max 5 stacks (+5 HP/wave).',
    icon: '♥',
    baseCost: 100,
    stackStep: 120,
    maxStacks: 5,
    category: 'loadout',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.hpRegenPerWave = stacks * 1; },
  },
  {
    id: 'armor_crack',
    name: 'ARMOR CRACK',
    description: '-1 enemy armor per stack. Max 2 stacks — each point shifts whole mid-game matchups.',
    icon: '⚔',
    baseCost: 300,
    stackStep: 400,
    maxStacks: 2,
    category: 'loadout',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.globalArmorReduction = stacks; },
  },
  {
    id: 'bounty_chip',
    name: 'BOUNTY CHIP',
    description: '+1 protocol per boss kill per stack. Max 5 stacks.',
    icon: '◈',
    baseCost: 120,
    stackStep: 130,
    maxStacks: 5,
    category: 'loadout',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.bossProtocolBonus = stacks; },
  },

  // ── ECONOMY ───────────────────────────────────────────────────────────────
  {
    id: 'data_harvest',
    name: 'DATA HARVEST',
    description: '+1 bonus Protocol per wave cleared per stack. Max 3 stacks.',
    icon: '◆',
    baseCost: 150,
    stackStep: 200,
    maxStacks: 3,
    category: 'economy',
    effect: (save: SaveData, stacks: number) => { save.metaBoosts.bonusProtocolsPerWave = stacks; },
  },

  // ── UTILITY ───────────────────────────────────────────────────────────────
  // CARD BANDWIDTH removed — +1 draft option stacked too aggressively with the
  // difficulty profile's own draft counts. Players leaned on it instead of
  // engaging with rerolls. REROLL CACHE covers the same RNG-soften need at a
  // tighter scope.
  {
    id: 'reroll_cache',
    name: 'REROLL CACHE',
    description: '+1 starting draft reroll per stack. Max 5 stacks.',
    icon: '↻',
    baseCost: 90,
    stackStep: 100,
    maxStacks: 5,
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
    // Clamp to maxStacks so old saves that bought past a now-lower cap don't
    // over-apply the effect. Excess shopPurchased counts are preserved so a
    // future cap raise still honors the purchase; they just don't stack past
    // the current ceiling.
    const raw = save.shopPurchased[u.id] ?? 0;
    const stacks = Math.min(raw, u.maxStacks);
    if (stacks > 0) u.effect(save, stacks);
  }
}
