// Web Vibration API haptics. Chrome Android + Samsung Internet support
// `navigator.vibrate(pattern)` where pattern is ms intervals: [on, off, on, ...].
// iOS Safari silently ignores the call. Desktop browsers also ignore.
//
// Throttling: max one vibrate per 150ms. Over-buzzing is the #1 haptic sin —
// a constantly buzzing phone feels broken, not responsive. Default OFF on
// desktop (pointer:fine) and ON on touch devices.

export type HapticEvent =
  | 'turret_shoot'
  | 'tower_placed'
  | 'tower_jammed'
  | 'wave_start'
  | 'boss_spawn'
  | 'take_damage_small'
  | 'take_damage_big'
  | 'game_over'
  | 'level_up'
  | 'card_drafted'
  | 'prestige_earned';

// Patterns sourced from audio/juice research — each feels semantically distinct
// while staying under the over-buzz threshold. Small array = polite pulse.
const PATTERNS: Record<HapticEvent, number | number[]> = {
  turret_shoot:      8,
  tower_placed:      [20, 40, 35],
  tower_jammed:      [60, 30, 60, 30, 60],
  wave_start:        [15, 50, 15, 50, 40],
  boss_spawn:        [120, 80, 40, 80, 200],
  take_damage_small: 30,
  take_damage_big:   80,
  game_over:         [200, 100, 200, 100, 400],
  level_up:          [25, 40, 25, 40, 80],
  card_drafted:      15,
  prestige_earned:   [40, 60, 40, 60, 40, 60, 150],
};

class Haptics {
  private enabled = false;
  private lastFire = 0;
  private readonly throttleMs = 150;

  constructor() {
    // Default on for touch devices, off for desktop.
    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      this.enabled = window.matchMedia('(pointer: coarse)').matches;
    }
  }

  setEnabled(on: boolean) { this.enabled = on; }
  isEnabled() { return this.enabled; }

  fire(event: HapticEvent): void {
    if (!this.enabled) return;
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    const now = performance.now();
    // Skip high-frequency events (turret shoot) if another fired very recently.
    // Milestone events (boss, game over) get a shorter ignore to still land.
    const isMilestone = event === 'boss_spawn' || event === 'game_over' || event === 'prestige_earned';
    const gate = isMilestone ? 40 : this.throttleMs;
    if (now - this.lastFire < gate) return;
    this.lastFire = now;
    try { navigator.vibrate(PATTERNS[event]); } catch { /* iOS + desktop no-op */ }
  }
}

export const haptics = new Haptics();
