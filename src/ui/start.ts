import type { Screen } from './screens';
import type { SaveData } from '@/types';
import { audio } from '@/audio/sfx';
import {
  ensureDailyContract, ensureWeeklyContract, ensureMonthlyContract,
  DAILY_MUTATORS_BY_ID,
} from '@/data/contracts';
import { getMap, isSurvival, MAPS } from '@/data/maps';
import { TOWERS } from '@/data/towers';

// Challenge runs unlock once the player has either fully beaten the campaign
// (every non-survival map cleared on hard) OR unlocked every base turret.
// Either condition signals "endgame ready" which is when seeded rotating
// challenges become meaningful. Before then the player needs the core
// progression loop and doesn't benefit from mutator-laden dailies.
function challengesUnlocked(save: SaveData): boolean {
  const campaign = MAPS.filter((m) => !isSurvival(m.id));
  const allCampaignHardCleared = campaign.every((m) => !!save.completed[m.id]?.hard);
  const allTurretsUnlocked = (Object.keys(TOWERS) as Array<keyof typeof TOWERS>).every((id) => save.unlockedTowers.includes(id));
  return allCampaignHardCleared || allTurretsUnlocked;
}

export type ChallengeKind = 'daily' | 'weekly' | 'monthly';

export function startScreen(
  save: SaveData,
  onJackIn: () => void,
  onSettings: () => void,
  onShop: () => void,
  onDatabank: () => void,
  onHowToPlay: () => void,
  onChallenge: (kind: ChallengeKind) => void,
): Screen {
  return (root) => {
    const unlocked = challengesUnlocked(save);
    let challengeBlock = '';
    if (unlocked) {
      ensureDailyContract(save);
      ensureWeeklyContract(save);
      ensureMonthlyContract(save);
      const card = (kind: ChallengeKind, label: string, dc: NonNullable<SaveData['dailyContract']>) => {
        const dcMap = getMap(dc.mapId);
        const dcMut = DAILY_MUTATORS_BY_ID[dc.mutator];
        const dcBest = dc.bestWave > 0 ? `BEST WAVE ${dc.bestWave}${dc.completed ? ' &#9733;' : ''}` : 'NO ATTEMPTS YET';
        return `
          <div class="daily-contract-card">
            <div class="dc-head">
              <span class="dc-lbl">${label}</span>
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
            <button class="btn btn-ghost" data-challenge="${kind}">&#x25B6; ATTEMPT</button>
          </div>
        `;
      };
      challengeBlock = `
        ${card('daily',   "TODAY'S CONTRACT",   save.dailyContract!)}
        ${card('weekly',  "WEEKLY CHALLENGE",   save.weeklyContract!)}
        ${card('monthly', "MONTHLY CHALLENGE",  save.monthlyContract!)}
      `;
    }
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
        ${challengeBlock}
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
    root.querySelectorAll<HTMLButtonElement>('[data-challenge]').forEach((btn) => {
      btn.onclick = () => { audio.play('ui_click'); onChallenge(btn.dataset.challenge as ChallengeKind); };
    });
  };
}
