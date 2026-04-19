import type { SaveData, TowerId, EnemyId } from '@/types';
import { TOWERS } from '@/data/towers';
import { ENEMIES } from '@/data/enemies';
import { CARDS } from '@/data/cards';
import { ENEMY_PORT, TOWER_EXPLOITS } from '@/data/ports';
import { CHROMAS, CHROMAS_BY_ID } from '@/data/chromas';
import { mount, type Screen } from './screens';
import { audio } from '@/audio/sfx';

export function openDatabankScreen(save: SaveData, onBack: () => void): void {
  mount(databankScreen(save, onBack));
}

type Tab = 'arsenal' | 'cards' | 'intrusions';

function databankScreen(save: SaveData, onBack: () => void): Screen {
  return (root) => {
    let activeTab: Tab = 'arsenal';

    const render = () => {
      const allTowerIds = Object.keys(TOWERS) as TowerId[];
      const allEnemyIds = Object.keys(ENEMIES) as EnemyId[];

      const unlockedTowerSet = new Set(save.unlockedTowers);
      const seenEnemySet = new Set(save.seenEnemies);
      const unlockedCardSet = new Set(save.unlockedCards);

      const towerTotal = allTowerIds.length;
      const towerUnlocked = allTowerIds.filter((id) => unlockedTowerSet.has(id)).length;
      const enemyTotal = allEnemyIds.length;
      const enemySeen = allEnemyIds.filter((id) => seenEnemySet.has(id)).length;
      const cardTotal = CARDS.length;
      const cardUnlocked = CARDS.filter((c) => unlockedCardSet.has(c.id)).length;

      let body = '';

      if (activeTab === 'arsenal') {
        body += `<div class="db-summary">ARSENAL // <b>${towerUnlocked}</b> / ${towerTotal} TURRETS CATALOGUED</div>`;
        body += `<div class="db-grid">`;
        for (const id of allTowerIds) {
          const t = TOWERS[id];
          const unlocked = unlockedTowerSet.has(id);
          if (!unlocked) {
            body += `
              <div class="db-entry db-locked">
                <div class="db-entry-icon">???</div>
                <div class="db-entry-body">
                  <div class="db-entry-name">[ CLASSIFIED ]</div>
                  <div class="db-entry-desc">Unlock by clearing campaign maps.</div>
                </div>
              </div>
            `;
            continue;
          }
          const slowTxt = t.slow ? `<span>SLOW ${Math.round(t.slow.pct * 100)}% / ${t.slow.duration}s</span>` : '';
          const critTxt = t.crit ? `<span>CRIT ${Math.round(t.crit.chance * 100)}% &times;${t.crit.mult}</span>` : '';
          const aoeTxt = t.aoe ? `<span>AOE ${t.aoe.radius}</span>` : '';
          const chainTxt = t.chain ? `<span>CHAIN ${t.chain.jumps} jumps</span>` : '';
          const exploit = TOWER_EXPLOITS[id];
          const exploitTxt = exploit ? `<span class="db-port">EXPLOIT ${exploit}</span>` : '';
          body += `
            <div class="db-entry" style="--accent:${t.accentColor}">
              <div class="db-entry-icon" style="color:${t.accentColor}">&#9650;</div>
              <div class="db-entry-body">
                <div class="db-entry-name" style="color:${t.accentColor}">${t.name}</div>
                <div class="db-entry-desc">${t.description}</div>
                <div class="db-stats">
                  <span>DMG ${t.damage}</span>
                  <span>RNG ${t.range}</span>
                  <span>RATE ${t.fireRate.toFixed(2)}/s</span>
                  <span>TYPE ${t.damageType.toUpperCase()}</span>
                  ${slowTxt}${critTxt}${aoeTxt}${chainTxt}${exploitTxt}
                </div>
                ${t.special ? `<div class="db-special">&#9733; ${t.special}</div>` : ''}
                ${(() => {
                  const towerChromas = CHROMAS.filter((c) => c.tower === id);
                  if (towerChromas.length === 0) return '';
                  const equippedId = save.equippedChromas?.[id];
                  const chips = towerChromas.map((c) => {
                    const unlocked = save.unlockedChromas?.includes(c.id) ?? false;
                    const isEquipped = equippedId === c.id;
                    const cls = `db-chroma${unlocked ? '' : ' db-chroma-locked'}${isEquipped ? ' db-chroma-equipped' : ''}`;
                    return `<button class="${cls}" data-chroma="${c.id}" data-tower="${id}" style="--accent:${c.accent}" title="${c.unlockDescription}">${c.name}${isEquipped ? ' &check;' : unlocked ? '' : ' &#128274;'}</button>`;
                  }).join('');
                  return `<div class="db-chromas">CHROMAS ${chips}</div>`;
                })()}
              </div>
            </div>
          `;
        }
        body += `</div>`;
      }

      if (activeTab === 'intrusions') {
        body += `<div class="db-summary">INTRUSIONS // <b>${enemySeen}</b> / ${enemyTotal} HOSTILES IDENTIFIED</div>`;
        body += `<div class="db-grid">`;
        for (const id of allEnemyIds) {
          const e = ENEMIES[id];
          const seen = seenEnemySet.has(id);
          if (!seen) {
            body += `
              <div class="db-entry db-locked">
                <div class="db-entry-icon">???</div>
                <div class="db-entry-body">
                  <div class="db-entry-name">[ UNKNOWN SIGNATURE ]</div>
                  <div class="db-entry-desc">Encounter this hostile in a run to catalogue it.</div>
                </div>
              </div>
            `;
            continue;
          }
          const dmgTypes: Array<'kinetic' | 'pierce' | 'energy' | 'aoe' | 'chain'> = ['kinetic', 'pierce', 'energy', 'aoe', 'chain'];
          const matchupRow = dmgTypes.map((k) => {
            const n = (e.resistances?.[k] ?? 1) as number;
            let label: string;
            let cls: string;
            if (n === 0) { label = 'IMMUNE'; cls = 'mu-immune'; }
            else if (n < 0.7) { label = `${Math.round(n * 100)}%`; cls = 'mu-strong'; }
            else if (n < 1) { label = `${Math.round(n * 100)}%`; cls = 'mu-resist'; }
            else if (n > 1.2) { label = `${Math.round(n * 100)}%`; cls = 'mu-weak-strong'; }
            else if (n > 1) { label = `${Math.round(n * 100)}%`; cls = 'mu-weak'; }
            else { label = '100%'; cls = 'mu-normal'; }
            return `<span class="db-mu ${cls}"><b>${k.toUpperCase()}</b>${label}</span>`;
          }).join('');
          const critBypass = e.critIgnoresResist ? `<span class="db-mu mu-note">CRITS BYPASS RESIST</span>` : '';
          const resList = `${matchupRow}${critBypass}`;
          const flags: string[] = [];
          if (e.slowImmune) flags.push('SLOW-IMMUNE');
          if (e.invisChance) flags.push(`STEALTH ${Math.round(e.invisChance * 100)}%`);
          if (e.bossScale) flags.push('BOSS-SCALED');
          const openPort = ENEMY_PORT[id];
          const portTxt = openPort ? `<span class="db-port">PORT ${openPort} OPEN</span>` : '';
          body += `
            <div class="db-entry" style="--accent:${e.color}">
              <div class="db-entry-icon" style="color:${e.color}">&#9830;</div>
              <div class="db-entry-body">
                <div class="db-entry-head">
                  <div class="db-entry-name" style="color:${e.color}">${e.name}</div>
                  <div class="db-threat threat-${e.threat.toLowerCase()}">${e.threat}</div>
                </div>
                <div class="db-entry-desc">${e.description}</div>
                <div class="db-stats">
                  <span>HP ${e.hp}</span>
                  <span>SPD ${e.speed}</span>
                  <span>DMG ${e.damage}</span>
                  <span>XP ${e.xp}</span>
                  ${e.armor ? `<span>ARMOR ${e.armor}</span>` : ''}
                  ${flags.map((f) => `<span>${f}</span>`).join('')}
                  ${portTxt}
                </div>
                ${resList ? `<div class="db-resists">${resList}</div>` : ''}
                <div class="db-tip">COUNTER: ${e.counterTip}</div>
              </div>
            </div>
          `;
        }
        body += `</div>`;
      }

      if (activeTab === 'cards') {
        body += `<div class="db-summary">CARDS // <b>${cardUnlocked}</b> / ${cardTotal} PROTOCOLS AVAILABLE</div>`;
        // Group by category, sorted
        const byCategory: Record<string, typeof CARDS> = { deploy: [], upgrade: [], heal: [], exotic: [] } as any;
        for (const c of CARDS) (byCategory[c.category] ??= []).push(c);
        const catLabels: Record<string, string> = {
          deploy: 'DEPLOY',
          upgrade: 'UPGRADES & SYNERGIES',
          heal: 'INTEGRITY',
          exotic: 'EXOTIC',
          buff: 'BUFFS',
        };
        const order: Array<'deploy' | 'upgrade' | 'heal' | 'exotic'> = ['deploy', 'upgrade', 'heal', 'exotic'];
        for (const cat of order) {
          const list = byCategory[cat] ?? [];
          if (list.length === 0) continue;
          const catUnlocked = list.filter((c) => unlockedCardSet.has(c.id)).length;
          body += `<div class="db-section-head"><div class="db-section-title">${catLabels[cat] ?? cat.toUpperCase()}</div><div class="db-section-count">${catUnlocked} / ${list.length}</div></div>`;
          body += `<div class="db-cards">`;
          for (const c of list) {
            const unlocked = unlockedCardSet.has(c.id);
            const cls = `db-card db-rarity-${c.rarity} ${unlocked ? '' : 'db-locked'}`;
            const reqTxt = c.requires && c.requires.length > 0 ? `<div class="db-card-req">REQUIRES: ${c.requires.join(', ')}</div>` : '';
            body += `
              <div class="${cls}">
                <div class="db-card-head">
                  <div class="db-card-name">${unlocked ? c.name : '[ LOCKED ]'}</div>
                  <div class="db-card-rarity">${c.rarity[0].toUpperCase()}</div>
                </div>
                <div class="db-card-desc">${unlocked ? c.description : 'Acquire via map rewards or tower unlocks.'}</div>
                ${unlocked ? reqTxt : ''}
              </div>
            `;
          }
          body += `</div>`;
        }
      }

      const html = `
        <div class="screen screen-scroll databank-screen">
          <header class="topbar">
            <button class="btn btn-ghost" id="db-back">&larr; BACK</button>
            <div class="topbar-title">&#9674; DATABANK.db</div>
            <div class="db-count"><span>ENTRIES</span><b>${towerUnlocked + enemySeen + cardUnlocked}</b></div>
          </header>
          <div class="shop-tabs">
            <button class="shop-tab${activeTab === 'arsenal' ? ' active' : ''}" data-tab="arsenal">ARSENAL <small>${towerUnlocked}/${towerTotal}</small></button>
            <button class="shop-tab${activeTab === 'intrusions' ? ' active' : ''}" data-tab="intrusions">INTRUSIONS <small>${enemySeen}/${enemyTotal}</small></button>
            <button class="shop-tab${activeTab === 'cards' ? ' active' : ''}" data-tab="cards">CARDS <small>${cardUnlocked}/${cardTotal}</small></button>
          </div>
          ${body}
        </div>
      `;
      root.innerHTML = html;

      (root.querySelector('#db-back') as HTMLButtonElement).onclick = () => { audio.play('ui_click'); onBack(); };
      root.querySelectorAll<HTMLButtonElement>('.shop-tab').forEach((btn) => {
        btn.onclick = () => {
          activeTab = btn.dataset.tab as Tab;
          audio.play('ui_hover');
          render();
        };
      });
      root.querySelectorAll<HTMLButtonElement>('.db-chroma').forEach((btn) => {
        btn.onclick = () => {
          if (btn.classList.contains('db-chroma-locked')) { audio.play('sell'); return; }
          const chromaId = btn.dataset.chroma!;
          const tower = btn.dataset.tower! as TowerId;
          if (!save.equippedChromas) save.equippedChromas = {};
          const equipped = save.equippedChromas;
          // Click-equipped → unequip; click-unequipped → equip.
          if (equipped[tower] === chromaId) { delete equipped[tower]; }
          else { equipped[tower] = CHROMAS_BY_ID[chromaId].id; }
          audio.play('ui_click');
          render();
        };
      });
    };

    render();
  };
}
