import '@/css/main.css';
import { loadSave, writeSave, createRun, defaultSave } from '@/game/state';
import { CARDS, CARDS_BY_ID, drawDraft } from '@/data/cards';
import { TOWERS } from '@/data/towers';
import { cycleTargetMode, placeTower, removeTower, startWave, triggerOverdrive, updateRun } from '@/game/engine';
import { applyBloom, applyPixelate, canPlaceAt, createViewport, renderRun, resizeViewport } from '@/render/canvas';
import { preloadSprites } from '@/render/sprites';
import { initBackground } from '@/render/background';
import { startScreen } from '@/ui/start';
import { mapSelectScreen } from '@/ui/mapSelect';
import { gameScreen, renderPalette, renderSelectedTower, renderTokensBar, type GameScreenHandles } from '@/ui/game';
import { openBuildStats, openCardDraft, openEnemyIntel, openGameOver, openPauseMenu, openSettingsModal } from '@/ui/modals';
import { openShopScreen } from '@/ui/shop';
import { openDatabankScreen } from '@/ui/databank';
import { openHowToPlayScreen, showTutorialIfNew } from '@/ui/tutorial';
import { mount } from '@/ui/screens';
import { audio } from '@/audio/sfx';
import { addToAllPeriods } from '@/data/contracts';
import type { Difficulty, EnemyId, RunState, SaveData, TowerId } from '@/types';
import { ENEMIES } from '@/data/enemies';
import { getMap, isSurvival } from '@/data/maps';

// ---------- Helpers ----------

function isBossWave(r: RunState, wave: number): boolean {
  const bosses = getMap(r.mapId).bosses[r.difficulty];
  return bosses[wave] != null;
}

function showEnemyIntroBanner(defId: EnemyId): void {
  const def = ENEMIES[defId];
  const threatColor: Record<string, string> = {
    LOW: '#00ff88', MEDIUM: '#ffd600', HIGH: '#ff9900', EXTREME: '#ff3355',
    BOSS: '#ff2d95', MEGA: '#b847ff', FINAL: '#ffffff',
  };
  const col = threatColor[def.threat] ?? '#ff9900';
  const el = document.createElement('div');
  el.className = 'enemy-intro-banner';
  el.style.cssText = `border-color:${col};`;
  el.innerHTML = `
    <div class="eib-threat" style="color:${col}">// NEW THREAT DETECTED — ${def.threat}</div>
    <div class="eib-name" style="color:${col}">${def.name}</div>
    <div class="eib-desc">${def.description}</div>
    <div class="eib-tip">COUNTER: ${def.counterTip}</div>
  `;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('eib-fade'), 3200);
  setTimeout(() => el.remove(), 4000);
}

function showWaveBanner(r: RunState): void {
  const isBoss = isBossWave(r, r.wave);
  const el = document.createElement('div');
  el.className = 'wave-banner' + (isBoss ? ' boss' : '');
  const waveText = isSurvival(r.mapId) ? `WAVE ${r.wave}` : `WAVE ${r.wave} / ${r.totalWaves}`;
  el.innerHTML = `
    <div class="wb-small">${isBoss ? '// BOSS INCOMING' : '// WAVE INITIATED'}</div>
    <div class="wb-big">${waveText}</div>
    <div class="wb-underline"></div>
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

// ---------- Boot ----------

const bgCanvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
const bgHandle = initBackground(bgCanvas);

let save: SaveData = loadSave();
bgHandle.setPixelMode(save.settings.pixelMode, save.settings.pixelFactor);
document.documentElement.classList.toggle('pixel-mode', save.settings.pixelMode);
// Sync audio engine with saved preferences before anything tries to play/start music.
audio.setEnabled(save.settings.sfx);
audio.setMusicEnabled(save.settings.music);

function applySettings() {
  writeSave(save);
  bgHandle.setPixelMode(save.settings.pixelMode, save.settings.pixelFactor);
  document.documentElement.classList.toggle('pixel-mode', save.settings.pixelMode);
  audio.setEnabled(save.settings.sfx);
  audio.setMusicEnabled(save.settings.music);
}

preloadSprites().then(() => { showStart(); });

const startAudio = () => {
  if (save.settings.music) audio.startAmbient('menu');
  window.removeEventListener('pointerdown', startAudio);
};
window.addEventListener('pointerdown', startAudio, { once: true });

function showStart() {
  mount(startScreen(
    () => showMapSelect(),
    () => openSettingsModal(save, applySettings),
    () => openShopScreen(save, () => writeSave(save), showStart),
    () => openDatabankScreen(save, showStart),
    () => openHowToPlayScreen(showStart),
  ));
}

function showMapSelect() {
  mount(mapSelectScreen(save, (mapId, diff) => startRun(mapId, diff), showStart));
}

// ---------- Run lifecycle ----------

let run: RunState | null = null;
let runHandles: GameScreenHandles | null = null;
let hoverCell: { x: number; y: number } | null = null;
let lastFrame = 0;
let rafId = 0;
// Cleanup callbacks registered by wireGameScreen — run on finishRun to release listeners/observers.
let runCleanups: Array<() => void> = [];
// Set when a tower is selected so updateHud can refresh its panel each frame
// (so overdrive timers tick visibly). Cleared when no tower is selected.
let selectedRerender: (() => void) | null = null;

function runRunCleanups() {
  for (const fn of runCleanups) { try { fn(); } catch {} }
  runCleanups = [];
}

function startRun(mapId: string, difficulty: Difficulty) {
  save.stats.totalRuns += 1;
  writeSave(save);
  run = createRun(mapId, difficulty, save);
  const ge = gameScreen(run, save);
  mount(ge);
  runHandles = ge.handles();
  wireGameScreen();
  startLoop();
  audio.stopAmbient();
  audio.startAmbient('game');
  // Tutorial: very first run ever — explain the basics before they tap anything.
  showTutorialIfNew(save, () => writeSave(save), 'first_run');
  // If meta-boosts gave us an opening level, let player draft immediately.
  if (save.metaBoosts.extraDraftCards > 0 || save.metaBoosts.startingLevel > 0) {
    // No auto-draft at start unless pending level-ups accrued — keep it predictable.
  }
}

function wireGameScreen() {
  if (!run || !runHandles) return;
  const r = run;
  const h = runHandles;

  // Viewport
  const vp = createViewport(h.canvas);
  const wrap = h.canvas.parentElement as HTMLElement;
  const doResize = () => {
    // Primary: measure canvas-wrap directly
    let w = wrap.getBoundingClientRect().width;
    let hh = wrap.getBoundingClientRect().height;
    // Fallback: game-screen is always sized (position:fixed derived) — subtract bar heights
    if (w < 4 || hh < 4) {
      const gs = wrap.closest('.game-screen') as HTMLElement | null;
      const gsRect = gs?.getBoundingClientRect();
      if (gsRect && gsRect.width > 4) {
        w = gsRect.width;
        const hudH = (document.querySelector('.hud') as HTMLElement | null)?.offsetHeight ?? 0;
        const tokH = (document.getElementById('hud-tokens') as HTMLElement | null)?.offsetHeight ?? 0;
        const actH = (document.querySelector('.action-bar') as HTMLElement | null)?.offsetHeight ?? 0;
        hh = gsRect.height - hudH - tokH - actH;
      }
    }
    if (w < 4 || hh < 4) return;
    resizeViewport(vp, getMap(r.mapId), w, hh);
  };
  doResize();
  requestAnimationFrame(() => { doResize(); requestAnimationFrame(doResize); });
  const t1 = setTimeout(doResize, 50);
  const t2 = setTimeout(doResize, 200);
  runCleanups.push(() => clearTimeout(t1));
  runCleanups.push(() => clearTimeout(t2));
  window.addEventListener('resize', doResize);
  runCleanups.push(() => window.removeEventListener('resize', doResize));
  if (typeof ResizeObserver !== 'undefined') {
    const ro1 = new ResizeObserver(doResize); ro1.observe(wrap);
    const ro2 = new ResizeObserver(doResize); ro2.observe(document.documentElement);
    runCleanups.push(() => ro1.disconnect());
    runCleanups.push(() => ro2.disconnect());
  }
  (wireGameScreen as any).__doResize = doResize;

  // Place at the given grid cell. Returns true on success. Centralizes the
  // singleton check + token consumption + palette refresh so both tap-to-place
  // and drag-to-place use exactly the same logic.
  const tryPlaceAt = (tid: TowerId, gx: number, gy: number): boolean => {
    if (!run) return false;
    if (run.towers.some((t) => t.def === tid)) {
      const msg = document.createElement('div');
      msg.className = 'wave-banner';
      msg.innerHTML = `<div class="wb-small">// SINGLETON LIMIT</div><div class="wb-big">ALREADY DEPLOYED</div>`;
      document.body.appendChild(msg);
      setTimeout(() => msg.remove(), 1600);
      audio.play('sell');
      return false;
    }
    if (!canPlaceAt(run, { x: gx, y: gy })) {
      audio.play('sell');
      return false;
    }
    placeTower(run, tid, { x: gx, y: gy });
    if (!save.stats.towersEverDeployed.includes(tid)) {
      save.stats.towersEverDeployed.push(tid);
      writeSave(save);
    }
    // Tutorial: explain the selected-tower panel after the first ever placement.
    showTutorialIfNew(save, () => writeSave(save), 'first_place');
    // Tutorial: subnet bonus tip fires the first time a placement creates a link.
    if (run && run.towers.length >= 2) {
      const placed = run.towers[run.towers.length - 1];
      const linked = run.towers.some((t) =>
        t.id !== placed.id &&
        Math.abs(t.grid.x - placed.grid.x) <= 1 &&
        Math.abs(t.grid.y - placed.grid.y) <= 1
      );
      if (linked) showTutorialIfNew(save, () => writeSave(save), 'first_subnet');
    }
    return true;
  };

  const activatePlacement = (tid: TowerId, ev?: PointerEvent) => {
    r.selection = { kind: 'placing', def: tid };
    h.paletteEl.classList.remove('open');
    h.cancelBtn.style.display = '';

    // No event → keyboard / programmatic activation, just enter placing mode.
    if (!ev) return;
    ev.preventDefault();
    // Release implicit pointer capture from the button so pointermove fires on document.
    try { (ev.target as Element).releasePointerCapture?.(ev.pointerId); } catch {}

    const startX = ev.clientX;
    const startY = ev.clientY;
    let dragged = false;

    const updateHover = (cx: number, cy: number) => {
      const rect = h.canvas.getBoundingClientRect();
      const x = cx - rect.left;
      const y = cy - rect.top;
      const inCanvas = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
      hoverCell = inCanvas ? { x: Math.floor(x / vp.cellSize), y: Math.floor(y / vp.cellSize) } : null;
      return inCanvas;
    };
    // Seed hover from the down position so the ghost shows immediately if the
    // player presses inside the canvas (not over a palette button).
    updateHover(startX, startY);

    const onMove = (mv: PointerEvent) => {
      if (!dragged) {
        const dx = mv.clientX - startX;
        const dy = mv.clientY - startY;
        if (Math.hypot(dx, dy) > 6) dragged = true;
      }
      updateHover(mv.clientX, mv.clientY);
    };

    const onUp = (uv: PointerEvent) => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);

      // Quick tap with no drag → leave placing mode armed; user can tap a cell next.
      if (!dragged) return;

      // Drag release: try to drop at this position.
      if (!run) return;
      const rect = h.canvas.getBoundingClientRect();
      const x = uv.clientX - rect.left;
      const y = uv.clientY - rect.top;
      const inCanvas = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
      if (!inCanvas) {
        // Released outside the playfield → cancel.
        run.selection = { kind: 'none' };
        h.cancelBtn.style.display = 'none';
        hoverCell = null;
        return;
      }
      const gx = Math.floor(x / vp.cellSize);
      const gy = Math.floor(y / vp.cellSize);
      if (tryPlaceAt(tid, gx, gy)) {
        run.selection = { kind: 'none' };
        h.cancelBtn.style.display = 'none';
        renderPalette(h, run, activatePlacement);
        renderTokensBar(h, run, activatePlacement);
        updateHud();
      } else {
        // Invalid cell on release — also cancel placing mode so the user gets a
        // clean retry instead of being silently stuck in placement.
        run.selection = { kind: 'none' };
        h.cancelBtn.style.display = 'none';
      }
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  };

  renderPalette(h, r, activatePlacement);
  renderTokensBar(h, r, activatePlacement);

  h.startBtn.onclick = () => {
    if (!run) return;
    if (run.phase !== 'prep') return;
    run.autoStartTimer = null;
    if (tryShowIntelForUpcomingWave(run)) return;
    startWave(run);
    showWaveBanner(run);
    updateHud();
  };

  h.pauseBtn.onclick = () => { if (run) pauseRun(); };

  h.buildBtn.onclick = () => {
    if (!run) return;
    openBuildStats(run);
  };

  h.speedBtn.onclick = () => {
    if (!run) return;
    run.timeScale = run.timeScale === 1 ? 2 : 1;
    h.speedBtn.textContent = run.timeScale + '\u00d7';
    audio.play('ui_click');
  };

  h.cancelBtn.onclick = () => {
    if (!run) return;
    run.selection = { kind: 'none' };
    h.cancelBtn.style.display = 'none';
    audio.play('ui_click');
  };

  const onTap = (evt: PointerEvent) => {
    if (!run || !runHandles) return;
    const rect = h.canvas.getBoundingClientRect();
    const px = evt.clientX - rect.left;
    const py = evt.clientY - rect.top;
    const gx = Math.floor(px / vp.cellSize);
    const gy = Math.floor(py / vp.cellSize);
    hoverCell = { x: gx, y: gy };

    if (run.selection.kind === 'placing') {
      const defId = run.selection.def;
      if (tryPlaceAt(defId, gx, gy)) {
        run.selection = { kind: 'none' };
        h.cancelBtn.style.display = 'none';
        renderPalette(h, run, activatePlacement);
        renderTokensBar(h, run, activatePlacement);
        updateHud();
      }
      return;
    }

    const t = run.towers.find((t) => t.grid.x === gx && t.grid.y === gy);
    if (t) {
      run.selection = { kind: 'tower', towerId: t.id };
      const rerenderSel = () => renderSelectedTower(h, run!,
        () => { removeTower(run!, t); h.selectedEl.classList.remove('open'); updateHud(); selectedRerender = null; },
        () => { cycleTargetMode(t); rerenderSel(); },
        () => { triggerOverdrive(run!, t); rerenderSel(); },
      );
      // Expose to updateHud so the overdrive timers tick visibly while the panel is open.
      selectedRerender = rerenderSel;
      rerenderSel();
      return;
    }

    if (canPlaceAt(run, { x: gx, y: gy })) {
      // Only open palette if player has any deploy tokens
      const hasAny = Object.values(run.deployTokens).some((n) => (n ?? 0) > 0);
      if (hasAny) {
        h.paletteEl.classList.add('open');
        renderPalette(h, run, activatePlacement);
      } else {
        audio.play('sell');
      }
    } else {
      if (run.selection.kind === 'tower') {
        run.selection = { kind: 'none' };
        h.selectedEl.classList.remove('open');
      }
    }
  };

  const onMove = (e: PointerEvent) => {
    const rect = h.canvas.getBoundingClientRect();
    hoverCell = { x: Math.floor((e.clientX - rect.left) / vp.cellSize), y: Math.floor((e.clientY - rect.top) / vp.cellSize) };
  };
  h.canvas.addEventListener('pointerdown', onTap);
  h.canvas.addEventListener('pointermove', onMove);
  runCleanups.push(() => h.canvas.removeEventListener('pointerdown', onTap));
  runCleanups.push(() => h.canvas.removeEventListener('pointermove', onMove));

  (wireGameScreen as any).__vp = vp;
  // The two function-object properties below capture the run state and the canvas
  // viewport. If we don't clear them on run end, the old run + its canvas backing
  // store stays alive until the next run overwrites them — drops post-run heap
  // recovery from ~80 MB → ~10 MB per run.
  runCleanups.push(() => {
    (wireGameScreen as any).__vp = null;
    (wireGameScreen as any).__doResize = null;
  });
}

function updateHud() {
  if (!run || !runHandles) return;
  runHandles.hudHp.textContent = String(Math.max(0, Math.round(run.hp)));
  runHandles.hudLevel.textContent = String(run.level);
  const pct = Math.max(0, Math.min(100, (run.xp / run.xpToNext) * 100));
  runHandles.hudXpFill.style.width = pct + '%';
  runHandles.hudXpText.textContent = `${run.xp}/${run.xpToNext}`;
  const surv = isSurvival(run.mapId);
  runHandles.hudWave.textContent = surv ? `${run.wave}/\u221e` : `${run.wave}/${run.totalWaves}`;
  runHandles.hudMap.textContent = getMap(run.mapId).name;
  if (run.phase === 'prep') {
    const nextWave = run.wave + 1;
    const nextIsBoss = isBossWave(run, nextWave);
    const countdown = run.autoStartTimer !== null ? ` (${Math.ceil(run.autoStartTimer)}s)` : '';
    runHandles.startBtn.innerHTML = nextIsBoss
      ? `START WAVE ${nextWave}${countdown} <span class="boss-incoming">&#9888; BOSS</span>`
      : `START WAVE ${nextWave}${countdown}`;
    runHandles.startBtn.classList.toggle('btn-boss', nextIsBoss);
  } else {
    runHandles.startBtn.textContent = surv ? `WAVE ${run.wave}/\u221e` : `WAVE ${run.wave}/${run.totalWaves}`;
    runHandles.startBtn.classList.remove('btn-boss');
  }
  runHandles.startBtn.disabled = run.phase !== 'prep';
  // Refresh the selected tower panel so overdrive countdowns tick.
  if (selectedRerender && run.selection.kind === 'tower') {
    selectedRerender();
  } else if (selectedRerender && run.selection.kind !== 'tower') {
    selectedRerender = null;
  }
}

function startLoop() {
  cancelAnimationFrame(rafId);
  lastFrame = performance.now();
  const frame = (t: number) => {
    const dt = Math.min(0.1, (t - lastFrame) / 1000);
    lastFrame = t;
    if (run && runHandles) {
      const scaled = dt * run.timeScale;
      updateRun(run, scaled, {
        onGameOver: () => finishRun(false),
        onVictory: () => finishRun(true),
        onLevelUp: () => openLevelUpDraft(),
        onWaveCleared: () => {
          if (!run) return;
          const protoBonus = save.metaBoosts.bonusProtocolsPerWave ?? 0;
          if (protoBonus > 0) run.protocolsEarned += protoBonus;
          const hpRegen = save.metaBoosts.hpRegenPerWave ?? 0;
          if (hpRegen > 0) run.hp = Math.min(run.maxHp, run.hp + hpRegen);
          // Tutorial: explain XP / protocols / progression on first ever wave clear.
          showTutorialIfNew(save, () => writeSave(save), 'first_wave_clear');
        },
        onNewEnemy: (defId) => showEnemyIntroBanner(defId),
        onAutoStart: () => {
          if (!run) return;
          if (tryShowIntelForUpcomingWave(run)) return;
          startWave(run);
          showWaveBanner(run);
          updateHud();
        },
      });
      updateHud();
      const vp = (wireGameScreen as any).__vp;
      if (vp) {
        if (vp.width === 0) {
          const retry = (wireGameScreen as any).__doResize;
          if (retry) retry();
        } else {
          renderRun(vp, run, hoverCell);
          const pixel = save.settings.pixelMode;
          if (pixel) applyPixelate(vp, save.settings.pixelFactor);
          applyBloom(vp, pixel ? 0.55 : 0.3, pixel);
        }
      }
    }
    rafId = requestAnimationFrame(frame);
  };
  rafId = requestAnimationFrame(frame);
}

function pauseRun() {
  if (!run) return;
  const prevPhase = run.phase;
  run.phase = 'paused';
  openPauseMenu(
    () => { run!.phase = prevPhase; },
    () => {
      if (!run) return;
      const mid = run.mapId, d = run.difficulty;
      cancelAnimationFrame(rafId);
      runRunCleanups();
      run = null; runHandles = null;
      startRun(mid, d);
    },
    () => {
      cancelAnimationFrame(rafId);
      runRunCleanups();
      run = null; runHandles = null;
      showMapSelect();
    },
    () => { openSettingsModal(save, applySettings); },
  );
}

function buildDraftContext(r: RunState): { placedTowerTypes: Set<TowerId>; towerCount: number } {
  const placed = new Set<TowerId>();
  for (const t of r.towers) placed.add(t.def);
  return { placedTowerTypes: placed, towerCount: r.towers.length };
}

function openLevelUpDraft() {
  if (!run) return;
  if (run.phase === 'draft') return;
  const r = run;
  r.pendingLevelUps = Math.max(0, r.pendingLevelUps - 1);
  const prevPhase = r.phase;
  r.phase = 'draft';
  // Tutorial: explain card drafts on the player's first ever level-up.
  showTutorialIfNew(save, () => writeSave(save), 'first_levelup');
  const unlocked = new Set(save.unlockedCards);
  const cardCount = 3 + (save.metaBoosts.extraDraftCards ?? 0);
  const ctx = buildDraftContext(r);
  r.draftOptions = drawDraft(r.level, unlocked, ctx, cardCount, r.cardsPicked);
  r.draftSource = 'level';
  if (r.draftOptions.length === 0) {
    console.warn('[draft] empty pool for unlocked ids — falling back to starter pool');
    r.draftOptions = drawDraft(r.level, new Set(defaultSave().unlockedCards), ctx, cardCount, r.cardsPicked);
    if (r.draftOptions.length === 0) {
      r.phase = prevPhase;
      return;
    }
  }
  audio.play('card_reveal');
  openCardDraft(
    r,
    (id) => {
      const c = CARDS_BY_ID[id];
      if (c) {
        c.apply(r);
        if (c.rarity === 'legendary') {
          save.stats.legendaryDrafts = (save.stats.legendaryDrafts ?? 0) + 1;
          r.legendariesThisRun += 1;
          writeSave(save);
        }
      }
      r.cardsPicked.push(id);
      r.phase = prevPhase === 'wave' ? 'wave' : 'prep';
      if (runHandles) {
        const activate = (tid: TowerId) => {
          r.selection = { kind: 'placing', def: tid };
          runHandles!.paletteEl.classList.remove('open');
          runHandles!.cancelBtn.style.display = '';
        };
        renderTokensBar(runHandles, r, activate);
        renderPalette(runHandles, r, activate);
      }
    },
    () => {
      r.phase = prevPhase === 'wave' ? 'wave' : 'prep';
    },
    () => drawDraft(r.level, new Set(save.unlockedCards), buildDraftContext(r), cardCount, r.cardsPicked),
  );
}

function finishRun(victory: boolean) {
  if (!run) return;
  save.stats.totalWins += victory ? 1 : 0;
  save.protocols += run.protocolsEarned;
  save.stats.totalProtocolsEarned += run.protocolsEarned;
  save.stats.totalKills = (save.stats.totalKills ?? 0) + run.killsThisRun;
  save.stats.bossKills = (save.stats.bossKills ?? 0) + run.bossKillsThisRun;
  save.stats.totalXpEarned = (save.stats.totalXpEarned ?? 0) + run.xpThisRun;
  if (isSurvival(run.mapId) && run.wave > (save.stats.survivalBestWave ?? 0)) {
    save.stats.survivalBestWave = run.wave;
  }

  // Update per-period contract stats for daily/weekly/monthly
  {
    const r = run;
    const mediumWin = victory && r.difficulty === 'medium';
    const hardWin = victory && r.difficulty === 'hard';
    const towersThisRun = Array.from(new Set(r.towers.map((t) => t.def)));
    addToAllPeriods(save, (ps) => {
      ps.runs += 1;
      if (victory) ps.wins += 1;
      if (mediumWin) ps.mediumWins += 1;
      if (hardWin) ps.hardWins += 1;
      ps.kills += r.killsThisRun;
      ps.bossKills += r.bossKillsThisRun;
      ps.wavesCleared += r.wave;
      ps.protocolsEarned += r.protocolsEarned;
      ps.xpEarned += r.xpThisRun;
      ps.legendaryDrafts += r.legendariesThisRun;
      for (const tid of towersThisRun) {
        if (!ps.uniqueTowersDeployed.includes(tid)) ps.uniqueTowersDeployed.push(tid);
      }
    });
  }
  const unlocks: { kind: 'tower' | 'card'; id: string; name: string; rarity?: string }[] = [];
  if (victory) {
    const c = (save.completed[run.mapId] ?? {});
    c[run.difficulty] = true;
    save.completed[run.mapId] = c;
    // Clear bonus protocols
    const clearBonus = run.difficulty === 'hard' ? 100 : run.difficulty === 'medium' ? 50 : 20;
    save.protocols += clearBonus;
    save.stats.totalProtocolsEarned += clearBonus;
    run.protocolsEarned += clearBonus;
    const reward = getMap(run.mapId).rewards[(run.difficulty + 'Clear') as 'easyClear'|'mediumClear'|'hardClear'];
    if (reward) {
      if (reward.type === 'unlock-card' && !save.unlockedCards.includes(reward.id)) {
        save.unlockedCards.push(reward.id);
        const c = CARDS_BY_ID[reward.id];
        if (c) unlocks.push({ kind: 'card', id: c.id, name: c.name, rarity: c.rarity });
      }
      if (reward.type === 'unlock-tower' && !save.unlockedTowers.includes(reward.id as TowerId)) {
        save.unlockedTowers.push(reward.id as TowerId);
        const tid = reward.id as TowerId;
        const tdef = TOWERS[tid];
        unlocks.push({ kind: 'tower', id: tid, name: tdef?.name ?? tid.toUpperCase() });
        // Also grant the deploy card and every common/rare non-synergy upgrade for this tower,
        // so when you unlock a turret you immediately have meaningful upgrade paths in the draft pool.
        const auto = CARDS.filter((c) =>
          (c.id === `deploy_${tid}`) ||
          (c.category === 'upgrade' && c.towerHint === tid && !c.towerHint2 &&
            (c.rarity === 'common' || c.rarity === 'rare'))
        );
        for (const c of auto) {
          if (!save.unlockedCards.includes(c.id)) {
            save.unlockedCards.push(c.id);
            unlocks.push({ kind: 'card', id: c.id, name: c.name, rarity: c.rarity });
          }
        }
      }
    }
  }
  writeSave(save);
  openGameOver(run, victory, unlocks, () => {
    const mid = run!.mapId, d = run!.difficulty;
    cancelAnimationFrame(rafId);
    runRunCleanups();
    run = null; runHandles = null; hoverCell = null;
    startRun(mid, d);
  }, () => {
    cancelAnimationFrame(rafId);
    runRunCleanups();
    run = null; runHandles = null; hoverCell = null;
    showMapSelect();
  });
}

function tryShowIntelForUpcomingWave(r: RunState): boolean {
  const map = getMap(r.mapId);
  const nextWave = r.wave + 1;
  const progress = nextWave / r.totalWaves;
  let pool: EnemyId[];
  if (progress < 0.34) pool = map.enemyPool.phase1;
  else if (progress < 0.67) pool = map.enemyPool.phase2;
  else pool = map.enemyPool.phase3;
  const boss = map.bosses[r.difficulty][nextWave];

  let saveChanged = false;
  for (const eid of pool) {
    if (!save.seenEnemies.includes(eid)) { save.seenEnemies.push(eid); saveChanged = true; }
  }

  if (boss && !save.seenEnemies.includes(boss)) {
    save.seenEnemies.push(boss);
    writeSave(save);
    openEnemyIntel(boss as EnemyId, () => {
      startWave(r);
      showWaveBanner(r);
      updateHud();
    });
    return true;
  }
  if (saveChanged) writeSave(save);
  return false;
}
