// Game screen: HUD overlay + canvas + action bar.
// Post-pivot: credits removed. HUD shows HP, LEVEL, XP bar, deploy tokens, and map name.

import type { RunState, SaveData, TargetMode, TowerId, TowerInstance } from '@/types';
import { TOWERS } from '@/data/towers';
import { getMap } from '@/data/maps';
import { audio } from '@/audio/sfx';
import type { Screen } from './screens';
import { getTowerDataUrl } from '@/render/sprites';

export const TARGET_MODE_LABEL: Record<TargetMode, string> = {
  first: 'FIRST',
  strong: 'STRONG',
  weak: 'WEAK',
  close: 'CLOSE',
};
export const TARGET_MODE_DESC: Record<TargetMode, string> = {
  first: 'target furthest along path',
  strong: 'target highest HP',
  weak: 'target lowest HP (finisher)',
  close: 'target nearest to tower',
};
export const TARGET_MODE_GLYPH: Record<TargetMode, string> = {
  first: '\u25B6',    // ▶ (forward-pointing)
  strong: '\u2B24',   // ⬤ (big filled)
  weak: '\u25CE',     // ◎ (bullseye)
  close: '\u29BF',    // ⦿ (circle with dot)
};

export interface GameScreenHandles {
  canvas: HTMLCanvasElement;
  hudHp: HTMLElement;
  hudLevel: HTMLElement;
  hudXpFill: HTMLElement;
  hudXpText: HTMLElement;
  hudWave: HTMLElement;
  hudMap: HTMLElement;
  hudTokens: HTMLElement;
  startBtn: HTMLButtonElement;
  pauseBtn: HTMLButtonElement;
  buildBtn: HTMLButtonElement;
  speedBtn: HTMLButtonElement;
  cancelBtn: HTMLButtonElement;
  paletteEl: HTMLElement;
  selectedEl: HTMLElement;
  paletteTowersContainer: HTMLElement;
}

export function gameScreen(s: RunState, _save: SaveData): Screen & { handles: () => GameScreenHandles } {
  let handles!: GameScreenHandles;

  const fn: Screen = (root) => {
    root.innerHTML = `
      <div class="screen game-screen">
        <header class="hud">
          <div class="hud-cell hp"><span class="label">INTEGRITY</span><span class="value" id="hud-hp">${s.hp}</span></div>
          <div class="hud-cell level">
            <span class="label">LEVEL</span>
            <span class="value" id="hud-level">${s.level}</span>
            <div class="xp-bar"><div class="xp-fill" id="hud-xp-fill"></div></div>
            <span class="xp-text" id="hud-xp-text">${s.xp}/${s.xpToNext}</span>
          </div>
          <div class="hud-cell wave"><span class="label">WAVE</span><span class="value" id="hud-wave">${s.wave}/${s.totalWaves}</span></div>
          <div class="hud-cell map"><span class="label">MAP</span><span class="value" id="hud-map">${getMap(s.mapId).name}</span></div>
        </header>

        <div class="tokens-bar" id="hud-tokens"></div>

        <div class="canvas-wrap">
          <canvas id="game-canvas"></canvas>
          <span class="corner-bracket corner-tl" aria-hidden="true"></span>
          <span class="corner-bracket corner-tr" aria-hidden="true"></span>
          <span class="corner-bracket corner-bl" aria-hidden="true"></span>
          <span class="corner-bracket corner-br" aria-hidden="true"></span>
        </div>

        <div class="action-bar">
          <button class="btn action-btn" id="btn-pause" aria-label="menu">&#9776;</button>
          <button class="btn action-btn" id="btn-build" aria-label="build" title="Build &amp; stats">&#9878;</button>
          <button class="btn action-btn" id="btn-speed">1&times;</button>
          <button class="btn btn-danger" id="btn-cancel" style="display:none">CANCEL</button>
          <button class="btn btn-primary btn-grow" id="btn-start-wave">START WAVE</button>
        </div>

        <div class="palette" id="tower-palette">
          <div class="palette-header">
            <span>DEPLOY ICE</span>
            <button class="palette-close" id="palette-close">&times;</button>
          </div>
          <div class="palette-towers" id="palette-towers"></div>
        </div>

        <div class="selected-tower" id="selected-tower"></div>
      </div>
    `;

    const canvas = root.querySelector('#game-canvas') as HTMLCanvasElement;
    handles = {
      canvas,
      hudHp: root.querySelector('#hud-hp') as HTMLElement,
      hudLevel: root.querySelector('#hud-level') as HTMLElement,
      hudXpFill: root.querySelector('#hud-xp-fill') as HTMLElement,
      hudXpText: root.querySelector('#hud-xp-text') as HTMLElement,
      hudWave: root.querySelector('#hud-wave') as HTMLElement,
      hudMap: root.querySelector('#hud-map') as HTMLElement,
      hudTokens: root.querySelector('#hud-tokens') as HTMLElement,
      startBtn: root.querySelector('#btn-start-wave') as HTMLButtonElement,
      pauseBtn: root.querySelector('#btn-pause') as HTMLButtonElement,
      buildBtn: root.querySelector('#btn-build') as HTMLButtonElement,
      speedBtn: root.querySelector('#btn-speed') as HTMLButtonElement,
      cancelBtn: root.querySelector('#btn-cancel') as HTMLButtonElement,
      paletteEl: root.querySelector('#tower-palette') as HTMLElement,
      selectedEl: root.querySelector('#selected-tower') as HTMLElement,
      paletteTowersContainer: root.querySelector('#palette-towers') as HTMLElement,
    };

    const close = root.querySelector('#palette-close') as HTMLButtonElement;
    close.onclick = () => { handles.paletteEl.classList.remove('open'); audio.play('ui_click'); };
  };

  (fn as any).handles = () => handles;
  return fn as Screen & { handles: () => GameScreenHandles };
}

// Render the tokens bar: shows towers the player currently has deploy-tokens for.
export function renderTokensBar(handles: GameScreenHandles, s: RunState, onTokenClick: (id: TowerId, ev?: PointerEvent) => void): void {
  const bar = handles.hudTokens;
  bar.innerHTML = '';
  const entries = Object.entries(s.deployTokens).filter(([, n]) => (n as number) > 0) as [TowerId, number][];
  if (entries.length === 0) {
    bar.classList.add('empty');
    bar.innerHTML = '<span class="tokens-empty">NO DEPLOYS — LEVEL UP TO DRAFT TOWERS</span>';
    return;
  }
  bar.classList.remove('empty');
  for (const [id, count] of entries) {
    const def = TOWERS[id];
    const btn = document.createElement('button');
    btn.className = 'token-chip';
    btn.style.setProperty('--accent', def.accentColor);
    btn.innerHTML = `
      <span class="token-portrait"></span>
      <span class="token-info">
        <span class="token-name">${def.name}</span>
        <span class="token-count">\u00d7${count}</span>
      </span>
    `;
    const url = getTowerDataUrl(id);
    if (url) {
      const img = document.createElement('img');
      img.src = url;
      img.alt = def.name;
      (btn.querySelector('.token-portrait') as HTMLElement).appendChild(img);
    }
    // pointerdown drives both tap-to-arm and drag-to-place — main.ts handles the lift/drop.
    btn.addEventListener('pointerdown', (ev) => { audio.play('ui_click'); onTokenClick(id, ev); });
    bar.appendChild(btn);
  }
}

// Tower palette (shown when tapping empty cell) — lists only tokens you have.
export function renderPalette(handles: GameScreenHandles, s: RunState, onPick: (id: TowerId, ev?: PointerEvent) => void): void {
  const container = handles.paletteTowersContainer;
  container.innerHTML = '';
  const entries = Object.entries(s.deployTokens).filter(([, n]) => (n as number) > 0) as [TowerId, number][];
  if (entries.length === 0) {
    container.innerHTML = '<div class="palette-empty">No deploy tokens. Clear waves and level up to draft towers.</div>';
    return;
  }
  for (const [id, count] of entries) {
    const def = TOWERS[id];
    const btn = document.createElement('button');
    btn.className = 'tower-card';
    btn.style.setProperty('--accent', def.accentColor);
    btn.innerHTML = `
      <div class="tower-card-portrait" style="--accent:${def.accentColor}"></div>
      <div class="tower-card-name">${def.name}</div>
      <div class="tower-card-stats">
        <span>${def.damage} DMG</span><span>${def.range.toFixed(1)} RNG</span>
      </div>
      <div class="tower-card-cost">\u00d7${count} AVAILABLE</div>
      <div class="tower-card-desc">${def.description}</div>
    `;
    const portrait = btn.querySelector('.tower-card-portrait') as HTMLElement;
    const url = getTowerDataUrl(id);
    if (url) {
      const img = document.createElement('img');
      img.src = url;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.filter = `drop-shadow(0 0 8px ${def.accentColor})`;
      portrait.appendChild(img);
    }
    btn.addEventListener('pointerdown', (ev) => { audio.play('ui_click'); onPick(id, ev); });
    container.appendChild(btn);
  }
  // Hard-mode turret lock: show a disabled chip per locked turret so the player
  // understands why a familiar tower is unavailable this run.
  for (const locked of s.lockedTurrets) {
    const def = TOWERS[locked];
    if (!def) continue;
    const chip = document.createElement('div');
    chip.className = 'tower-card tower-card-locked';
    chip.style.setProperty('--accent', '#555');
    chip.style.opacity = '0.45';
    chip.style.filter = 'grayscale(1)';
    chip.style.pointerEvents = 'none';
    chip.innerHTML = `
      <div class="tower-card-portrait" style="--accent:#555"></div>
      <div class="tower-card-name">${def.name}</div>
      <div class="tower-card-stats"><span>LOCKED</span></div>
      <div class="tower-card-cost">HARD-MODE LOCK</div>
      <div class="tower-card-desc">Randomly excluded this run.</div>
    `;
    container.appendChild(chip);
  }
}

// Selected tower detail panel. No upgrade button — upgrades come from cards.
function overdriveDisplay(t: TowerInstance): { label: string; cls: string; disabled: boolean } {
  const odActive = (t.extras.overdriveActive ?? 0) > 0;
  const odOffline = (t.extras.overdriveOffline ?? 0) > 0;
  const odCharge = t.extras.overdriveCharge ?? 0;
  if (odActive) return { label: `BURNING (${(t.extras.overdriveActive).toFixed(1)}s)`, cls: 'btn btn-primary', disabled: true };
  if (odOffline) return { label: `OFFLINE (${(t.extras.overdriveOffline).toFixed(1)}s)`, cls: 'btn btn-danger', disabled: true };
  if (odCharge > 0) return { label: `CHARGING (${odCharge.toFixed(0)}s)`, cls: 'btn btn-ghost', disabled: true };
  return { label: 'OVERDRIVE', cls: 'btn btn-primary', disabled: false };
}

// Lightweight refresh: only updates dynamic parts of the panel (overdrive button +
// subnet readout) without destroying the DOM. Critical so the X button isn't
// rebuilt between a user's pointerdown and pointerup.
export function refreshSelectedTowerLive(handles: GameScreenHandles, s: RunState): void {
  const sel = s.selection;
  if (sel.kind !== 'tower') return;
  const t = s.towers.find((x) => x.id === sel.towerId);
  if (!t) return;
  const box = handles.selectedEl;
  const odBtn = box.querySelector('#sel-overdrive') as HTMLButtonElement | null;
  if (odBtn) {
    const od = overdriveDisplay(t);
    odBtn.textContent = od.label;
    odBtn.className = od.cls;
    odBtn.disabled = od.disabled;
  }
  const subnetEl = box.querySelector('#sel-subnet') as HTMLElement | null;
  const subnetMult = t.extras.subnetMult ?? 1;
  const subnetSize = t.extras.subnetSize ?? 1;
  const subnetTypes = t.extras.subnetTypes ?? 1;
  if (subnetEl && subnetSize > 1) {
    subnetEl.innerHTML = `SUBNET: ${subnetSize} nodes / ${subnetTypes} types &nbsp;<b>+${Math.round((subnetMult - 1) * 100)}% DMG</b>`;
    subnetEl.style.display = '';
  } else if (subnetEl) {
    subnetEl.style.display = 'none';
  }
}

// Includes a TARGETING mode toggle (FIRST / STRONG / WEAK / CLOSE) cycling on tap.
export function renderSelectedTower(
  handles: GameScreenHandles,
  s: RunState,
  onRemove: () => void,
  onCycleTarget: () => void,
  onOverdrive: () => void,
): void {
  const box = handles.selectedEl;
  const sel = s.selection;
  if (sel.kind !== 'tower') { box.classList.remove('open'); box.innerHTML = ''; return; }
  const t = s.towers.find((x) => x.id === sel.towerId);
  if (!t) { box.classList.remove('open'); box.innerHTML = ''; return; }
  const def = TOWERS[t.def];
  const dmgMod = 1 + s.mods.globalDamagePct + (s.mods.towerDmg[t.def] ?? 0);
  const rangeMod = 1 + s.mods.globalRangePct + (s.mods.towerRange[t.def] ?? 0);
  const rateMod = 1 + s.mods.globalRatePct + (s.mods.towerRate[t.def] ?? 0);
  const effDmg = Math.round(def.damage * dmgMod);
  const effRange = (def.range * rangeMod).toFixed(1);
  const effRate = (def.fireRate * rateMod).toFixed(2);
  // Subnet bonus readout — element always present, refreshed in-place by the live updater.
  const subnetMult = t.extras.subnetMult ?? 1;
  const subnetSize = t.extras.subnetSize ?? 1;
  const subnetTypes = t.extras.subnetTypes ?? 1;
  const subnetHtml = `<div class="sel-subnet" id="sel-subnet" style="${subnetSize > 1 ? '' : 'display:none'}">SUBNET: ${subnetSize} nodes / ${subnetTypes} types &nbsp;<b>+${Math.round((subnetMult - 1) * 100)}% DMG</b></div>`;
  // Overdrive button state. Hidden entirely for support turrets (data_miner, booster_node)
  // since they have no firing loop for OVERDRIVE to boost.
  const isSupport = t.def === 'booster_node' || t.def === 'data_miner';
  const od = overdriveDisplay(t);
  const odLabel = od.label;
  const odClass = od.cls;
  const odDisabled = od.disabled;
  box.innerHTML = `
    <div class="sel-tower-header" style="--accent:${def.accentColor}">
      <div class="sel-tower-name">${def.name} <span class="sel-tower-type">${def.damageType.toUpperCase()}</span></div>
      <button class="palette-close" id="sel-close">&times;</button>
    </div>
    <div class="sel-tower-stats">
      <span>DMG <b>${effDmg}</b></span>
      <span>RNG <b>${effRange}</b></span>
      <span>RATE <b>${effRate}/s</b></span>
    </div>
    ${subnetHtml}
    <button class="target-mode-btn" id="sel-target">
      <span class="tm-glyph">${TARGET_MODE_GLYPH[t.targetMode]}</span>
      <span class="tm-body">
        <span class="tm-label">TARGETING: ${TARGET_MODE_LABEL[t.targetMode]}</span>
        <span class="tm-desc">${TARGET_MODE_DESC[t.targetMode]} — tap to cycle</span>
      </span>
    </button>
    <div class="sel-tower-actions">
      ${isSupport ? '' : `<button class="${odClass}" id="sel-overdrive" ${odDisabled ? 'disabled' : ''}>${odLabel}</button>`}
      <button class="btn btn-danger" id="sel-remove">REMOVE</button>
    </div>
  `;
  box.classList.add('open');
  (box.querySelector('#sel-close') as HTMLButtonElement).onclick = () => { s.selection = { kind: 'none' }; box.classList.remove('open'); };
  (box.querySelector('#sel-target') as HTMLButtonElement).onclick = () => { onCycleTarget(); };
  (box.querySelector('#sel-remove') as HTMLButtonElement).onclick = () => { audio.play('ui_click'); onRemove(); };
  const odBtn = box.querySelector('#sel-overdrive') as HTMLButtonElement | null;
  if (odBtn) odBtn.onclick = () => { if (!odDisabled) onOverdrive(); };
}
