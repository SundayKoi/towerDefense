import type { Screen } from './screens';
import type { Difficulty, EnemyId, MapDef, SaveData } from '@/types';
import { MAPS, isSurvival } from '@/data/maps';
import { ENEMIES } from '@/data/enemies';
import { TOWERS } from '@/data/towers';
import { RUNNERS, RUNNER_IDS, type RunnerId } from '@/data/runners';
import { ASCENSION_MAX, ASCENSION_DESCRIPTIONS } from '@/data/ascension';
import { audio } from '@/audio/sfx';

const THREAT_COLOR: Record<string, string> = {
  LOW: '#00ff88', MEDIUM: '#ffd600', HIGH: '#ff9900',
  EXTREME: '#ff3355', BOSS: '#ff2d95', MEGA: '#b847ff', FINAL: '#ffffff',
};

const SECTOR_INFO: Record<number, { name: string; modifier: string }> = {
  1: { name: 'SYSTEM BOOT',         modifier: '' },
  2: { name: 'PACKET STORM',        modifier: 'PACKET BURSTS' },
  3: { name: 'ENCRYPTED CORE',      modifier: 'ENCRYPTED PAYLOADS' },
  4: { name: 'STEALTH NET',         modifier: 'STEALTH PROTOCOL' },
  5: { name: 'VOID SWARM',          modifier: 'REPLICATION VIRUS' },
  6: { name: 'APEX RUIN',           modifier: 'ROOTKIT INTRUSION' },
  7: { name: 'OMEGA PROTOCOL',      modifier: 'FUSION — ALL MODIFIERS' },
};

function enemyChip(id: EnemyId): string {
  const def = ENEMIES[id];
  const col = THREAT_COLOR[def.threat] ?? '#aaa';
  return `<span class="enemy-chip" style="border-color:${col};color:${col}" title="${def.description} | COUNTER: ${def.counterTip}">${def.name}</span>`;
}

export function mapSelectScreen(save: SaveData, onPlay: (mapId: string, difficulty: Difficulty) => void, onBack: () => void): Screen {
  return (root) => {
    const rerender = () => renderMapSelect(root, save, onPlay, onBack, rerender);
    rerender();
  };
}

function renderMapSelect(root: HTMLElement, save: SaveData, onPlay: (mapId: string, difficulty: Difficulty) => void, onBack: () => void, rerender: () => void): void {
  {
    root.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'screen screen-scroll';
    const selectedRunner: RunnerId = save.selectedRunner ?? 'glitch';
    const runnerCards = RUNNER_IDS.map((id) => {
      const r = RUNNERS[id];
      const active = id === selectedRunner;
      const bannedName = TOWERS[r.bannedTower]?.name ?? r.bannedTower.toUpperCase();
      const buffBits: string[] = [];
      if (r.passiveDamagePct) buffBits.push(`+${Math.round(r.passiveDamagePct * 100)}% DMG`);
      if (r.passiveRatePct) buffBits.push(`+${Math.round(r.passiveRatePct * 100)}% RATE`);
      if (r.passiveCritPct) buffBits.push(`+${Math.round(r.passiveCritPct * 100)}% CRIT`);
      if (r.bonusStartingHp) buffBits.push(`+${r.bonusStartingHp} HP`);
      if (r.bonusHpRegenPerWave) buffBits.push(`+${r.bonusHpRegenPerWave} HP/WAVE`);
      if (r.bonusStartingLevels) buffBits.push(`+${r.bonusStartingLevels} LEVEL`);
      return `
        <button class="runner-card${active ? ' runner-active' : ''}" data-runner="${id}" style="--accent:${r.color}">
          <div class="runner-name">${r.name}</div>
          <div class="runner-role">${r.role}</div>
          <div class="runner-flavor">${r.flavor}</div>
          <div class="runner-stats">${buffBits.join(' &middot; ')}</div>
          <div class="runner-ban">BANS: ${bannedName}</div>
        </button>
      `;
    }).join('');
    const ascMax = save.ascensionMax ?? 0;
    const ascLevel = Math.max(0, Math.min(ascMax, save.ascensionLevel ?? 0));
    const ascMods = ascLevel > 0 ? ASCENSION_DESCRIPTIONS[ascLevel].join(' &middot; ') : 'None — clear any HARD map to unlock ICE DEPTH 1.';
    const ascBar = ascMax > 0 ? `
      <div class="asc-bar">
        <div class="asc-head">
          <span class="asc-lbl">ICE DEPTH</span>
          <span class="asc-value">${ascLevel}<span class="asc-cap">/${Math.min(ascMax, ASCENSION_MAX)}</span></span>
        </div>
        <div class="asc-mods">${ascMods}</div>
        <div class="asc-controls">
          <button class="btn btn-ghost btn-sm" id="asc-down" ${ascLevel <= 0 ? 'disabled' : ''}>&minus;</button>
          <button class="btn btn-ghost btn-sm" id="asc-up" ${ascLevel >= ascMax ? 'disabled' : ''}>+</button>
        </div>
      </div>
    ` : '';
    wrap.innerHTML = `
      <header class="topbar">
        <button class="btn btn-ghost" id="back-btn">&larr; BACK</button>
        <div class="topbar-title">SELECT INTRUSION</div>
        <div style="width:80px"></div>
      </header>
      <div class="runner-bar">
        <div class="runner-bar-head">RUNNER</div>
        <div class="runner-bar-grid">${runnerCards}</div>
      </div>
      ${ascBar}
      <div class="map-list" id="map-list"></div>
    `;
    root.appendChild(wrap);
    (root.querySelector('#back-btn') as HTMLButtonElement).onclick = () => { audio.play('ui_click'); onBack(); };
    root.querySelectorAll<HTMLButtonElement>('.runner-card').forEach((card) => {
      card.onclick = () => {
        audio.play('ui_click');
        save.selectedRunner = card.dataset.runner as RunnerId;
        rerender();
      };
    });
    const ascUp = root.querySelector('#asc-up') as HTMLButtonElement | null;
    const ascDn = root.querySelector('#asc-down') as HTMLButtonElement | null;
    if (ascUp) ascUp.onclick = () => { audio.play('ui_click'); save.ascensionLevel = Math.min(save.ascensionMax ?? 0, (save.ascensionLevel ?? 0) + 1); rerender(); };
    if (ascDn) ascDn.onclick = () => { audio.play('ui_click'); save.ascensionLevel = Math.max(0, (save.ascensionLevel ?? 0) - 1); rerender(); };

    const list = root.querySelector('#map-list') as HTMLElement;

    // Campaign maps in order — used for sequential unlock chain.
    const campaign = MAPS.filter((m) => !isSurvival(m.id)).slice().sort((a, b) => a.order - b.order);
    const unlockStatus: Record<string, boolean> = {};
    for (let i = 0; i < campaign.length; i++) {
      if (i === 0) { unlockStatus[campaign[i].id] = true; continue; }
      const prev = campaign[i - 1];
      unlockStatus[campaign[i].id] = !!save.completed[prev.id]?.easy;
    }
    // SURVIVAL.EXE is the post-campaign endless mode. Gate it behind earning
    // your first prestige star so it functions as an endgame unlock rather
    // than a distraction from the campaign.
    unlockStatus['survival'] = (save.prestigeStars ?? 0) >= 1;

    // Group by sector. Maps without a sector (survival) go to the end.
    const sectors = new Map<number, MapDef[]>();
    const noSector: MapDef[] = [];
    for (const m of campaign) {
      if (m.sector === undefined) {
        noSector.push(m);
      } else {
        if (!sectors.has(m.sector)) sectors.set(m.sector, []);
        sectors.get(m.sector)!.push(m);
      }
    }

    const renderMapRow = (m: MapDef) => {
      const unlocked = unlockStatus[m.id];
      const survival = isSurvival(m.id);
      const compl = save.completed[m.id] ?? {};

      const allEnemies = [...new Set([...m.enemyPool.phase1, ...m.enemyPool.phase2, ...m.enemyPool.phase3])] as EnemyId[];
      const allBossIds = [...new Set(Object.values(m.bosses).flatMap((bMap) => Object.values(bMap)))] as EnemyId[];

      const row = document.createElement('div');
      row.className = 'map-row' + (unlocked ? '' : ' locked') + (survival ? ' survival-row' : '');
      const orderLabel = survival ? '\u221e' : String(m.order).padStart(2, '0');

      row.innerHTML = `
        <div class="map-row-header" style="--accent:${m.accentColor};--secondary:${m.secondaryColor}">
          <div class="map-num">${orderLabel}</div>
          <div class="map-title">
            <div class="map-name">${m.name}</div>
            <div class="map-fullname">${m.fullName}</div>
          </div>
          <div class="map-paths">${m.paths.length} PATH${m.paths.length > 1 ? 'S' : ''}</div>
        </div>
        ${unlocked ? `
        <div class="map-enemy-roster">
          <div class="roster-section">
            <span class="roster-label">ENEMIES</span>
            ${allEnemies.map((id) => enemyChip(id)).join('')}
          </div>
          <div class="roster-section">
            <span class="roster-label" style="color:#ff2d95">BOSSES</span>
            ${allBossIds.map((id) => enemyChip(id)).join('')}
          </div>
        </div>` : ''}
        <div class="diff-row">
          ${['easy','medium','hard'].map((d) => {
            const done = (compl as any)[d];
            const locked = !unlocked || (!survival && d !== 'easy' && !(compl as any)[prevDiff(d as Difficulty)]);
            const waveLabel = survival ? '\u221e WAVES' : m.difficulties[d as Difficulty].waves + ' WAVES';
            return `<button class="diff-btn diff-${d}${locked ? ' locked' : ''}${done ? ' done' : ''}" data-map="${m.id}" data-diff="${d}" ${locked ? 'disabled' : ''}>
              <div class="diff-label">${d.toUpperCase()}</div>
              <div class="diff-waves">${waveLabel}</div>
              ${done ? '<div class="diff-done">&#10003;</div>' : ''}
              ${locked ? '<div class="diff-lock">&#128274;</div>' : ''}
            </button>`;
          }).join('')}
        </div>
        ${(() => {
          const ng = save.mapNgPlus?.[m.id];
          if (!ng || ng.max === 0) return '';
          const cur = Math.min(ng.current, ng.max);
          const hpPct = Math.round((1 + 0.5 * cur - 1) * 100);
          const rewardPct = Math.round(0.25 * cur * 100);
          return `
            <div class="ng-row" data-map="${m.id}">
              <span class="ng-lbl">NG+</span>
              <button class="ng-step" data-act="down" data-map="${m.id}" ${cur <= 0 ? 'disabled' : ''}>&minus;</button>
              <span class="ng-value">${cur}<span class="ng-max">/${ng.max}</span></span>
              <button class="ng-step" data-act="up" data-map="${m.id}" ${cur >= ng.max ? 'disabled' : ''}>+</button>
              <span class="ng-desc">${cur === 0 ? 'Standard run' : `+${hpPct}% enemy HP &middot; +${rewardPct}% protocols`}</span>
            </div>
          `;
        })()}
      `;
      list.appendChild(row);
    };

    const sortedSectors = [...sectors.keys()].sort((a, b) => a - b);
    for (const sectorNum of sortedSectors) {
      const info = SECTOR_INFO[sectorNum] ?? { name: `SECTOR ${sectorNum}`, modifier: '' };
      const cleared = !!save.sectorClears[sectorNum];
      const header = document.createElement('div');
      header.className = `sector-header sector-${sectorNum}`;
      header.innerHTML = `
        <span class="sector-num">SECTOR ${sectorNum}</span>
        <span class="sector-name">${info.name}</span>
        <span class="sector-modifier">${info.modifier}</span>
        ${cleared ? '<span class="sector-star">&#9733;</span>' : ''}
      `;
      list.appendChild(header);
      const maps = sectors.get(sectorNum)!.slice().sort((a, b) => a.order - b.order);
      for (const m of maps) renderMapRow(m);
    }

    // Maps not assigned to a sector (survival) render at the bottom without a header.
    for (const m of noSector) renderMapRow(m);

    list.querySelectorAll<HTMLButtonElement>('.diff-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const map = btn.dataset.map!;
        const diff = btn.dataset.diff as Difficulty;
        audio.play('ui_click');
        onPlay(map, diff);
      });
      btn.addEventListener('mouseenter', () => audio.play('ui_hover'));
    });
    list.querySelectorAll<HTMLButtonElement>('.ng-step').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mapId = btn.dataset.map!;
        const dir = btn.dataset.act === 'up' ? 1 : -1;
        if (!save.mapNgPlus) save.mapNgPlus = {};
        const entry = save.mapNgPlus[mapId] ?? { current: 0, max: 0 };
        entry.current = Math.max(0, Math.min(entry.max, entry.current + dir));
        save.mapNgPlus[mapId] = entry;
        audio.play('ui_click');
        rerender();
      });
    });
  }
}

function prevDiff(d: Difficulty): Difficulty {
  if (d === 'medium') return 'easy';
  return 'medium';
}
