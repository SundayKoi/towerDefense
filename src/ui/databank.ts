import type { SaveData, TowerId, EnemyId, Difficulty } from '@/types';
import { TOWERS } from '@/data/towers';
import { ENEMIES } from '@/data/enemies';
import { CARDS, CARDS_BY_ID } from '@/data/cards';
import { ENEMY_PORT, TOWER_EXPLOITS } from '@/data/ports';
import { CHROMAS, CHROMAS_BY_ID } from '@/data/chromas';
import { MAPS, isSurvival } from '@/data/maps';
import { RUNNERS, RUNNER_IDS } from '@/data/runners';
import { ASCENSION_DESCRIPTIONS, ASCENSION_MAX } from '@/data/ascension';
import { DIFFICULTY_PROFILE } from '@/game/waves';
import { mount, type Screen } from './screens';
import { audio } from '@/audio/sfx';

export function openDatabankScreen(save: SaveData, onBack: () => void): void {
  mount(databankScreen(save, onBack));
}

type Tab = 'arsenal' | 'cards' | 'intrusions' | 'progression';

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

      if (activeTab === 'progression') {
        body += renderProgressionTab(save);
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
            <button class="shop-tab${activeTab === 'progression' ? ' active' : ''}" data-tab="progression">PROGRESSION</button>
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

// ── PROGRESSION TAB ────────────────────────────────────────────────────────
// Central reference for every unlock, progression system, and run-configuration
// knob. The goal: a player should be able to answer "where do I get X / what
// does Y do" without digging through menus.

function renderProgressionTab(save: SaveData): string {
  const campaign = MAPS.filter((m) => !isSurvival(m.id)).slice().sort((a, b) => a.order - b.order);
  const ascensionMax = save.ascensionMax ?? 0;
  const out: string[] = [];

  out.push(`<div class="db-summary">PROGRESSION // how everything unlocks and scales</div>`);

  // ── DIFFICULTY TIERS ────────────────────────────────────────────────
  const diffs: Difficulty[] = ['easy', 'medium', 'hard'];
  out.push(`<div class="progress-section"><div class="progress-head">DIFFICULTY TIERS</div>`);
  out.push(`<div class="progress-sub">Picked per-map on the intrusion select screen. Waves, draft size, and enemy scaling shift per tier. Later acts spawn up to +90% more enemies per wave than Act 1.</div>`);
  out.push(`<table class="progress-table"><thead><tr>
    <th></th>
    <th class="t-easy">EASY</th>
    <th class="t-med">MEDIUM</th>
    <th class="t-hard">HARD</th>
  </tr></thead><tbody>`);
  const totalWaves = diffs.map((d) => {
    const m = campaign[0].difficulties[d];
    return m.waves;
  });
  out.push(`<tr><td>Wave count (map 1)</td><td>${totalWaves[0]}</td><td>${totalWaves[1]}</td><td>${totalWaves[2]}</td></tr>`);
  out.push(`<tr><td>Enemy HP scaling / wave</td><td>+13%</td><td>+17%</td><td>+24%</td></tr>`);
  out.push(`<tr><td>Enemy speed scaling / wave</td><td>+0.1%</td><td>+0.2%</td><td>+0.3%</td></tr>`);
  out.push(`<tr><td>Draft card options</td><td>${DIFFICULTY_PROFILE.easy.draftSize}</td><td>${DIFFICULTY_PROFILE.medium.draftSize}</td><td>${DIFFICULTY_PROFILE.hard.draftSize}</td></tr>`);
  out.push(`<tr><td>Starting draft rerolls</td><td>${DIFFICULTY_PROFILE.easy.startingRerolls}</td><td>${DIFFICULTY_PROFILE.medium.startingRerolls}</td><td>${DIFFICULTY_PROFILE.hard.startingRerolls}</td></tr>`);
  out.push(`<tr><td>Random turret lock at run start</td><td>0</td><td>0</td><td>${DIFFICULTY_PROFILE.hard.turretLockCount}</td></tr>`);
  out.push(`<tr><td>TROJAN unlock gate (wave)</td><td>${DIFFICULTY_PROFILE.easy.enemyGates.trojan}</td><td>${DIFFICULTY_PROFILE.medium.enemyGates.trojan}</td><td>${DIFFICULTY_PROFILE.hard.enemyGates.trojan}</td></tr>`);
  out.push(`<tr><td>ROOTKIT unlock gate (wave)</td><td>${DIFFICULTY_PROFILE.easy.enemyGates.rootkit}</td><td>${DIFFICULTY_PROFILE.medium.enemyGates.rootkit}</td><td>${DIFFICULTY_PROFILE.hard.enemyGates.rootkit}</td></tr>`);
  out.push(`<tr><td>PHANTOM unlock gate (wave)</td><td>${DIFFICULTY_PROFILE.easy.enemyGates.phantom}</td><td>${DIFFICULTY_PROFILE.medium.enemyGates.phantom}</td><td>${DIFFICULTY_PROFILE.hard.enemyGates.phantom}</td></tr>`);
  out.push(`<tr><td>Clear protocol reward</td><td>20&#9670;</td><td>50&#9670;</td><td>100&#9670;</td></tr>`);
  out.push(`</tbody></table></div>`);

  // ── MAP UNLOCK WATERFALL ────────────────────────────────────────────
  out.push(`<div class="progress-section"><div class="progress-head">TURRET + CARD UNLOCKS</div>`);
  out.push(`<div class="progress-sub">Each map grants a different reward per difficulty cleared. Clear Easy first to unlock the next map. Cards unlock alongside their parent turret.</div>`);
  out.push(`<table class="progress-table progress-table-compact"><thead><tr>
    <th>MAP</th>
    <th class="t-easy">EASY CLEAR</th>
    <th class="t-med">MEDIUM CLEAR</th>
    <th class="t-hard">HARD CLEAR</th>
  </tr></thead><tbody>`);
  for (const m of campaign) {
    const r = m.rewards;
    const cell = (reward: { type: string; id: string } | undefined) => {
      if (!reward) return '<span class="db-dim">-</span>';
      if (reward.type === 'unlock-tower') {
        const tname = TOWERS[reward.id as TowerId]?.name ?? reward.id;
        return `<span class="db-reward-tower">${tname}</span>`;
      }
      if (reward.type === 'unlock-card') {
        const c = CARDS_BY_ID[reward.id];
        return `<span class="db-reward-card">${c?.name ?? reward.id}</span>`;
      }
      if (reward.type === 'unlock-branch') {
        const [tid, branchKey] = reward.id.split('.');
        const tname = TOWERS[tid as TowerId]?.name ?? tid;
        return `<span class="db-reward-branch">${tname} / ${branchKey.toUpperCase()}</span>`;
      }
      if (reward.type === 'protocols') {
        return `<span class="db-reward-proto">+${reward.id}&#9670;</span>`;
      }
      return `<span class="db-dim">${reward.type}</span>`;
    };
    const orderLabel = String(m.order).padStart(2, '0');
    out.push(`<tr>
      <td><span class="db-map-id" style="color:${m.accentColor}">${orderLabel} ${m.name}</span></td>
      <td>${cell(r.easyClear)}</td>
      <td>${cell(r.mediumClear)}</td>
      <td>${cell(r.hardClear)}</td>
    </tr>`);
  }
  out.push(`</tbody></table></div>`);

  // ── ASCENSION ──────────────────────────────────────────────────────
  out.push(`<div class="progress-section"><div class="progress-head">ICE DEPTH / ASCENSION</div>`);
  out.push(`<div class="progress-sub">Unlocked by winning any map on HARD. Each new level unlocks by winning at the current max. Apply from the RUNNER/DEPTH bar on the intrusion select screen.</div>`);
  out.push(`<div class="progress-sub">Your max: <b class="db-accent">${ascensionMax}</b> / ${ASCENSION_MAX}</div>`);
  out.push(`<table class="progress-table progress-table-compact"><thead><tr><th>LEVEL</th><th>EFFECTS</th></tr></thead><tbody>`);
  for (let lvl = 1; lvl <= ASCENSION_MAX; lvl++) {
    const effects = ASCENSION_DESCRIPTIONS[lvl] ?? [];
    const unlocked = lvl <= ascensionMax;
    out.push(`<tr class="${unlocked ? '' : 'db-row-locked'}">
      <td class="db-asc-level">${lvl}${unlocked ? '' : ' &#128274;'}</td>
      <td>${effects.join(' &middot; ')}</td>
    </tr>`);
  }
  out.push(`</tbody></table></div>`);

  // ── NG+ ────────────────────────────────────────────────────────────
  out.push(`<div class="progress-section"><div class="progress-head">NG+</div>`);
  out.push(`<div class="progress-sub">Per-map replay tier. First victory unlocks NG+1; each subsequent victory at the current tier bumps it by 1 (max 5). Each tier multiplies enemy HP and rewards.</div>`);
  out.push(`<table class="progress-table progress-table-compact"><thead><tr><th>TIER</th><th>ENEMY HP</th><th>PROTOCOL REWARD</th></tr></thead><tbody>`);
  for (let t = 0; t <= 5; t++) {
    out.push(`<tr><td>${t}</td><td>+${t * 50}%</td><td>+${t * 25}%</td></tr>`);
  }
  out.push(`</tbody></table></div>`);

  // ── RUNNERS ────────────────────────────────────────────────────────
  out.push(`<div class="progress-section"><div class="progress-head">RUNNERS</div>`);
  out.push(`<div class="progress-sub">Pick a persona on the intrusion select screen. Each has a passive buff and one banned turret.</div>`);
  out.push(`<table class="progress-table progress-table-compact"><thead><tr><th>RUNNER</th><th>BUFFS</th><th>BAN</th></tr></thead><tbody>`);
  for (const id of RUNNER_IDS) {
    const r = RUNNERS[id];
    const bits: string[] = [];
    if (r.passiveDamagePct) bits.push(`+${Math.round(r.passiveDamagePct * 100)}% DMG`);
    if (r.passiveRatePct) bits.push(`+${Math.round(r.passiveRatePct * 100)}% RATE`);
    if (r.passiveCritPct) bits.push(`+${Math.round(r.passiveCritPct * 100)}% CRIT`);
    if (r.bonusStartingHp) bits.push(`+${r.bonusStartingHp} HP`);
    if (r.bonusHpRegenPerWave) bits.push(`+${r.bonusHpRegenPerWave} HP/wave`);
    if (r.bonusStartingLevels) bits.push(`+${r.bonusStartingLevels} level`);
    out.push(`<tr>
      <td><span class="db-accent" style="color:${r.color}">${r.name}</span></td>
      <td>${bits.join(' &middot; ')}</td>
      <td>${TOWERS[r.bannedTower]?.name ?? r.bannedTower.toUpperCase()}</td>
    </tr>`);
  }
  out.push(`</tbody></table></div>`);

  // ── CHROMAS ────────────────────────────────────────────────────────
  out.push(`<div class="progress-section"><div class="progress-head">CHROMA UNLOCKS</div>`);
  out.push(`<div class="progress-sub">Cosmetic tower color overrides. Earned via lifetime milestones. Equip from the ARSENAL tab.</div>`);
  out.push(`<table class="progress-table progress-table-compact"><thead><tr><th>CHROMA</th><th>TURRET</th><th>HOW TO UNLOCK</th></tr></thead><tbody>`);
  for (const c of CHROMAS) {
    const unlocked = save.unlockedChromas?.includes(c.id);
    const tname = TOWERS[c.tower]?.name ?? c.tower;
    out.push(`<tr class="${unlocked ? '' : 'db-row-locked'}">
      <td><span style="color:${c.accent}">${c.name}${unlocked ? ' &check;' : ''}</span></td>
      <td>${tname}</td>
      <td>${c.unlockDescription}</td>
    </tr>`);
  }
  out.push(`</tbody></table></div>`);

  // ── DAILY CONTRACT ─────────────────────────────────────────────────
  out.push(`<div class="progress-section"><div class="progress-head">DAILY CONTRACT</div>`);
  out.push(`<div class="progress-sub">Seeded run — same (map, difficulty, mutator) for everyone on the same day. Unlocks after clearing 3 maps. Tracks best wave + clear time.</div>`);
  out.push(`<div class="progress-sub">Mutators rotate daily: PACKET STORM (+40% burst spawns), ENCRYPTED PAYLOADS (+30% shield HP), GHOST PROTOCOL (25% cloaked — needs AOE/chain turret), REPLICATING VIRUS (15% worm offspring on kill), ROOTKIT SWEEP (jam every 4s near bosses).</div>`);
  out.push(`</div>`);

  return out.join('');
}

// Silence "unused import" warnings in case the CARDS constant is removed
// from a future refactor; the reference below keeps the linter happy without
// affecting bundle size.
void CARDS;
