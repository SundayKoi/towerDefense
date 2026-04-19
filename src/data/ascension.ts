// ─── ASCENSION / ICE DEPTH ──────────────────────────────────────────────────
// Post-campaign stacking difficulty. Each level ratchets a set of modifiers
// multiplicatively. Unlocked progressively: hard-clear at level N unlocks N+1.
// Cap at 10 — that's plenty of runway and keeps the numbers on a chart.

export const ASCENSION_MAX = 10;

export interface AscensionMods {
  hpMult: number;
  speedMult: number;
  extraTurretLocks: number;
  draftReduction: number;   // subtract from draftSize
  bossPhaseEarlyPct: number; // not wired yet — reserved for later boss mechanic shifting
}

export function computeAscensionMods(level: number): AscensionMods {
  const L = Math.max(0, Math.min(ASCENSION_MAX, level | 0));
  return {
    hpMult: 1 + L * 0.08,
    speedMult: 1 + L * 0.03,
    extraTurretLocks: Math.floor(L / 2),
    draftReduction: Math.floor(L / 3),
    bossPhaseEarlyPct: L * 0.01,
  };
}

// One-line summaries shown in the ascension picker UI. Indexed 1..MAX.
export const ASCENSION_DESCRIPTIONS: Record<number, string[]> = {
  1:  ['+8% enemy HP', '+3% enemy speed'],
  2:  ['+16% enemy HP', '+6% speed', '+1 turret lock'],
  3:  ['+24% enemy HP', '+9% speed', '+1 turret lock', '-1 draft option'],
  4:  ['+32% enemy HP', '+12% speed', '+2 turret locks', '-1 draft option'],
  5:  ['+40% enemy HP', '+15% speed', '+2 turret locks', '-1 draft option'],
  6:  ['+48% enemy HP', '+18% speed', '+3 turret locks', '-2 draft options'],
  7:  ['+56% enemy HP', '+21% speed', '+3 turret locks', '-2 draft options'],
  8:  ['+64% enemy HP', '+24% speed', '+4 turret locks', '-2 draft options'],
  9:  ['+72% enemy HP', '+27% speed', '+4 turret locks', '-3 draft options'],
  10: ['+80% enemy HP', '+30% speed', '+5 turret locks', '-3 draft options', 'FINAL DEPTH'],
};
