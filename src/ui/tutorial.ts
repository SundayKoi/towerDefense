// First-time contextual popups + a permanent HOW TO PLAY reference screen.

import type { SaveData } from '@/types';
import { mount, type Screen } from './screens';
import { audio } from '@/audio/sfx';
import { ACTS } from '@/data/maps';

export interface TutorialTip {
  id: string;
  title: string;
  body: string;
}

export const TIPS: Record<string, TutorialTip> = {
  first_run: {
    id: 'first_run',
    title: 'INTRUSION DETECTED',
    body: 'Hostiles will follow the path. Stop them before they reach the EXIT.<br><br>Drag a turret from the bottom token bar onto a grid cell to deploy it. Tap the START WAVE button when ready.',
  },
  first_place: {
    id: 'first_place',
    title: 'TURRET DEPLOYED',
    body: 'Tap any placed turret to view its stats, change its targeting mode, or trigger OVERDRIVE — a 4-second damage burst.<br><br>Tap CANCEL on the action bar to deselect.',
  },
  first_levelup: {
    id: 'first_levelup',
    title: 'LEVEL UP — DRAFT A CARD',
    body: 'Each level grants you a card draft. Cards are permanent for the run — they unlock new turrets, add upgrades to your existing ones, or grant special bonuses.<br><br>Pick wisely. Cards never appear twice in the same run.',
  },
  first_subnet: {
    id: 'first_subnet',
    title: 'SUBNET ESTABLISHED',
    body: 'Adjacent turrets (including diagonals) form a SUBNET. Each turret in the subnet gets bonus damage scaled by both subnet size and tower-type DIVERSITY.<br><br>Mix different turret types in tight clusters for the biggest multipliers — visible as the connecting glow lines.',
  },
  first_wave_clear: {
    id: 'first_wave_clear',
    title: 'WAVE CLEARED',
    body: 'You earned XP and PROTOCOLS. XP fuels your card drafts; protocols are saved across runs and spent in the UPGRADE TERMINAL for permanent boosts.<br><br>Map clears unlock new turrets and cards. Aim for higher difficulties for bigger rewards.',
  },
  first_packet: {
    id: 'first_packet',
    title: 'PACKET DROPPED',
    body: 'Hostiles sometimes drop a glowing packet on death. TAP it within 5 seconds to claim a temporary buff:<br><br>&nbsp;&nbsp;<b>+D</b> &mdash; +50% turret damage (8s)<br>&nbsp;&nbsp;<b>+R</b> &mdash; +50% fire rate (8s)<br>&nbsp;&nbsp;<b>XP</b> &mdash; instant +15 XP<br>&nbsp;&nbsp;<b>+H</b> &mdash; restore 5 integrity<br><br>Packets fade if left uncollected. Bosses always drop one.',
  },
};

export function showTutorialIfNew(save: SaveData, persist: () => void, tipId: keyof typeof TIPS): void {
  if (save.tutorial.seen.includes(tipId)) return;
  save.tutorial.seen.push(tipId);
  persist();
  showTipPopup(TIPS[tipId]);
}

// Act-briefing modal: fires the first time a player starts any map in a new act.
// Uses save.tutorial.seen with IDs `act_<n>_brief` so it only shows once per act.
// Act 1 is skipped on purpose — no modifier, and the first_run tip already covers basics.
export function showActBriefingIfNew(save: SaveData, persist: () => void, actNum: number): void {
  if (actNum < 2 || actNum > 7) return;
  const id = `act_${actNum}_brief`;
  if (save.tutorial.seen.includes(id)) return;
  const meta = ACTS.find((a) => a.act === actNum);
  if (!meta) return;
  save.tutorial.seen.push(id);
  persist();
  showActPopup(meta.act, meta.name, meta.tagline, meta.brief);
}

function showActPopup(actNum: number, name: string, tagline: string, brief: string): void {
  const el = document.createElement('div');
  el.className = 'modal-overlay';
  el.innerHTML = `
    <div class="modal tutorial-modal">
      <div class="tutorial-tag">// ACT ${actNum} // INTRUSION BRIEF</div>
      <div class="tutorial-title">${name}</div>
      <div class="tutorial-body">
        <div style="font-style:italic;opacity:0.8;margin-bottom:0.6em;">${tagline}</div>
        ${brief}
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" id="act-ok">DEPLOY</button>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  (el.querySelector('#act-ok') as HTMLButtonElement).onclick = () => { audio.play('ui_click'); el.remove(); };
}

function showTipPopup(tip: TutorialTip): void {
  const el = document.createElement('div');
  el.className = 'modal-overlay';
  el.innerHTML = `
    <div class="modal tutorial-modal">
      <div class="tutorial-tag">// FIRST-TIME TIP</div>
      <div class="tutorial-title">${tip.title}</div>
      <div class="tutorial-body">${tip.body}</div>
      <div class="modal-actions">
        <button class="btn btn-primary" id="tip-ok">UNDERSTOOD</button>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  (el.querySelector('#tip-ok') as HTMLButtonElement).onclick = () => { audio.play('ui_click'); el.remove(); };
}

// ─── HOW TO PLAY screen (permanent reference) ────────────────────────────

export function openHowToPlayScreen(onBack: () => void): void {
  mount(howToPlayScreen(onBack));
}

function howToPlayScreen(onBack: () => void): Screen {
  return (root) => {
    root.innerHTML = `
      <div class="screen screen-scroll htp-screen">
        <header class="topbar">
          <button class="btn btn-ghost" id="htp-back">&larr; BACK</button>
          <div class="topbar-title">HOW TO PLAY</div>
          <div></div>
        </header>

        <section class="htp-section">
          <h2 class="htp-h2">// THE GOAL</h2>
          <p>Stop hostile intrusions before they breach your INTEGRITY (HP). Each map has a fixed number of waves. Survive them all to win.</p>
        </section>

        <section class="htp-section">
          <h2 class="htp-h2">// PLACING TURRETS</h2>
          <ul class="htp-list">
            <li><b>DRAG</b> a turret from the bottom token bar (or palette) onto any empty grid cell to deploy it.</li>
            <li>Valid cells glow green while you're dragging. Released over a valid cell = placed; released anywhere else = canceled.</li>
            <li><b>TAP</b> a placed turret to open its panel — change targeting mode, trigger OVERDRIVE, or remove it.</li>
            <li><b>SINGLETON RULE</b>: only one of each turret type per run. Choose your build carefully.</li>
          </ul>
        </section>

        <section class="htp-section">
          <h2 class="htp-h2">// SUBNET LINKS</h2>
          <p>Adjacent turrets (≤1 cell, including diagonals) form a SUBNET. Each subnet member gets a damage multiplier:</p>
          <ul class="htp-list">
            <li>+8% damage per extra turret in the subnet</li>
            <li>+12% damage per unique turret TYPE in the subnet</li>
            <li>Capped at +60% total — DIVERSITY matters more than size</li>
            <li>Glowing connection lines show active links: cyan = same type, magenta = diverse</li>
          </ul>
        </section>

        <section class="htp-section">
          <h2 class="htp-h2">// PACKET DROPS</h2>
          <ul class="htp-list">
            <li>8% of enemy kills drop a glowing PACKET on the path. Bosses always drop one.</li>
            <li><b>TAP</b> the packet within 5 seconds to claim its buff. Missed packets fade.</li>
            <li><b>+D</b> (pink) = +50% turret damage for 8 seconds.</li>
            <li><b>+R</b> (cyan) = +50% fire rate for 8 seconds.</li>
            <li><b>XP</b> (green) = instant +15 XP — stacks into your level bar.</li>
            <li><b>+H</b> (yellow) = restore 5 integrity if damaged.</li>
          </ul>
        </section>

        <section class="htp-section">
          <h2 class="htp-h2">// OVERDRIVE</h2>
          <p>Tap a placed turret and hit the OVERDRIVE button to trigger a burst:</p>
          <ul class="htp-list">
            <li><b>4 seconds</b> at 3× damage and 2× fire rate</li>
            <li>Then <b>6 seconds OFFLINE</b> — turret can't fire</li>
            <li>Then a <b>30-second recharge</b> before usable again</li>
            <li>Best timed for boss waves or dense crowd surges</li>
          </ul>
        </section>

        <section class="htp-section">
          <h2 class="htp-h2">// CARDS &amp; DRAFTS</h2>
          <ul class="htp-list">
            <li>Each level-up grants a CARD DRAFT — pick one from a small pool of options.</li>
            <li>Cards are permanent for the run: they unlock turret upgrades, deploy tokens, heals, exotics, and synergies.</li>
            <li>Synergy cards require BOTH listed turrets to be placed before they appear.</li>
            <li>Some advanced cards are gated behind prerequisite picks — build a chain.</li>
            <li>Each card can only be drafted once per run.</li>
          </ul>
        </section>

        <section class="htp-section">
          <h2 class="htp-h2">// PROGRESSION</h2>
          <ul class="htp-list">
            <li>Clear maps to unlock new turrets and cards. Higher difficulties give better rewards.</li>
            <li>Earn PROTOCOLS from waves, kills, and bosses. Spend them in the UPGRADE TERMINAL for permanent boosts.</li>
            <li>Complete CONTRACTS (daily/weekly/monthly) for bonus protocols.</li>
            <li>Check the DATABANK to review unlocked turrets, cards, and intel on enemies you've fought.</li>
          </ul>
        </section>

        <section class="htp-section">
          <h2 class="htp-h2">// TIPS</h2>
          <ul class="htp-list">
            <li>Honeypot's slow lets your damage turrets get more shots off. Always pair it with a kinetic or piercer.</li>
            <li>Stack 3–4 different turret types adjacent for the maximum subnet bonus.</li>
            <li>Save OVERDRIVE for boss waves — the 6s offline penalty is worth it for the burst.</li>
            <li>Watch your CARDS DRAFTED count in the build stats — heavy upgrade investment in 1–2 turrets often beats spreading thin.</li>
            <li>Remove turrets you've outgrown — the freed cell can host a synergy partner.</li>
          </ul>
        </section>
      </div>
    `;
    (root.querySelector('#htp-back') as HTMLButtonElement).onclick = () => { audio.play('ui_click'); onBack(); };
  };
}
