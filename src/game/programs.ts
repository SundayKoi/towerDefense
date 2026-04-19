import type { RunState } from '@/types';

// ─── PROGRAM DECK ──────────────────────────────────────────────────────────
// Active abilities the player triggers during a wave. Each has a cooldown;
// hitting the hotkey / chip while on CD is a no-op. Programs are the game's
// primary "hacker verb" layer — they turn the TD from 100% pre-wave setup into
// a system you actively operate mid-wave.
//
// Program execution lives in engine.ts (see triggerProgram) so it has access
// to the damage pipeline. This file owns the static catalog only — no imports
// from engine to keep the dependency flow one-way.

export type ProgramId = 'emp_burst' | 'patch' | 'kernel_panic' | 'trace';

export interface ProgramDef {
  id: ProgramId;
  name: string;
  hotkey: string;
  cooldown: number;
  description: string;
  color: string;
}

export const PROGRAMS: Record<ProgramId, ProgramDef> = {
  emp_burst: {
    id: 'emp_burst',
    name: 'EMP BURST',
    hotkey: '1',
    cooldown: 22,
    description: 'EM pulse: 80 energy damage to every enemy on-map.',
    color: '#ffd600',
  },
  patch: {
    id: 'patch',
    name: 'PATCH',
    hotkey: '2',
    cooldown: 55,
    description: 'Restore 12 mainframe integrity.',
    color: '#00ff88',
  },
  kernel_panic: {
    id: 'kernel_panic',
    name: 'KERNEL PANIC',
    hotkey: '3',
    cooldown: 42,
    description: 'Freeze every enemy 2.5s. Slow-immune take 30 damage instead.',
    color: '#b847ff',
  },
  trace: {
    id: 'trace',
    name: 'TRACE',
    hotkey: '4',
    cooldown: 30,
    description: 'Reveal stealth + mark all enemies for +30% dmg (6s).',
    color: '#00fff0',
  },
};

export const PROGRAM_IDS: ProgramId[] = ['emp_burst', 'patch', 'kernel_panic', 'trace'];

export function tickPrograms(s: RunState, dt: number): void {
  if (!s.programs) return;
  for (const p of s.programs) {
    if (p.cooldownLeft > 0) p.cooldownLeft = Math.max(0, p.cooldownLeft - dt);
  }
}
