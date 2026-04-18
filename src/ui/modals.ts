import { CARDS_BY_ID } from '@/data/cards';
import { ENEMIES } from '@/data/enemies';
import type { EnemyId, RunState } from '@/types';
import { audio } from '@/audio/sfx';

// --------- Build / stats modal ---------
// Shows run progress, active buffs synthesized from the cards picked, towers placed, and the
// full card draft log. Purely informational — opens from the HUD build button or pause.
import { TOWERS } from '@/data/towers';
import type { RunState as _RS, TowerId as _TID } from '@/types';
export function openBuildStats(r: _RS): HTMLElement {
  const el = document.createElement('div');
  el.className = 'modal-overlay';

  // Group cards picked by id + count.
  const cardCounts = new Map<string, number>();
  for (const id of r.cardsPicked) cardCounts.set(id, (cardCounts.get(id) ?? 0) + 1);
  const cardRows = Array.from(cardCounts.entries())
    .map(([id, count]) => {
      const c = CARDS_BY_ID[id];
      if (!c) return '';
      const badge = count > 1 ? `<span class="bs-count">\u00d7${count}</span>` : '';
      return `<div class="bs-card bs-rarity-${c.rarity}">
        <span class="bs-card-rarity">${c.rarity[0].toUpperCase()}</span>
        <span class="bs-card-name">${c.name}${badge}</span>
      </div>`;
    }).join('');

  // Group placed towers by type, with damage dealt stats.
  const towerCounts = new Map<_TID, number>();
  for (const t of r.towers) towerCounts.set(t.def, (towerCounts.get(t.def) ?? 0) + 1);
  const totalDmg = Object.values(r.damageDealt).reduce((a, b) => a + (b ?? 0), 0) || 1;
  const towerRows = Array.from(towerCounts.entries()).map(([id, count]) => {
    const def = TOWERS[id];
    const dmgMod = 1 + r.mods.globalDamagePct + (r.mods.towerDmg[id] ?? 0);
    const rngMod = 1 + r.mods.globalRangePct + (r.mods.towerRange[id] ?? 0);
    const rateMod = 1 + r.mods.globalRatePct + (r.mods.towerRate[id] ?? 0);
    const critChance = (def.crit?.chance ?? 0) + r.mods.globalCritChance + (r.mods.towerCrit[id] ?? 0);
    const critPct = Math.round(critChance * 100);
    const dealt = r.damageDealt[id] ?? 0;
    const pct = Math.round((dealt / totalDmg) * 100);
    const dealtLabel = dealt >= 1000 ? `${(dealt / 1000).toFixed(1)}k` : Math.round(dealt).toString();
    return `<div class="bs-tower" style="--accent:${def.accentColor}">
      <div class="bs-tower-header">
        <span class="bs-tower-name">${def.name}</span>
        <span class="bs-tower-stats">
          <span>DMG ${Math.round(def.damage * dmgMod)}</span>
          <span>RNG ${(def.range * rngMod).toFixed(1)}</span>
          <span>RATE ${(def.fireRate * rateMod).toFixed(2)}/s</span>
          ${critChance > 0 ? `<span>CRIT ${critPct}%</span>` : ''}
        </span>
      </div>
      ${dealt > 0 ? `
      <div class="bs-dmg-row">
        <div class="bs-dmg-bar-wrap">
          <div class="bs-dmg-bar" style="width:${pct}%;background:${def.accentColor}"></div>
        </div>
        <span class="bs-dmg-label">${dealtLabel} dmg &nbsp;<b>${pct}%</b></span>
      </div>` : ''}
    </div>`;
  }).join('');

  // Active buffs synopsis
  const buffs: string[] = [];
  if (r.mods.globalDamagePct > 0) buffs.push(`+${Math.round(r.mods.globalDamagePct * 100)}% global damage`);
  if (r.mods.globalRangePct > 0) buffs.push(`+${Math.round(r.mods.globalRangePct * 100)}% global range`);
  if (r.mods.globalRatePct > 0) buffs.push(`+${Math.round(r.mods.globalRatePct * 100)}% global fire rate`);
  if (r.mods.globalCritChance > 0) buffs.push(`+${Math.round(r.mods.globalCritChance * 100)}% crit chance`);
  if (r.mods.enemySpeedMult < 1) buffs.push(`enemies -${Math.round((1 - r.mods.enemySpeedMult) * 100)}% speed`);
  if (r.mods.xpMult > 1) buffs.push(`+${Math.round((r.mods.xpMult - 1) * 100)}% XP gain`);
  if (r.mods.revive) buffs.push('IMMORTAL PROTOCOL active');
  for (const [tid, pct] of Object.entries(r.mods.towerDmg)) if (pct) buffs.push(`+${Math.round((pct as number) * 100)}% ${TOWERS[tid as _TID].name} damage`);
  for (const [tid, pct] of Object.entries(r.mods.towerRange)) if (pct) buffs.push(`+${Math.round((pct as number) * 100)}% ${TOWERS[tid as _TID].name} range`);
  for (const [tid, pct] of Object.entries(r.mods.towerRate)) if (pct) buffs.push(`+${Math.round((pct as number) * 100)}% ${TOWERS[tid as _TID].name} fire rate`);
  for (const [tid, pct] of Object.entries(r.mods.towerCrit)) if (pct) buffs.push(`+${Math.round((pct as number) * 100)}% ${TOWERS[tid as _TID].name} crit`);
  const buffsHtml = buffs.length > 0
    ? buffs.map((b) => `<li>${b}</li>`).join('')
    : '<li class="bs-none">no active buffs yet</li>';

  el.innerHTML = `
    <div class="modal build-stats-modal">
      <div class="modal-title">\u2749 BUILD / RUN STATE</div>

      <div class="bs-section">
        <div class="bs-section-title">PROGRESS</div>
        <div class="bs-progress">
          <div class="bs-prog-cell"><span>LEVEL</span><b>${r.level}</b></div>
          <div class="bs-prog-cell"><span>XP</span><b>${Math.floor(r.xp)}/${r.xpToNext}</b></div>
          <div class="bs-prog-cell"><span>WAVE</span><b>${r.wave}/${r.totalWaves}</b></div>
          <div class="bs-prog-cell"><span>INTEGRITY</span><b>${r.hp}/${r.maxHp}</b></div>
          <div class="bs-prog-cell"><span>PROTOCOLS EARNED</span><b>+${r.protocolsEarned}</b></div>
        </div>
      </div>

      <div class="bs-section">
        <div class="bs-section-title">ACTIVE BUFFS</div>
        <ul class="bs-buffs">${buffsHtml}</ul>
      </div>

      <div class="bs-section">
        <div class="bs-section-title">DEPLOYED TOWERS (${r.towers.length})</div>
        <div class="bs-towers">
          ${towerRows || '<div class="bs-none">no towers deployed yet</div>'}
        </div>
      </div>

      <div class="bs-section">
        <div class="bs-section-title">CARDS DRAFTED (${r.cardsPicked.length})</div>
        <div class="bs-cards">
          ${cardRows || '<div class="bs-none">no cards drafted yet</div>'}
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn btn-primary" id="bs-close">CLOSE</button>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  (el.querySelector('#bs-close') as HTMLButtonElement).onclick = () => { audio.play('ui_click'); el.remove(); };
  return el;
}

// --------- Settings modal ---------
export function openSettingsModal(
  save: import('@/types').SaveData,
  onChange: () => void,
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'modal-overlay';
  const s = save.settings;
  const render = () => {
    el.innerHTML = `
      <div class="modal settings-modal">
        <div class="modal-title">&#9881; SETTINGS</div>
        <div class="settings-list">
          <label class="settings-row">
            <span class="settings-label">PIXEL MODE</span>
            <span class="settings-hint">Retro chunky-pixel aesthetic on all visuals.</span>
            <input type="checkbox" id="opt-pixel" ${s.pixelMode ? 'checked' : ''} />
            <span class="settings-toggle"></span>
          </label>
          <label class="settings-row settings-slider ${s.pixelMode ? '' : 'dim'}">
            <span class="settings-label">PIXEL SIZE <b id="opt-pixsize-val">${s.pixelFactor}&times;</b></span>
            <span class="settings-hint">Higher = chunkier pixels.</span>
            <input type="range" id="opt-pixsize" min="2" max="5" step="1" value="${s.pixelFactor}" ${s.pixelMode ? '' : 'disabled'} />
          </label>
          <label class="settings-row">
            <span class="settings-label">SFX</span>
            <span class="settings-hint">Procedural sound effects.</span>
            <input type="checkbox" id="opt-sfx" ${s.sfx ? 'checked' : ''} />
            <span class="settings-toggle"></span>
          </label>
          <label class="settings-row">
            <span class="settings-label">AMBIENT MUSIC</span>
            <span class="settings-hint">Background drone + pulse.</span>
            <input type="checkbox" id="opt-music" ${s.music ? 'checked' : ''} />
            <span class="settings-toggle"></span>
          </label>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" id="settings-close">DONE</button>
        </div>
      </div>
    `;
    wire();
  };
  const wire = () => {
    (el.querySelector('#opt-pixel') as HTMLInputElement).onchange = (e) => {
      s.pixelMode = (e.target as HTMLInputElement).checked;
      onChange();
      render();
    };
    const slider = el.querySelector('#opt-pixsize') as HTMLInputElement;
    slider.oninput = (e) => {
      s.pixelFactor = parseInt((e.target as HTMLInputElement).value, 10);
      (el.querySelector('#opt-pixsize-val') as HTMLElement).textContent = s.pixelFactor + '\u00d7';
      onChange();
    };
    (el.querySelector('#opt-sfx') as HTMLInputElement).onchange = (e) => {
      s.sfx = (e.target as HTMLInputElement).checked;
      audio.setEnabled(s.sfx);
      onChange();
    };
    (el.querySelector('#opt-music') as HTMLInputElement).onchange = (e) => {
      s.music = (e.target as HTMLInputElement).checked;
      audio.setMusicEnabled(s.music);
      onChange();
    };
    (el.querySelector('#settings-close') as HTMLButtonElement).onclick = () => { audio.play('ui_click'); el.remove(); };
  };
  render();
  document.body.appendChild(el);
  return el;
}

// --------- Pause menu ---------
export function openPauseMenu(
  onResume: () => void,
  onRestart: () => void,
  onExit: () => void,
  onSettings: () => void,
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'modal-overlay';
  el.innerHTML = `
    <div class="modal pause-modal">
      <div class="modal-title">&#9632; PAUSED</div>
      <div class="modal-actions vertical">
        <button class="btn btn-primary btn-lg" id="pm-resume">RESUME</button>
        <button class="btn" id="pm-restart">RESTART RUN</button>
        <button class="btn" id="pm-exit">MAIN MENU</button>
        <button class="btn btn-ghost" id="pm-settings">SETTINGS</button>
        <button class="btn btn-ghost" id="pm-how">HOW TO PLAY</button>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  (el.querySelector('#pm-resume') as HTMLButtonElement).onclick = () => { audio.play('ui_click'); close(); onResume(); };
  (el.querySelector('#pm-restart') as HTMLButtonElement).onclick = () => { if (confirm('Restart run and lose progress?')) { audio.play('ui_click'); close(); onRestart(); } };
  (el.querySelector('#pm-exit') as HTMLButtonElement).onclick = () => { if (confirm('Return to main menu and abandon run?')) { audio.play('ui_click'); close(); onExit(); } };
  (el.querySelector('#pm-settings') as HTMLButtonElement).onclick = () => { audio.play('ui_click'); onSettings(); };
  (el.querySelector('#pm-how') as HTMLButtonElement).onclick = () => { audio.play('ui_click'); alert('Place ICE towers on empty tiles to kill enemies before they reach the core.\n\n• Tap an empty tile to open tower palette\n• Tap a placed tower to upgrade or sell\n• Every wave end: pick 1 of 3 upgrade cards\n• Wave 1 is winnable with a single starter FIREWALL'); };

  function close() { el.remove(); }
  return el;
}

// --------- Card draft ---------
// Reroll: burns one of the limited reroll tokens (from meta-shop / starter). Skip: close
// the draft and take nothing (tension — harsh but fair since drafts are now level-up-based).

export function openCardDraft(
  s: RunState,
  onPick: (cardId: string) => void,
  onSkip: () => void,
  redraw: () => string[],
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'modal-overlay card-draft-overlay';
  document.body.appendChild(el);
  audio.play('card_reveal');

  const sourceLabel = s.draftSource === 'level' ? `LEVEL ${s.level}` : s.draftSource === 'wave' ? `WAVE ${s.wave} CLEAR` : 'STARTER';

  const render = () => {
    const canReroll = s.draftRerollsLeft > 0;
    const cardsHtml = s.draftOptions.map((id) => {
      const c = CARDS_BY_ID[id];
      if (!c) return '';
      // Surface branch commitment: if this card excludes other branches, list their
      // display names so the player sees what door closes when they pick it.
      let lockoutHtml = '';
      if (c.excludes && c.excludes.length > 0) {
        const names = c.excludes.map((xid) => CARDS_BY_ID[xid]?.name ?? xid).filter(Boolean);
        if (names.length) {
          lockoutHtml = `<div class="card-lockout">\u26A0 LOCKS OUT: ${names.join(' / ')}</div>`;
        }
      }
      return `<button class="card card-${c.rarity}" data-id="${id}">
        <div class="card-frame">
          <div class="card-rarity">${c.rarity.toUpperCase()}</div>
          <div class="card-name">${c.name}</div>
          <div class="card-sep"></div>
          <div class="card-desc">${c.description}</div>
          ${lockoutHtml}
          <div class="card-category">${c.category.toUpperCase()}</div>
        </div>
      </button>`;
    }).join('');
    el.innerHTML = `
      <div class="modal draft-modal">
        <div class="draft-title">INTRUSION DRAFT <span class="draft-wave">${sourceLabel}</span></div>
        <div class="draft-cards">${cardsHtml}</div>
        <div class="draft-actions">
          <button class="btn btn-primary" id="draft-reroll" ${canReroll ? '' : 'disabled'}>REROLL (${s.draftRerollsLeft} LEFT)</button>
          <button class="btn btn-ghost" id="draft-skip">SKIP</button>
        </div>
      </div>
    `;
    wire();
  };

  const wire = () => {
    el.querySelectorAll<HTMLButtonElement>('.card').forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.id!;
        const c = CARDS_BY_ID[id];
        if (c && c.rarity === 'legendary') audio.play('card_legendary');
        else audio.play('ui_click');
        el.remove();
        onPick(id);
      };
    });
    const rerollBtn = el.querySelector('#draft-reroll') as HTMLButtonElement;
    rerollBtn.onclick = () => {
      if (s.draftRerollsLeft <= 0) { audio.play('sell'); return; }
      s.draftRerollsLeft -= 1;
      s.draftOptions = redraw();
      audio.play('card_reveal');
      render();
    };
    (el.querySelector('#draft-skip') as HTMLButtonElement).onclick = () => {
      audio.play('ui_click');
      el.remove();
      onSkip();
    };
  };

  render();
  return el;
}

// --------- Game over ---------
export function openGameOver(
  s: RunState,
  isVictory: boolean,
  unlocks: { kind: 'tower' | 'card'; id: string; name: string; rarity?: string }[],
  onRetry: () => void,
  onExit: () => void,
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'modal-overlay';
  audio.play(isVictory ? 'victory' : 'gameover');
  const unlocksHtml = unlocks.length > 0 ? `
    <div class="go-unlocks">
      <div class="go-unlocks-title">&#9733; UNLOCKED</div>
      <div class="go-unlocks-list">
        ${unlocks.map((u) => {
          if (u.kind === 'tower') {
            return `<div class="go-unlock go-unlock-tower"><span class="go-unlock-tag">NEW TURRET</span><span class="go-unlock-name">${u.name}</span></div>`;
          }
          const rarityClass = u.rarity ? `go-unlock-${u.rarity}` : '';
          return `<div class="go-unlock go-unlock-card ${rarityClass}"><span class="go-unlock-tag">NEW CARD</span><span class="go-unlock-name">${u.name}</span></div>`;
        }).join('')}
      </div>
    </div>
  ` : '';
  el.innerHTML = `
    <div class="modal gameover-modal ${isVictory ? 'victory' : 'defeat'}">
      <div class="gameover-title">${isVictory ? '// BREACH CONTAINED' : '// SYSTEM COMPROMISED'}</div>
      <div class="gameover-sub">${isVictory ? 'All waves cleared.' : `Integrity failed at wave ${s.wave}.`}</div>
      <div class="gameover-stats">
        <div><span>Waves cleared</span><b>${s.wave}</b></div>
        <div><span>Towers placed</span><b>${s.towers.length}</b></div>
        <div><span>Integrity remaining</span><b>${s.hp}</b></div>
      </div>
      ${unlocksHtml}
      <div class="modal-actions">
        <button class="btn btn-primary" id="go-retry">RETRY</button>
        <button class="btn" id="go-exit">MAP SELECT</button>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  (el.querySelector('#go-retry') as HTMLButtonElement).onclick = () => { audio.play('ui_click'); el.remove(); onRetry(); };
  (el.querySelector('#go-exit') as HTMLButtonElement).onclick = () => { audio.play('ui_click'); el.remove(); onExit(); };
  return el;
}

// --------- Enemy intel ---------
export function openEnemyIntel(
  enemyId: EnemyId,
  onAck: () => void,
): HTMLElement {
  const def = ENEMIES[enemyId];
  const el = document.createElement('div');
  el.className = 'modal-overlay';
  el.innerHTML = `
    <div class="modal intel-modal">
      <div class="intel-head">&#9888; NEW INTRUSION DETECTED</div>
      <div class="intel-name">${def.name}</div>
      <div class="intel-threat threat-${def.threat.toLowerCase()}">${def.threat}</div>
      <div class="intel-portrait"></div>
      <div class="intel-stats">
        <div><span>HP</span><b>${def.hp}</b></div>
        <div><span>SPD</span><b>${def.speed}</b></div>
        <div><span>DMG</span><b>${def.damage}</b></div>
        <div><span>XP</span><b>${def.xp}</b></div>
      </div>
      <div class="intel-desc">${def.description}</div>
      <div class="intel-tip">COUNTER: ${def.counterTip}</div>
      <button class="btn btn-primary" id="intel-ack">ACKNOWLEDGED</button>
    </div>
  `;
  document.body.appendChild(el);
  (el.querySelector('#intel-ack') as HTMLButtonElement).onclick = () => { audio.play('ui_click'); el.remove(); onAck(); };
  return el;
}
