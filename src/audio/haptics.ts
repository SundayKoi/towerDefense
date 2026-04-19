// Haptics with two backends:
//
//   Native (iOS / Android via Capacitor) — uses @capacitor/haptics. iOS gets
//     real Taptic Engine hits (Apple's `Haptics.impact` + `Haptics.notification`)
//     instead of the Vibration API, which iOS Safari ignores. Android routes
//     through the same plugin using its underlying vibration hardware.
//
//   Web (desktop / mobile browsers) — falls back to navigator.vibrate. iOS
//     Safari silently no-ops, which matches the previous behavior.
//
// The backend is selected once at module load. All call-sites use `haptics.fire(ev)`
// unchanged — the routing is internal.
//
// Throttling: max one hit per 150ms normally. Milestone events (boss, game-over,
// prestige) use a shorter gate so they still land even during heavy activity.

import { Capacitor } from '@capacitor/core';

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

// Web-Vibration fallback patterns (ms on/off sequence or a single ms value).
// Same patterns as before the Capacitor migration — desktop behaves identically.
const VIBRATE_PATTERNS: Record<HapticEvent, number | number[]> = {
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

// Native mapping — Taptic Engine / Android equivalent. Each event picks
// the closest semantic primitive. ImpactStyle is instantaneous 'tap' feel;
// NotificationType is multi-pulse (success/warning/error) feel.
type NativeHit =
  | { kind: 'impact'; style: 'Light' | 'Medium' | 'Heavy' }
  | { kind: 'notification'; type: 'Success' | 'Warning' | 'Error' }
  | { kind: 'selection' };

const NATIVE_HITS: Record<HapticEvent, NativeHit> = {
  turret_shoot:      { kind: 'selection' },                         // tiny tick
  tower_placed:      { kind: 'impact', style: 'Medium' },
  tower_jammed:      { kind: 'notification', type: 'Warning' },
  wave_start:        { kind: 'impact', style: 'Medium' },
  boss_spawn:        { kind: 'notification', type: 'Error' },
  take_damage_small: { kind: 'impact', style: 'Light' },
  take_damage_big:   { kind: 'impact', style: 'Heavy' },
  game_over:         { kind: 'notification', type: 'Error' },
  level_up:          { kind: 'notification', type: 'Success' },
  card_drafted:      { kind: 'impact', style: 'Light' },
  prestige_earned:   { kind: 'notification', type: 'Success' },
};

class Haptics {
  private enabled = false;
  private lastFire = 0;
  private readonly throttleMs = 150;
  private native: boolean = false;
  // Lazy-loaded plugin handle so the web bundle can tree-shake the module
  // if it detects we're not on native. Resolved on first fire().
  private nativePlugin: typeof import('@capacitor/haptics') | null = null;

  constructor() {
    // Default on for touch devices (native or mobile web), off for desktop.
    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      this.enabled = window.matchMedia('(pointer: coarse)').matches;
    }
    try {
      this.native = Capacitor.isNativePlatform();
    } catch {
      this.native = false;
    }
    if (this.native) {
      // Force-on for native — user implicitly opts in by installing the app.
      this.enabled = true;
      // Warm the import so the first fire isn't delayed. Fire-and-forget.
      import('@capacitor/haptics').then((mod) => { this.nativePlugin = mod; }).catch(() => {
        this.native = false; // if the plugin failed to load, fall back to web path
      });
    }
  }

  setEnabled(on: boolean) { this.enabled = on; }
  isEnabled() { return this.enabled; }

  fire(event: HapticEvent): void {
    if (!this.enabled) return;
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const isMilestone = event === 'boss_spawn' || event === 'game_over' || event === 'prestige_earned';
    const gate = isMilestone ? 40 : this.throttleMs;
    if (now - this.lastFire < gate) return;
    this.lastFire = now;

    if (this.native && this.nativePlugin) {
      this.fireNative(event);
      return;
    }
    this.fireWeb(event);
  }

  private fireNative(event: HapticEvent): void {
    const plugin = this.nativePlugin;
    if (!plugin) return;
    const hit = NATIVE_HITS[event];
    try {
      if (hit.kind === 'impact') {
        // ImpactStyle enum: Light / Medium / Heavy
        plugin.Haptics.impact({ style: plugin.ImpactStyle[hit.style] });
      } else if (hit.kind === 'notification') {
        // NotificationType enum: SUCCESS / WARNING / ERROR
        plugin.Haptics.notification({ type: plugin.NotificationType[hit.type] });
      } else if (hit.kind === 'selection') {
        plugin.Haptics.selectionStart();
        plugin.Haptics.selectionEnd();
      }
    } catch {
      // Swallow — native haptics failing shouldn't crash the game.
    }
  }

  private fireWeb(event: HapticEvent): void {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    try { navigator.vibrate(VIBRATE_PATTERNS[event]); } catch { /* iOS Safari / desktop no-op */ }
  }
}

export const haptics = new Haptics();
