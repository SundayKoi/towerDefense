import type { SaveData } from '@/types';
import { SHOP_UPGRADES, shopCost, recomputeMetaBoosts } from '@/data/shop';
import { QUESTS, QUEST_CATEGORY_LABELS } from '@/data/quests';
import { mount, type Screen } from './screens';
import { audio } from '@/audio/sfx';

export function openShopScreen(save: SaveData, persist: () => void, onBack: () => void): void {
  mount(shopScreen(save, persist, onBack));
}

type Tab = 'upgrades' | 'contracts';

function shopScreen(save: SaveData, persist: () => void, onBack: () => void): Screen {
  return (root) => {
    let activeTab: Tab = 'upgrades';

    const render = () => {
      const catLabels: Record<string, string> = {
        power: 'COMBAT',
        loadout: 'LOADOUT',
        economy: 'ECONOMY',
        utility: 'UTILITY',
      };

      let html = `
        <div class="screen screen-scroll shop-screen">
          <header class="topbar">
            <button class="btn btn-ghost" id="back-btn">&larr; BACK</button>
            <div class="topbar-title">UPGRADE TERMINAL</div>
            <div class="shop-protocols"><span>◇ PROTOCOLS</span><b>${save.protocols}</b></div>
          </header>
          <div class="shop-tabs">
            <button class="shop-tab${activeTab === 'upgrades' ? ' active' : ''}" data-tab="upgrades">UPGRADES</button>
            <button class="shop-tab${activeTab === 'contracts' ? ' active' : ''}" data-tab="contracts">CONTRACTS</button>
          </div>
      `;

      if (activeTab === 'upgrades') {
        html += `<div class="shop-intro">Spend PROTOCOLS on permanent upgrades. All benefits apply to every future run.</div>`;
        const catOrder = ['power', 'loadout', 'economy', 'utility'];
        for (const cat of catOrder) {
          const items = SHOP_UPGRADES.filter((u) => u.category === cat);
          if (items.length === 0) continue;
          html += `<div class="shop-section-title">${catLabels[cat]}</div><div class="shop-grid">`;
          for (const u of items) {
            const stacks = save.shopPurchased[u.id] ?? 0;
            const maxed = stacks >= u.maxStacks;
            const nextCost = maxed ? 0 : shopCost(u, stacks + 1);
            const afford = !maxed && save.protocols >= nextCost;
            html += `
              <div class="shop-item ${maxed ? 'maxed' : ''} ${afford ? '' : 'locked'}" data-id="${u.id}">
                <div class="shop-icon">${u.icon}</div>
                <div class="shop-body">
                  <div class="shop-name">${u.name}</div>
                  <div class="shop-desc">${u.description}</div>
                  <div class="shop-stacks">
                    ${maxed
                      ? '<span class="shop-maxed">MAXED OUT</span>'
                      : `<span class="shop-cost">${nextCost}◇</span>
                         <span class="shop-stack-info">${stacks} / ${u.maxStacks}</span>`}
                  </div>
                </div>
                ${maxed ? '' : `<button class="btn btn-primary shop-buy" data-id="${u.id}" ${afford ? '' : 'disabled'}>BUY</button>`}
              </div>
            `;
          }
          html += `</div>`;
        }
      } else {
        // Contracts tab
        html += `<div class="shop-intro">Complete objectives to earn Protocols. Each contract can only be claimed once.</div>`;
        const questCats: Array<'progression' | 'combat' | 'mastery'> = ['progression', 'combat', 'mastery'];
        for (const cat of questCats) {
          const quests = QUESTS.filter((q) => q.category === cat);
          if (quests.length === 0) continue;
          html += `<div class="shop-section-title">${QUEST_CATEGORY_LABELS[cat]}</div><div class="quest-grid">`;
          for (const q of quests) {
            const done = q.check(save);
            const claimed = save.quests.completed.includes(q.id);
            const claimable = done && !claimed;
            html += `
              <div class="quest-item ${claimed ? 'claimed' : done ? 'claimable' : 'locked'}">
                <div class="quest-body">
                  <div class="quest-name">${q.name}</div>
                  <div class="quest-desc">${q.description}</div>
                </div>
                <div class="quest-reward">
                  <span class="quest-proto">+${q.reward}◇</span>
                  ${claimed
                    ? '<span class="quest-done">✓ CLAIMED</span>'
                    : claimable
                      ? `<button class="btn btn-primary quest-claim" data-id="${q.id}">CLAIM</button>`
                      : '<span class="quest-locked">LOCKED</span>'}
                </div>
              </div>
            `;
          }
          html += `</div>`;
        }
      }

      html += `</div>`;
      root.innerHTML = html;

      (root.querySelector('#back-btn') as HTMLButtonElement).onclick = () => { audio.play('ui_click'); onBack(); };

      root.querySelectorAll<HTMLButtonElement>('.shop-tab').forEach((btn) => {
        btn.onclick = () => {
          activeTab = btn.dataset.tab as Tab;
          audio.play('ui_hover');
          render();
        };
      });

      root.querySelectorAll<HTMLButtonElement>('.shop-buy').forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const id = btn.dataset.id!;
          const u = SHOP_UPGRADES.find((x) => x.id === id);
          if (!u) return;
          const stacks = save.shopPurchased[id] ?? 0;
          if (stacks >= u.maxStacks) return;
          const cost = shopCost(u, stacks + 1);
          if (save.protocols < cost) { audio.play('sell'); return; }
          save.protocols -= cost;
          save.shopPurchased[id] = stacks + 1;
          recomputeMetaBoosts(save);
          persist();
          audio.play('upgrade');
          render();
        };
      });

      root.querySelectorAll<HTMLButtonElement>('.quest-claim').forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const id = btn.dataset.id!;
          const q = QUESTS.find((x) => x.id === id);
          if (!q) return;
          if (save.quests.completed.includes(id)) return;
          if (!q.check(save)) return;
          save.protocols += q.reward;
          save.stats.totalProtocolsEarned += q.reward;
          save.quests.completed.push(id);
          persist();
          audio.play('upgrade');
          render();
        };
      });
    };

    render();
  };
}
