import type { SaveData } from '@/types';
import { SHOP_UPGRADES, shopCost, recomputeMetaBoosts } from '@/data/shop';
import { mount, type Screen } from './screens';
import { audio } from '@/audio/sfx';

export function openShopScreen(save: SaveData, persist: () => void, onBack: () => void): void {
  mount(shopScreen(save, persist, onBack));
}

function shopScreen(save: SaveData, persist: () => void, onBack: () => void): Screen {
  return (root) => {
    const render = () => {
      const categories: Record<string, string> = { power: 'COMBAT', economy: 'ECONOMY', utility: 'UTILITY' };
      let html = `
        <div class="screen screen-scroll shop-screen">
          <header class="topbar">
            <button class="btn btn-ghost" id="back-btn">&larr; BACK</button>
            <div class="topbar-title">UPGRADE TERMINAL</div>
            <div class="shop-protocols"><span>\u25C7 PROTOCOLS</span><b>${save.protocols}</b></div>
          </header>
          <div class="shop-intro">
            Spend PROTOCOLS earned in runs on permanent upgrades. All benefits apply to every future run.
          </div>
      `;
      for (const cat of Object.keys(categories)) {
        const items = SHOP_UPGRADES.filter((u) => u.category === cat);
        if (items.length === 0) continue;
        html += `<div class="shop-section-title">${categories[cat]}</div><div class="shop-grid">`;
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
                  ${maxed ? '<span class="shop-maxed">MAXED OUT</span>' :
                    `<span class="shop-cost">${nextCost}\u25C7</span>
                     <span class="shop-stack-info">${stacks} / ${u.maxStacks}</span>`}
                </div>
              </div>
              ${maxed ? '' : `<button class="btn btn-primary shop-buy" data-id="${u.id}" ${afford ? '' : 'disabled'}>BUY</button>`}
            </div>
          `;
        }
        html += `</div>`;
      }
      html += `</div>`;
      root.innerHTML = html;

      (root.querySelector('#back-btn') as HTMLButtonElement).onclick = () => { audio.play('ui_click'); onBack(); };
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
    };
    render();
  };
}
