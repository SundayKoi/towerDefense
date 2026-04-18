import type { Screen } from './screens';
import { audio } from '@/audio/sfx';

export function startScreen(onJackIn: () => void, onSettings: () => void, onShop: () => void, onDatabank: () => void, onHowToPlay: () => void): Screen {
  return (root) => {
    root.innerHTML = `
      <div class="screen screen-center">
        <div class="start-logo">
          <div class="logo-row">
            <span class="logo-primary">NETRUNNER</span>
          </div>
          <div class="logo-sub">// INTRUSION DEFENSE</div>
          <div class="logo-line"></div>
          <div class="logo-flavor">A cyberpunk roguelike tower defense</div>
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
    j.onclick = () => { audio.play('ui_click'); onJackIn(); };
    s.onclick = () => { audio.play('ui_click'); onSettings(); };
    sh.onclick = () => { audio.play('ui_click'); onShop(); };
    db.onclick = () => { audio.play('ui_click'); onDatabank(); };
    ht.onclick = () => { audio.play('ui_click'); onHowToPlay(); };
  };
}
