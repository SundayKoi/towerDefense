import type { Screen } from './screens';
import type { Difficulty, SaveData } from '@/types';
import { MAPS, isSurvival } from '@/data/maps';
import { audio } from '@/audio/sfx';

export function mapSelectScreen(save: SaveData, onPlay: (mapId: string, difficulty: Difficulty) => void, onBack: () => void): Screen {
  return (root) => {
    root.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'screen screen-scroll';
    wrap.innerHTML = `
      <header class="topbar">
        <button class="btn btn-ghost" id="back-btn">&larr; BACK</button>
        <div class="topbar-title">SELECT INTRUSION</div>
        <div style="width:80px"></div>
      </header>
      <div class="map-list" id="map-list"></div>
    `;
    root.appendChild(wrap);
    (root.querySelector('#back-btn') as HTMLButtonElement).onclick = () => { audio.play('ui_click'); onBack(); };

    const list = root.querySelector('#map-list') as HTMLElement;

    // Unlock rules:
    // - Campaign map N unlocked if map N-1 easy completed. Map 1 always unlocked.
    // - Survival unlocked after clearing mainframe easy.
    const unlockStatus: Record<string, boolean> = {};
    const campaign = MAPS.filter((m) => !isSurvival(m.id));
    for (let i = 0; i < campaign.length; i++) {
      if (i === 0) { unlockStatus[campaign[i].id] = true; continue; }
      const prev = campaign[i - 1];
      unlockStatus[campaign[i].id] = !!save.completed[prev.id]?.easy;
    }
    unlockStatus['survival'] = !!save.completed['mainframe']?.easy;

    for (const m of MAPS) {
      const unlocked = unlockStatus[m.id];
      const survival = isSurvival(m.id);
      const compl = save.completed[m.id] ?? {};
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
      `;
      list.appendChild(row);
    }

    list.querySelectorAll<HTMLButtonElement>('.diff-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const map = btn.dataset.map!;
        const diff = btn.dataset.diff as Difficulty;
        audio.play('ui_click');
        onPlay(map, diff);
      });
      btn.addEventListener('mouseenter', () => audio.play('ui_hover'));
    });
  };
}

function prevDiff(d: Difficulty): Difficulty {
  if (d === 'medium') return 'easy';
  return 'medium';
}
