import type { Screen } from './screens';
import type { Difficulty, EnemyId, MapDef, SaveData } from '@/types';
import { MAPS, isSurvival } from '@/data/maps';
import { ENEMIES } from '@/data/enemies';
import { TOWERS } from '@/data/towers';
import { RUNNERS, RUNNER_IDS, type RunnerId } from '@/data/runners';
import { audio } from '@/audio/sfx';

const THREAT_COLOR: Record<string, string> = {
  LOW: '#00ff88', MEDIUM: '#ffd600', HIGH: '#ff9900',
  EXTREME: '#ff3355', BOSS: '#ff2d95', MEGA: '#b847ff', FINAL: '#ffffff',
};

const SECTOR_INFO: Record<number, { name: string; modifier: string }> = {
  1: { name: 'SYSTEM BOOT',         modifier: '' },
  2: { name: 'PACKET STORM',        modifier: 'LAG SPIKE' },
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
    // BRUTAL MODE toggle — unlocks once the player has cleared every act
    // on hard (all 7 sectorClears). Adds +100% enemy HP, +25% speed, 2
    // extra random turret locks (AOE/chain guaranteed), draft floor 2,
    // all sector modifiers at 60% strength. Clears reward +50% protocols.
    const brutalUnlocked = [1,2,3,4,5,6,7].every((n) => save.sectorClears?.[n]);
    const brutalOn = !!save.brutalMode;
    const brutalBar = brutalUnlocked ? `
      <div class="brutal-bar ${brutalOn ? 'brutal-on' : ''}">
        <div class="brutal-head">
          <span class="brutal-lbl">BRUTAL MODE</span>
          <button class="btn btn-ghost btn-sm" id="brutal-toggle">${brutalOn ? 'ENABLED &check;' : 'DISABLED'}</button>
        </div>
        <div class="brutal-desc">+100% enemy HP &middot; +25% speed &middot; +2 turret locks &middot; all sector modifiers at 60% &middot; +50% protocols on clear</div>
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
      ${brutalBar}
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
    const brutalBtn = root.querySelector('#brutal-toggle') as HTMLButtonElement | null;
    if (brutalBtn) brutalBtn.onclick = () => { audio.play('ui_click'); save.brutalMode = !save.brutalMode; rerender(); };

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

    // Zone-based difficulty unlocks: clear every map in a sector on EASY to
    // unlock MEDIUM for that whole sector; clear every map on MEDIUM to unlock
    // HARD. Replaces the old per-map sequential gating. Computed once up-front
    // so every map row reads the same flag.
    const sectorMediumUnlocked: Record<number, boolean> = {};
    const sectorHardUnlocked: Record<number, boolean> = {};
    for (const [sectorNum, sectorMaps] of sectors) {
      sectorMediumUnlocked[sectorNum] = sectorMaps.every((mm) => save.completed[mm.id]?.easy);
      sectorHardUnlocked[sectorNum] = sectorMaps.every((mm) => save.completed[mm.id]?.medium);
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
            // Zone-based gating: medium unlocks when every map in the sector is
            // easy-cleared; hard unlocks when every map in the sector is medium-
            // cleared. Survival skips all gates.
            const sec = m.sector;
            let locked = !unlocked;
            if (!locked && !survival && sec !== undefined) {
              if (d === 'medium' && !sectorMediumUnlocked[sec]) locked = true;
              if (d === 'hard' && !sectorHardUnlocked[sec]) locked = true;
            }
            const waveLabel = survival ? '\u221e WAVES' : m.difficulties[d as Difficulty].waves + ' WAVES';
            return `<button class="diff-btn diff-${d}${locked ? ' locked' : ''}${done ? ' done' : ''}" data-map="${m.id}" data-diff="${d}" ${locked ? 'disabled' : ''}>
              <div class="diff-label">${d.toUpperCase()}</div>
              <div class="diff-waves">${waveLabel}</div>
              ${done ? '<div class="diff-done">&#10003;</div>' : ''}
              ${locked ? '<div class="diff-lock">&#128274;</div>' : ''}
            </button>`;
          }).join('')}
        </div>
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
  }
}
