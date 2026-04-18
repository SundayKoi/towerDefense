// Loads /sprites.png once, slices each indexed frame into its own offscreen
// HTMLCanvasElement so the rest of the renderer can drawImage(canvas) without
// extra source-rect math. The sheet IDs differ from gameplay IDs (e.g. the
// sheet calls it `chain_lightning` but the engine knows it as `chain`); the
// mapping tables below bridge the two namespaces.
//
// Animations: each sprite is currently a single 32x32 frame. To extend this
// with multi-frame animations, change SpriteFrame in spritesheet.ts to carry
// a `frames: SpriteFrame[]` array and update getSheetSprite to pick the right
// frame based on a per-entity animation timer.

import type { TowerId, EnemyId } from '@/types';
import {
  SHEET_URL,
  SPRITE_SIZE,
  TURRETS as SHEET_TURRETS,
  ENEMIES as SHEET_ENEMIES,
  PROJECTILES as SHEET_PROJECTILES,
  EFFECTS as SHEET_EFFECTS,
  UI_ICONS as SHEET_UI,
  type TurretId as SheetTurretId,
  type EnemyId as SheetEnemyId,
  type ProjectileId as SheetProjectileId,
  type EffectId as SheetEffectId,
  type UIIconId as SheetUIIconId,
  type SpriteFrame,
} from './spritesheet';

// Game TowerId  ↔  spritesheet TurretId. The engine uses short IDs that
// predate the asset pack; the sheet uses descriptive IDs.
const TURRET_ID_TO_SHEET: Partial<Record<TowerId, SheetTurretId>> = {
  firewall:     'firewall',
  honeypot:     'honeypot',
  antivirus:    'antivirus',
  quantum:      'quantum',
  ice:          'ice_breaker',
  mine:         'artillery',
  chain:        'chain_lightning',
  railgun:      'railgun',
  pulse:        'emp_array',
  sniper:       'overwatch',
  scrambler:    'disruptor',
  sentinel:     'sentinel',
  booster_node: 'booster',
  data_miner:   'decrypt',
};

const ENEMY_ID_TO_SHEET: Partial<Record<EnemyId, SheetEnemyId>> = {
  worm:        'worm',
  spider:      'crawler',
  trojan:      'trojan',
  rootkit:     'rootkit',
  phantom:     'phantom',
  wraith:      'wraith',
  leech:       'leech',
  bomber:      'bomber',
  stealth:     'ghost',
  kernel:      'kernel',
  daemon:      'daemon',
  leviathan:   'leviathan',
  voidlord:    'void_lord',
  swarm:       'swarm_queen',
  corruptor:   'corruptor',
  glitch:      'glitch',
  juggernaut:  'juggernaut',
  parasite:    'parasite',
};

let sheetImage: HTMLImageElement | null = null;
const frameCache = new Map<string, HTMLCanvasElement>();
let loadPromise: Promise<void> | null = null;

export function loadSpriteSheet(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { sheetImage = img; resolve(); };
    img.onerror = () => {
      // If the sheet fails to load (offline first-paint, blocked, etc.) the
      // existing procedural SVG sprites are still wired up as a fallback in
      // src/render/sprites.ts — getEnemySprite/getTowerSprite return those
      // when the sheet hasn't populated the cache.
      console.warn('[sprites] failed to load /sprites.png — falling back to procedural SVG');
      resolve();
    };
    img.src = SHEET_URL;
  });
  return loadPromise;
}

function sliceFrame(frame: SpriteFrame): HTMLCanvasElement | undefined {
  if (!sheetImage) return undefined;
  const key = `${frame.x},${frame.y},${frame.w},${frame.h}`;
  const cached = frameCache.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = frame.w;
  canvas.height = frame.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return undefined;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheetImage, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h);
  frameCache.set(key, canvas);
  return canvas;
}

export function getSheetTowerSprite(id: TowerId): HTMLCanvasElement | undefined {
  const sheetId = TURRET_ID_TO_SHEET[id];
  if (!sheetId) return undefined;
  return sliceFrame(SHEET_TURRETS[sheetId].sprite);
}

export function getSheetEnemySprite(id: EnemyId): HTMLCanvasElement | undefined {
  const sheetId = ENEMY_ID_TO_SHEET[id];
  if (!sheetId) return undefined;
  return sliceFrame(SHEET_ENEMIES[sheetId].sprite);
}

export function getSheetProjectileSprite(id: SheetProjectileId): HTMLCanvasElement | undefined {
  return sliceFrame(SHEET_PROJECTILES[id].sprite);
}

export function getSheetEffectSprite(id: SheetEffectId): HTMLCanvasElement | undefined {
  return sliceFrame(SHEET_EFFECTS[id].sprite);
}

export function getSheetUiIcon(id: SheetUIIconId): HTMLCanvasElement | undefined {
  return sliceFrame(SHEET_UI[id].sprite);
}

export function getSheetDataUrl(id: TowerId): string | undefined {
  // For DOM use (palette portraits). Slice the frame and export as PNG data URL.
  const c = getSheetTowerSprite(id);
  return c?.toDataURL('image/png');
}

// Re-export SPRITE_SIZE so consumers don't import from two files.
export { SPRITE_SIZE };
