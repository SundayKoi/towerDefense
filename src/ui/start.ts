import type { Screen } from './screens';
import type { SaveData } from '@/types';
import { audio } from '@/audio/sfx';
import { ensureDailyContract, DAILY_MUTATORS_BY_ID } from '@/data/contracts';
import { getMap } from '@/data/maps';

export function startScreen(save: SaveData, onJackIn: () => void, onSettings: () => void, onShop: () => void, onDatabank: () => void, onHowToPlay: () => void, onDailyContract: () => void): Screen {
  return (root) => {
    const stars = save.prestigeStars ?? 0;
    const prestigeMarkup = stars > 0 ? `&#9733; \u00D7 ${stars}` : '';
    ensureDailyContract(save);
    const dc = save.dailyContract!;
    const dcMap = getMap(dc.mapId);
    const dcMut = DAILY_MUTATORS_BY_ID[dc.mutator];
    const dcBest = dc.bestWave > 0 ? `BEST WAVE ${dc.bestWave}${dc.completed ? ' &#9733;' : ''}` : 'NO ATTEMPTS YET';
    root.innerHTML = `
      <div class="screen screen-center">
        <div class="start-logo">
          <div class="logo-row">
            <span class="logo-primary">NETRUNNER</span>
          </div>
          <div class="logo-sub">// INTRUSION DEFENSE</div>
          <div class="logo-line"></div>
          <div class="logo-flavor">A cyberpunk roguelike tower defense</div>
          <div class="prestige-row" id="prestige-row"${stars === 0 ? ' style="display:none"' : ''}>${prestigeMarkup}</div>
        </div>
        <div class="daily-contract-card" id="daily-contract">
          <div class="dc-head">
            <span class="dc-lbl">TODAY'S CONTRACT</span>
            <span class="dc-period">${dc.period}</span>
          </div>
          <div class="dc-mission">
            <span class="dc-map" style="color:${dcMap.accentColor}">${dcMap.name}</span>
            <span class="dc-diff dc-diff-${dc.difficulty}">${dc.difficulty.toUpperCase()}</span>
          </div>
          <div class="dc-mutator">
            <span class="dc-mut-name">${dcMut?.name ?? dc.mutator}</span>
            <span class="dc-mut-flavor">${dcMut?.flavor ?? ''}</span>
          </div>
          <div class="dc-best">${dcBest}</div>
          <button class="btn btn-ghost" id="btn-daily-run">&#x25B6; ATTEMPT</button>
        </div>
        <div class="start-buttons">
          <button class="btn btn-primary btn-lg" id="btn-jack-in">
            <span class="glitch" data-text="JACK IN">JACK IN</span>
          </button>
          <button class="btn btn-ghost" id="btn-howto">? HOW TO PLAY</button>
          <button class="btn btn-ghost" id="btn-shop">&#x25B3; UPGRADE TERMINAL</button>
          <button class="btn btn-ghost" id="btn-databank">&#9674; DATABANK.db</button>
          <button class="btn btn-ghost" id="btn-settings">&#9881; SETTINGS</button>
        </div>
        <div class="build-tag">v0.1 // Opus</div>
      </div>
    `;
    const j = root.querySelector('#btn-jack-in') as HTMLButtonElement;
    const s = root.querySelector('#btn-settings') as HTMLButtonElement;
    const sh = root.querySelector('#btn-shop') as HTMLButtonElement;
    const db = root.querySelector('#btn-databank') as HTMLButtonElement;
    const ht = root.querySelector('#btn-howto') as HTMLButtonElement;
    const dcBtn = root.querySelector('#btn-daily-run') as HTMLButtonElement;
    j.onclick = () => { audio.play('ui_click'); onJackIn(); };
    s.onclick = () => { audio.play('ui_click'); onSettings(); };
    sh.onclick = () => { audio.play('ui_click'); onShop(); };
    db.onclick = () => { audio.play('ui_click'); onDatabank(); };
    ht.onclick = () => { audio.play('ui_click'); onHowToPlay(); };
    dcBtn.onclick = () => { audio.play('ui_click'); onDailyContract(); };
  };
}
