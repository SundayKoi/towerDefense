import type { EnemyInstance, MapDef, Projectile, RunState, TowerInstance, Vec2 } from '@/types';
import { ENEMIES } from '@/data/enemies';
import { TOWERS } from '@/data/towers';
import { getMap, isPathCell } from '@/data/maps';
import { getEnemySprite, getTowerSprite } from './sprites';

export interface RenderViewport {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  cellSize: number;
  width: number;
  height: number;
  dpr: number;
}

// Convert grid coord → pixel.
export function gridToPx(vp: RenderViewport, v: Vec2): Vec2 {
  return { x: v.x * vp.cellSize + vp.cellSize / 2, y: v.y * vp.cellSize + vp.cellSize / 2 };
}

// Convert pixel → grid.
export function pxToGrid(vp: RenderViewport, px: number, py: number): Vec2 {
  return { x: Math.floor(px / vp.cellSize), y: Math.floor(py / vp.cellSize) };
}

export function resizeViewport(vp: RenderViewport, map: MapDef, containerW: number, containerH: number): void {
  // Fit map in container maintaining aspect ratio.
  const aspect = map.cols / map.rows;
  let cellW = containerW / map.cols;
  let cellH = containerH / map.rows;
  const cell = Math.floor(Math.min(cellW, cellH));
  vp.cellSize = Math.max(24, cell);
  vp.width = vp.cellSize * map.cols;
  vp.height = vp.cellSize * map.rows;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  vp.dpr = dpr;
  vp.canvas.width = Math.floor(vp.width * dpr);
  vp.canvas.height = Math.floor(vp.height * dpr);
  vp.canvas.style.width = vp.width + 'px';
  vp.canvas.style.height = vp.height + 'px';
  vp.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

export function createViewport(canvas: HTMLCanvasElement): RenderViewport {
  return { canvas, ctx: canvas.getContext('2d')!, cellSize: 32, width: 0, height: 0, dpr: 1 };
}

// Post-process pixelate: downsample the canvas to a low-res offscreen, then upscale with
// nearest-neighbor. Turns the whole frame into chunky pixel art.
const pixelateCache = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
export function applyPixelate(vp: RenderViewport, pixelFactor: number): void {
  const { canvas, ctx } = vp;
  const srcW = canvas.width;
  const srcH = canvas.height;
  if (srcW < 8 || srcH < 8) return;
  const dstW = Math.max(2, Math.floor(srcW / pixelFactor));
  const dstH = Math.max(2, Math.floor(srcH / pixelFactor));

  let off = pixelateCache.get(canvas);
  if (!off) {
    off = document.createElement('canvas');
    pixelateCache.set(canvas, off);
  }
  if (off.width !== dstW || off.height !== dstH) {
    off.width = dstW;
    off.height = dstH;
  }
  const offCtx = off.getContext('2d')!;
  offCtx.imageSmoothingEnabled = false;
  offCtx.globalCompositeOperation = 'source-over';
  offCtx.globalAlpha = 1;
  offCtx.clearRect(0, 0, dstW, dstH);
  offCtx.drawImage(canvas, 0, 0, srcW, srcH, 0, 0, dstW, dstH);

  // Reset transform on main canvas so we paint in device pixels, and disable smoothing.
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, srcW, srcH);
  ctx.drawImage(off, 0, 0, dstW, dstH, 0, 0, srcW, srcH);
  ctx.restore();
}

// Post-process bloom: multi-pass downscale = cheap blur. Then composite back with 'lighter'
// blend for the emissive Tron neon glow. Avoids ctx.filter (spotty browser support) entirely.
const bloomCacheA = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
const bloomCacheB = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
export function applyBloom(vp: RenderViewport, intensity: number, pixelated: boolean): void {
  const { canvas, ctx } = vp;
  const W = canvas.width;
  const H = canvas.height;
  if (W < 16 || H < 16 || intensity <= 0) return;

  // First pass: half-res
  const W1 = Math.max(8, Math.floor(W * 0.5));
  const H1 = Math.max(8, Math.floor(H * 0.5));
  let offA = bloomCacheA.get(canvas);
  if (!offA) { offA = document.createElement('canvas'); bloomCacheA.set(canvas, offA); }
  if (offA.width !== W1 || offA.height !== H1) { offA.width = W1; offA.height = H1; }
  const ctxA = offA.getContext('2d')!;
  ctxA.imageSmoothingEnabled = true;
  ctxA.globalCompositeOperation = 'source-over';
  ctxA.globalAlpha = 1;
  ctxA.clearRect(0, 0, W1, H1);
  ctxA.drawImage(canvas, 0, 0, W, H, 0, 0, W1, H1);

  // Second pass: ~1/5 res — this is the blurred bloom source
  const scale2 = pixelated ? 0.2 : 0.18;
  const W2 = Math.max(6, Math.floor(W * scale2));
  const H2 = Math.max(6, Math.floor(H * scale2));
  let offB = bloomCacheB.get(canvas);
  if (!offB) { offB = document.createElement('canvas'); bloomCacheB.set(canvas, offB); }
  if (offB.width !== W2 || offB.height !== H2) { offB.width = W2; offB.height = H2; }
  const ctxB = offB.getContext('2d')!;
  ctxB.imageSmoothingEnabled = true;
  ctxB.globalCompositeOperation = 'source-over';
  ctxB.globalAlpha = 1;
  ctxB.clearRect(0, 0, W2, H2);
  ctxB.drawImage(offA, 0, 0, W1, H1, 0, 0, W2, H2);

  // Composite the bloom onto the main canvas additively ('lighter' = pixel-wise add).
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = intensity;
  ctx.drawImage(offB, 0, 0, W2, H2, 0, 0, W, H);
  ctx.restore();
}

// ================================================================================

export function renderRun(vp: RenderViewport, s: RunState, hoverCell: Vec2 | null): void {
  const { ctx } = vp;
  const map = getMap(s.mapId);
  ctx.save();

  // Screen shake
  let shakeX = 0, shakeY = 0;
  if (s.shakeTime > 0) {
    const a = s.shakeAmp * (s.shakeTime / 0.35);
    shakeX = (Math.random() - 0.5) * a;
    shakeY = (Math.random() - 0.5) * a;
  }
  ctx.translate(shakeX, shakeY);

  // Background
  ctx.fillStyle = map.bgColor;
  ctx.fillRect(0, 0, vp.width, vp.height);

  drawBackgroundPattern(ctx, vp, map, s.elapsed);
  drawPacketTraces(ctx, vp, map, s.elapsed);
  drawScanningRing(ctx, vp, map, s.elapsed);
  drawGrid(ctx, vp, map);
  drawGridEnergize(ctx, vp, s);
  drawPaths(ctx, vp, map, s.elapsed);
  drawEndPortal(ctx, vp, map, s.elapsed);

  // Range preview for selected tower
  const sel = s.selection;
  if (sel.kind === 'tower') {
    const t = s.towers.find((x) => x.id === sel.towerId);
    if (t) drawRangeCircle(ctx, vp, t.grid, effectiveRange(s, t), TOWERS[t.def].accentColor);
  }
  if (sel.kind === 'placing') {
    // Highlight all valid placement cells with a soft green glow so player sees where they can place.
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#00ff88';
    for (let y = 0; y < map.rows; y++) {
      for (let x = 0; x < map.cols; x++) {
        if (canPlaceAt(s, { x, y })) {
          ctx.fillRect(x * vp.cellSize, y * vp.cellSize, vp.cellSize, vp.cellSize);
        }
      }
    }
    ctx.restore();
    if (hoverCell) {
      const def = TOWERS[sel.def];
      const valid = canPlaceAt(s, hoverCell);
      drawPlacementGhost(ctx, vp, hoverCell, def.id, def.range * (1 + s.mods.globalRangePct), valid);
    }
  }

  // Puddles (under towers/enemies)
  drawPuddles(ctx, vp, s);

  // Sentinel aura (drawn below towers)
  for (const t of s.towers) { if (t.def === 'sentinel') drawSentinelAura(ctx, vp, t, s); }

  // Subnet links — connecting glow lines between adjacent turrets, drawn under towers.
  drawSubnetLinks(ctx, vp, s);

  // Towers
  for (const t of s.towers) { drawTower(ctx, vp, t); drawTowerDebuffs(ctx, vp, t, s.elapsed); }

  // Priority-kill markers: LEECH tethers + saturated pulsing ring on LEECH/PARASITE.
  // Drawn before enemies so the ring halos sit behind the sprite.
  drawPriorityMarkers(ctx, vp, s);

  // Enemies (with mark overlay)
  for (const e of s.enemies) { drawEnemy(ctx, vp, e, s.elapsed); if ((e.marked ?? 0) > 0) drawMark(ctx, vp, e); }

  // Projectiles
  for (const p of s.projectiles) drawProjectile(ctx, vp, p);

  // Particles
  drawParticles(ctx, vp, s);

  // Floaters
  drawFloaters(ctx, vp, s);

  // Scanline overlay disabled — interacts poorly with the additive bloom pass
  // on dark map backgrounds. CSS-layer scanlines in index.html already provide
  // the CRT feel without touching the game canvas. Leaving the function defined
  // so we can re-enable it after moving it outside the bloom-eligible layer.

  ctx.restore();
}

// Priority-kill signalling — LEECH/PARASITE get a saturated magenta pulse ring
// so the player's eye lands on them before stats are read. LEECH additionally
// draws a tether beam to the nearest other enemy (the ally it's healing).
function drawPriorityMarkers(ctx: CanvasRenderingContext2D, vp: RenderViewport, s: RunState): void {
  const cs = vp.cellSize;
  const now = performance.now() / 1000;
  ctx.save();
  for (const e of s.enemies) {
    if (!e.alive) continue;
    if (e.def !== 'leech' && e.def !== 'parasite') continue;
    const cx = e.pos.x * cs + cs / 2;
    const cy = e.pos.y * cs + cs / 2;
    const size = cs * e.size;
    // Pulsing priority ring
    const pulse = 0.55 + 0.45 * Math.sin(now * 6 + e.id);
    ctx.globalAlpha = 0.8 * pulse;
    ctx.strokeStyle = '#ff2d95';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ff2d95';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    // LEECH tether beam to nearest ally enemy.
    if (e.def === 'leech') {
      let best: EnemyInstance | null = null; let bestD = Infinity;
      for (const o of s.enemies) {
        if (!o.alive || o.id === e.id) continue;
        const d = Math.hypot(o.pos.x - e.pos.x, o.pos.y - e.pos.y);
        if (d < bestD) { bestD = d; best = o; }
      }
      if (best && bestD < 4) {
        const bx = best.pos.x * cs + cs / 2;
        const by = best.pos.y * cs + cs / 2;
        ctx.globalAlpha = 0.55 + 0.35 * Math.sin(now * 8 + e.id);
        ctx.strokeStyle = '#3eff9c';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function drawScanlines(ctx: CanvasRenderingContext2D, vp: RenderViewport): void {
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = '#000000';
  for (let y = 0; y < vp.height; y += 2) {
    ctx.fillRect(0, y, vp.width, 1);
  }
  ctx.restore();
}

// Packet-trace lines — 3 pseudo-random pulses sliding across the background every
// few seconds. Each pulse is a thin bright line ~100px long traveling along a
// randomized diagonal, seeded by integer division of elapsed time so each cycle
// feels different without tracking state.
function drawPacketTraces(ctx: CanvasRenderingContext2D, vp: RenderViewport, map: MapDef, t: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  const periods = [3.2, 4.1, 5.7];
  for (let i = 0; i < periods.length; i++) {
    const period = periods[i];
    const phase = (t + i * 1.3) % period;
    const progress = phase / period;
    const cycleIdx = Math.floor((t + i * 1.3) / period) + i * 17;
    // Seeded pseudo-random start/end points from cycleIdx so each cycle is different.
    const h = (n: number) => {
      const x = Math.sin(n * 127.1 + i * 311.7) * 43758.5453;
      return x - Math.floor(x);
    };
    const sx = h(cycleIdx) * vp.width;
    const sy = h(cycleIdx * 2.3) * vp.height;
    const ex = h(cycleIdx * 3.7) * vp.width;
    const ey = h(cycleIdx * 5.1) * vp.height;
    const hx = sx + (ex - sx) * progress;
    const hy = sy + (ey - sy) * progress;
    const trailLen = 0.18;
    const tx = sx + (ex - sx) * Math.max(0, progress - trailLen);
    const ty = sy + (ey - sy) * Math.max(0, progress - trailLen);
    ctx.globalAlpha = 0.4 * (1 - Math.abs(progress - 0.5) * 1.8);
    ctx.strokeStyle = map.accentColor;
    ctx.lineWidth = 1;
    ctx.shadowColor = map.accentColor;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(hx, hy);
    ctx.stroke();
  }
  ctx.restore();
}

// Scanning ring pulse — every ~7s a concentric ring expands from the map center.
// Signals "system is alive" without stealing attention from combat.
function drawScanningRing(ctx: CanvasRenderingContext2D, vp: RenderViewport, map: MapDef, t: number): void {
  // Guard: on the very first frame s.elapsed can be slightly negative due to
  // raf timing jitter, which makes `t % 7` negative → negative radius → arc
  // throws IndexSizeError and the rest of renderRun is skipped, leaving the
  // canvas transparent. Clamp phase to [0, period) and skip when out of the
  // 1.6s active window.
  const period = 7;
  const phase = ((t % period) + period) % period;
  if (phase > 1.6) return;
  const progress = phase / 1.6;
  const cx = vp.width / 2;
  const cy = vp.height / 2;
  const maxR = Math.hypot(vp.width, vp.height) * 0.55;
  const r = Math.max(0, progress * maxR);
  if (r <= 0) return;
  ctx.save();
  ctx.globalAlpha = 0.35 * (1 - progress);
  ctx.strokeStyle = map.secondaryColor;
  ctx.lineWidth = 2;
  ctx.shadowColor = map.secondaryColor;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// Grid energize — a firing tower lights up its 8 neighboring cells with a faint
// pulse driven by its fireFlash timer. Ties combat events to the world surface.
function drawGridEnergize(ctx: CanvasRenderingContext2D, vp: RenderViewport, s: RunState): void {
  const cs = vp.cellSize;
  ctx.save();
  for (const t of s.towers) {
    if (t.fireFlash <= 0) continue;
    const intensity = Math.min(1, t.fireFlash / 0.18);
    ctx.globalAlpha = 0.18 * intensity;
    ctx.fillStyle = TOWERS[t.def].accentColor;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const gx = t.grid.x + dx;
        const gy = t.grid.y + dy;
        if (gx < 0 || gy < 0) continue;
        ctx.fillRect(gx * cs, gy * cs, cs, cs);
      }
    }
  }
  ctx.restore();
}

function drawBackgroundPattern(ctx: CanvasRenderingContext2D, vp: RenderViewport, map: MapDef, t: number): void {
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = map.secondaryColor;
  ctx.lineWidth = 1;
  const sp = vp.cellSize * 2;
  const offset = (t * 8) % sp;
  ctx.beginPath();
  for (let x = -sp + offset; x < vp.width + sp; x += sp) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x + vp.height, vp.height);
  }
  ctx.stroke();
  ctx.restore();
}

function drawGrid(ctx: CanvasRenderingContext2D, vp: RenderViewport, map: MapDef): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= map.cols; x++) {
    ctx.beginPath(); ctx.moveTo(x * vp.cellSize, 0); ctx.lineTo(x * vp.cellSize, vp.height); ctx.stroke();
  }
  for (let y = 0; y <= map.rows; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * vp.cellSize); ctx.lineTo(vp.width, y * vp.cellSize); ctx.stroke();
  }
  ctx.restore();
}

function drawPaths(ctx: CanvasRenderingContext2D, vp: RenderViewport, map: MapDef, t: number): void {
  const cs = vp.cellSize;
  // Glow halo
  for (const p of map.paths) {
    ctx.save();
    ctx.strokeStyle = map.accentColor;
    ctx.globalAlpha = 0.2;
    ctx.lineWidth = cs * 0.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < p.points.length; i++) {
      const pt = p.points[i];
      const x = pt.x * cs + cs / 2;
      const y = pt.y * cs + cs / 2;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }
  // Main path
  for (const p of map.paths) {
    ctx.save();
    ctx.strokeStyle = '#05060a';
    ctx.lineWidth = cs * 0.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < p.points.length; i++) {
      const pt = p.points[i];
      const x = pt.x * cs + cs / 2;
      const y = pt.y * cs + cs / 2;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Animated dashed center line
    ctx.strokeStyle = map.accentColor;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 2;
    ctx.setLineDash([cs * 0.35, cs * 0.35]);
    ctx.lineDashOffset = -((t * cs * 1.2) % (cs * 0.7));
    ctx.beginPath();
    for (let i = 0; i < p.points.length; i++) {
      const pt = p.points[i];
      const x = pt.x * cs + cs / 2;
      const y = pt.y * cs + cs / 2;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

function drawEndPortal(ctx: CanvasRenderingContext2D, vp: RenderViewport, map: MapDef, t: number): void {
  // Entry portals (cyan) and core at the end of each path
  for (const p of map.paths) {
    const startPt = p.points[0];
    drawPortal(ctx, vp, startPt, '#00fff0', t, false);
  }
  // The "core" - end of first path
  const endPt = map.paths[0].points[map.paths[0].points.length - 1];
  drawCore(ctx, vp, endPt, t);
}

function drawPortal(ctx: CanvasRenderingContext2D, vp: RenderViewport, g: Vec2, color: string, t: number, isEnd: boolean): void {
  const cs = vp.cellSize;
  const cx = g.x * cs + cs / 2;
  const cy = g.y * cs + cs / 2;
  ctx.save();
  // Slow expanding rings — 1 full cycle per ~1.8 seconds, with 3 rings phased for a steady, calm pulse.
  for (let i = 0; i < 3; i++) {
    const phase = ((t * 0.55 + i * 0.33) % 1 + 1) % 1;
    const r = Math.max(0, phase * cs * 0.85);
    ctx.globalAlpha = (1 - phase) * 0.8;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Subtle center pulse (slow)
  const centerPulse = 3.5 + Math.sin(t * 1.6) * 1.2;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(cx, cy, centerPulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCore(ctx: CanvasRenderingContext2D, vp: RenderViewport, g: Vec2, t: number): void {
  const cs = vp.cellSize;
  const cx = g.x * cs + cs / 2;
  const cy = g.y * cs + cs / 2;
  ctx.save();
  ctx.shadowColor = '#ff2d95';
  ctx.shadowBlur = 20;
  // outer rotating ring
  ctx.strokeStyle = '#ff2d95';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, cs * 0.6, t * 0.8, t * 0.8 + Math.PI * 1.5);
  ctx.stroke();
  // Inner pulse (slow)
  const pulse = 0.9 + Math.sin(t * 1.8) * 0.08;
  ctx.fillStyle = '#ff2d95';
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(cx, cy, cs * 0.35 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(cx, cy, cs * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRangeCircle(ctx: CanvasRenderingContext2D, vp: RenderViewport, g: Vec2, range: number, color: string): void {
  const cs = vp.cellSize;
  const cx = g.x * cs + cs / 2;
  const cy = g.y * cs + cs / 2;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.setLineDash([4, 4]);
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, range * cs, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawPlacementGhost(ctx: CanvasRenderingContext2D, vp: RenderViewport, g: Vec2, id: string, range: number, valid: boolean): void {
  const cs = vp.cellSize;
  const cx = g.x * cs + cs / 2;
  const cy = g.y * cs + cs / 2;
  const accent = valid ? '#00ff88' : '#ff3355';
  ctx.save();
  // Pulsing cell backdrop — bright and hard to miss
  const pulse = 0.5 + 0.25 * Math.sin(performance.now() / 180);
  ctx.globalAlpha = pulse * 0.6;
  ctx.fillStyle = accent;
  ctx.fillRect(g.x * cs, g.y * cs, cs, cs);
  ctx.globalAlpha = 1;
  // Sprite preview — 80% opacity so it's clearly visible
  ctx.globalAlpha = 0.8;
  const sprite = getTowerSprite(id as any);
  if (sprite) ctx.drawImage(sprite, cx - cs * 0.45, cy - cs * 0.45, cs * 0.9, cs * 0.9);
  ctx.globalAlpha = 1;
  // Range circle
  drawRangeCircle(ctx, vp, g, range, accent);
  // Thick cell border
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(g.x * cs + 1.5, g.y * cs + 1.5, cs - 3, cs - 3);
  ctx.restore();
}

function effectiveRange(s: RunState, t: TowerInstance): number {
  const def = TOWERS[t.def];
  const specific = s.mods.towerRange[t.def] ?? 0;
  return def.range * (1 + s.mods.globalRangePct + specific);
}

export function canPlaceAt(s: RunState, g: Vec2): boolean {
  const map = getMap(s.mapId);
  if (g.x < 0 || g.y < 0 || g.x >= map.cols || g.y >= map.rows) return false;
  if (isPathCell(map, g.x, g.y)) return false;
  for (const t of s.towers) if (t.grid.x === g.x && t.grid.y === g.y) return false;
  return true;
}

// Subnet links: glowing connection lines between adjacent turrets. Color and
// thickness scale with the subnet's diversity so a stronger subnet reads at a glance.
function drawSubnetLinks(ctx: CanvasRenderingContext2D, vp: RenderViewport, s: RunState): void {
  if (s.towers.length < 2) return;
  const cs = vp.cellSize;
  const pulse = 0.65 + 0.35 * Math.sin(performance.now() / 320);
  ctx.save();
  for (let i = 0; i < s.towers.length; i++) {
    const a = s.towers[i];
    for (let j = i + 1; j < s.towers.length; j++) {
      const b = s.towers[j];
      if (Math.abs(a.grid.x - b.grid.x) > 1 || Math.abs(a.grid.y - b.grid.y) > 1) continue;
      const mult = a.extras.subnetMult ?? 1;
      const types = a.extras.subnetTypes ?? 1;
      // Color shifts cyan → magenta as the subnet gets more diverse.
      const t = Math.min(1, (types - 1) / 4);
      const r = Math.round(0 + t * 255);
      const g = Math.round(255 - t * 210);
      const blue = Math.round(240 - t * 90);
      const color = `rgba(${r},${g},${blue},${0.5 * pulse})`;
      const width = 1.5 + (mult - 1) * 4;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10 + (mult - 1) * 18;
      const ax = a.grid.x * cs + cs / 2;
      const ay = a.grid.y * cs + cs / 2;
      const bx = b.grid.x * cs + cs / 2;
      const by = b.grid.y * cs + cs / 2;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawTower(ctx: CanvasRenderingContext2D, vp: RenderViewport, t: TowerInstance): void {
  const cs = vp.cellSize;
  const cx = t.grid.x * cs + cs / 2;
  // Sub-pixel idle bob — ~1px vertical sway every ~1.3s, per-tower phase offset
  // so a cluster doesn't bob in lockstep. Zero while firing so the recoil
  // animation reads cleanly.
  const now = performance.now() / 1000;
  const idlePhase = t.id * 0.73;
  const idleBob = t.fireFlash > 0 ? 0 : Math.sin(now * 4.8 + idlePhase) * 0.9;
  const cy = t.grid.y * cs + cs / 2 + idleBob;
  const def = TOWERS[t.def];
  const sprite = getTowerSprite(t.def);

  ctx.save();
  // Overdrive state ring — drawn under the halo so it reads as a status indicator.
  const odActive = (t.extras.overdriveActive ?? 0) > 0;
  const odOffline = (t.extras.overdriveOffline ?? 0) > 0;
  if (odActive || odOffline) {
    const ringColor = odActive ? '#ffd600' : '#ff3355';
    const pulse = 0.55 + 0.45 * Math.sin(performance.now() / 90);
    ctx.save();
    ctx.globalAlpha = (odActive ? 0.85 : 0.55) * pulse;
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = ringColor;
    ctx.shadowBlur = odActive ? 22 : 10;
    ctx.beginPath();
    ctx.arc(cx, cy, cs * 0.48, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  // Glow halo underneath
  ctx.globalAlpha = 0.4;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cs * 0.55);
  grad.addColorStop(0, def.accentColor);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(t.grid.x * cs, t.grid.y * cs, cs, cs);
  ctx.globalAlpha = 1;

  // Sprite — rotate only when tracking a target so idle towers look stable
  if (sprite) {
    ctx.save();
    ctx.translate(cx, cy);
    if (t.targetId != null) ctx.rotate(t.angle + Math.PI / 2);
    // Barrel recoil on fire
    const recoilPct = t.fireFlash > 0 ? (t.fireFlash / 0.18) : 0;
    if (recoilPct > 0) {
      const recoilDist = cs * 0.07 * recoilPct;
      ctx.translate(-Math.sin(t.angle + Math.PI / 2) * recoilDist, Math.cos(t.angle + Math.PI / 2) * recoilDist);
      ctx.shadowColor = def.accentColor;
      ctx.shadowBlur = 28 + recoilPct * 20;
    }
    const s = cs * 0.9;
    ctx.drawImage(sprite, -s / 2, -s / 2, s, s);
    // Charge-up tell for slow DPS turrets — when cooldown is in the last 200ms
    // before fire, brighten a halo around the sprite so the player sees the
    // windup. Only applied to slow firers where the tell is readable.
    const SLOW_FIRERS: Record<string, number> = { railgun: 4.0, sniper: 5.5, mine: 1.8, antivirus: 1.8 };
    const maxCd = SLOW_FIRERS[t.def];
    if (maxCd && t.targetId != null && t.cooldown > 0 && t.cooldown < 0.25) {
      const chargePct = 1 - (t.cooldown / 0.25); // 0 → 1 as we approach fire
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = 0.35 * chargePct;
      ctx.fillStyle = def.accentColor;
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
    // Muzzle flash — per-tower style
    if (t.fireFlash > 0) drawMuzzleFlash(ctx, vp, t, recoilPct);
  } else {
    // Fallback: draw a colored diamond so we always see SOMETHING
    ctx.fillStyle = def.accentColor;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - cs * 0.35);
    ctx.lineTo(cx + cs * 0.35, cy);
    ctx.lineTo(cx, cy + cs * 0.35);
    ctx.lineTo(cx - cs * 0.35, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Level indicator dots
  for (let i = 0; i < t.level; i++) {
    ctx.fillStyle = def.accentColor;
    ctx.beginPath();
    ctx.arc(t.grid.x * cs + cs - 6 - i * 5, t.grid.y * cs + cs - 6, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMuzzleFlash(ctx: CanvasRenderingContext2D, vp: RenderViewport, t: TowerInstance, intensity: number): void {
  const cs = vp.cellSize;
  const cx = t.grid.x * cs + cs / 2;
  const cy = t.grid.y * cs + cs / 2;
  const def = TOWERS[t.def];
  // Barrel tip position — project outward along firing angle
  const barrelLen = cs * 0.48;
  const ang = t.angle + Math.PI / 2;
  const tipX = cx + Math.cos(ang) * barrelLen;
  const tipY = cy + Math.sin(ang) * barrelLen;
  ctx.save();
  ctx.globalAlpha = intensity * 0.9;

  if (t.def === 'sniper') {
    // Long bright laser streak forward
    ctx.strokeStyle = def.accentColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = def.accentColor;
    ctx.shadowBlur = 20;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX + Math.cos(ang) * cs * 0.9, tipY + Math.sin(ang) * cs * 0.9);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX + Math.cos(ang) * cs * 0.9, tipY + Math.sin(ang) * cs * 0.9);
    ctx.stroke();

  } else if (t.def === 'railgun') {
    // Wide explosive flash + streak
    ctx.shadowColor = def.accentColor;
    ctx.shadowBlur = 35;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(tipX, tipY, cs * 0.14 * intensity, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = def.accentColor;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX + Math.cos(ang) * cs * 1.1, tipY + Math.sin(ang) * cs * 1.1);
    ctx.stroke();

  } else if (t.def === 'chain') {
    // Jagged electric fork
    ctx.strokeStyle = def.accentColor;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = def.accentColor;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    let fx = tipX, fy = tipY;
    for (let i = 0; i < 4; i++) {
      fx += Math.cos(ang) * cs * 0.15 + (Math.random() - 0.5) * cs * 0.18;
      fy += Math.sin(ang) * cs * 0.15 + (Math.random() - 0.5) * cs * 0.18;
      ctx.lineTo(fx, fy);
    }
    ctx.stroke();

  } else if (t.def === 'pulse') {
    // Expanding concentric rings (AoE burst feel)
    ctx.strokeStyle = def.accentColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = def.accentColor;
    ctx.shadowBlur = 18;
    for (let i = 0; i < 2; i++) {
      const r = cs * (0.2 + i * 0.18) * intensity;
      ctx.globalAlpha = intensity * (0.8 - i * 0.3);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

  } else if (t.def === 'scrambler') {
    // Pink static discharge starburst
    ctx.strokeStyle = def.accentColor;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = def.accentColor;
    ctx.shadowBlur = 12;
    const rays = 6;
    for (let i = 0; i < rays; i++) {
      const ra = ang + (i / rays) * Math.PI * 2;
      const len = cs * (0.12 + Math.random() * 0.15) * intensity;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX + Math.cos(ra) * len, tipY + Math.sin(ra) * len);
      ctx.stroke();
    }

  } else if (t.def === 'antivirus') {
    // Red cross-shaped burst
    ctx.strokeStyle = def.accentColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = def.accentColor;
    ctx.shadowBlur = 14;
    const half = cs * 0.16 * intensity;
    ctx.beginPath();
    ctx.moveTo(tipX - half, tipY); ctx.lineTo(tipX + half, tipY);
    ctx.moveTo(tipX, tipY - half); ctx.lineTo(tipX, tipY + half);
    ctx.stroke();

  } else if (t.def === 'quantum') {
    // Spiral particle rings
    ctx.shadowColor = def.accentColor;
    ctx.shadowBlur = 20;
    ctx.fillStyle = def.accentColor;
    for (let i = 0; i < 5; i++) {
      const pa = ang + (i / 5) * Math.PI * 2;
      const pr = cs * 0.18 * intensity;
      const px = tipX + Math.cos(pa) * pr;
      const py = tipY + Math.sin(pa) * pr;
      ctx.globalAlpha = intensity * 0.7;
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

  } else {
    // Default: compact directional flash
    ctx.shadowColor = def.accentColor;
    ctx.shadowBlur = 18;
    ctx.fillStyle = def.accentColor;
    ctx.beginPath();
    ctx.arc(tipX, tipY, cs * 0.1 * intensity, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = intensity * 0.6;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX + Math.cos(ang) * cs * 0.3, tipY + Math.sin(ang) * cs * 0.3);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTowerDebuffs(ctx: CanvasRenderingContext2D, vp: RenderViewport, t: TowerInstance, elapsed: number): void {
  if (t.debuffs.length === 0) return;
  const cs = vp.cellSize;
  const cx = t.grid.x * cs + cs / 2;
  const cy = t.grid.y * cs + cs / 2;
  ctx.save();
  const pulse = 0.6 + 0.4 * Math.abs(Math.sin(elapsed * 5));
  for (let i = 0; i < t.debuffs.length; i++) {
    const d = t.debuffs[i];
    const color = d.kind === 'jammed' ? '#ff6b00' : '#a800ff';
    ctx.globalAlpha = pulse * 0.8;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, cs * 0.52 + i * 4, 0, Math.PI * 2);
    ctx.stroke();
    // Icon label
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.round(cs * 0.28)}px monospace`;
    ctx.textAlign = 'center';
    ctx.shadowBlur = 6;
    ctx.fillText(d.kind === 'jammed' ? '⚡' : '☣', cx, cy - cs * 0.4 - i * 10);
  }
  ctx.restore();
}

// VOIDLORD phase-shift color per damage type — read in drawEnemy to tint sprite
// and draw matching ground aura so the player can identify the current immunity
// at a glance from anywhere on the map.
const PHASE_SHIFT_COLOR: Record<string, string> = {
  kinetic: '#ff3355',
  energy:  '#00fff0',
  aoe:     '#ff9933',
  chain:   '#b847ff',
  pierce:  '#00ff88',
};

function drawEnemy(ctx: CanvasRenderingContext2D, vp: RenderViewport, e: EnemyInstance, t: number): void {
  const cs = vp.cellSize;
  // Per-enemy walk animation variation
  let bob = 0;
  let sway = 0;
  let scaleX = 1, scaleY = 1;
  if (e.def === 'juggernaut') {
    // Slow heavy stomp — big thud every 0.4 progress units, squash on impact
    const stompCycle = (e.progress * 2.5) % 1;
    bob = stompCycle < 0.15 ? -0.07 * (1 - stompCycle / 0.15) : 0;
    scaleX = 1 + (stompCycle < 0.15 ? 0.08 * (stompCycle / 0.15) : 0);
    scaleY = 1 - (stompCycle < 0.15 ? 0.06 * (stompCycle / 0.15) : 0);
  } else if (e.def === 'glitch') {
    // Digital jitter — random-feeling snap offsets
    const jitterPhase = Math.floor(t * 12 + e.id * 3.7);
    sway = ((jitterPhase * 1337) % 7 - 3) * 0.018;
    bob = ((jitterPhase * 2311) % 5 - 2) * 0.022;
  } else if (e.def === 'parasite') {
    // Fast dart — high-freq alternating side-to-side with forward lunge
    sway = Math.sin(e.progress * 28 + e.id) * 0.05;
    bob = Math.abs(Math.sin(e.progress * 14)) * -0.04;
  } else if (e.isBoss) {
    const bobFreq = 3.2;
    const bobAmp = 0.06;
    bob = Math.sin(e.progress * bobFreq + e.id * 0.7) * bobAmp;
  } else {
    const bobFreq = 6.5;
    const bobAmp = 0.035;
    bob = Math.sin(e.progress * bobFreq + e.id * 0.7) * bobAmp;
  }
  const cx = e.pos.x * cs + cs / 2 + sway * cs;
  const cy = (e.pos.y + bob) * cs + cs / 2;
  const def = ENEMIES[e.def];
  const size = cs * e.size;

  ctx.save();
  // Boss spawn aura — big pulsing ring under any boss while they're in the
  // first ~8% of their path. Telegraphs arrival and draws the eye. Stacks
  // cleanly under the VOIDLORD immunity aura.
  if (e.isBoss && e.progress < 0.08) {
    const spawnT = e.progress / 0.08;
    const auraAlpha = (1 - spawnT) * 0.6;
    const ringR = size * (0.6 + spawnT * 0.8);
    ctx.save();
    ctx.globalAlpha = auraAlpha;
    ctx.strokeStyle = def.accent;
    ctx.lineWidth = 3;
    ctx.shadowColor = def.accent;
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.stroke();
    // Ground reticle rings — two concentric pulses
    ctx.globalAlpha = auraAlpha * 0.6;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy + size * 0.35, ringR * 1.1, ringR * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  // VOIDLORD ground aura — pulsing ellipse in the current immunity color.
  // Drawn BEFORE the sprite so it sits under the boss. 40% opacity, 1s pulse.
  if (e.phaseShiftType && e.def === 'voidlord') {
    const auraColor = PHASE_SHIFT_COLOR[e.phaseShiftType] ?? '#ffffff';
    const pulse = 0.7 + 0.3 * Math.sin(t * 4);
    ctx.save();
    ctx.globalAlpha = 0.38 * pulse;
    ctx.fillStyle = auraColor;
    ctx.shadowColor = auraColor;
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.ellipse(cx, cy + size * 0.28, size * 0.85, size * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Invisibility fade (stealth)
  let alpha = 1;
  if (def.invisChance) {
    const flicker = (Math.sin(t * 3 + e.id) + 1) / 2;
    alpha = flicker < def.invisChance ? 0.25 : 1;
  }
  ctx.globalAlpha = alpha;

  // Shadow is baked into each enemy's SVG sprite (varies per enemy — worm shadow
  // is long+thin, spider's is round, etc.) and rotates with the sprite. A
  // canvas-level shadow used to be drawn here at a fixed world offset, but it
  // didn't rotate with the sprite, producing a visible mismatch whenever an
  // enemy turned — especially on vertical path segments.

  // Hit flash glow
  if (e.hitFlash > 0) {
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 20 * (e.hitFlash / 0.18);
  }

  const sprite = getEnemySprite(e.def);
  if (sprite) {
    const isCritFlash = e.hitFlash > 0.22;
    const splitAmt = isCritFlash ? 2 : 0;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(e.angle + (def.spriteAngleOffset ?? 0));
    ctx.scale(scaleX, scaleY);
    if (splitAmt > 0) {
      // RGB chromatic split for crit hits — brief 1-2 frames.
      const prevOp = ctx.globalCompositeOperation;
      const prevAlpha = ctx.globalAlpha;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      ctx.filter = 'hue-rotate(-30deg) saturate(3)';
      ctx.drawImage(sprite, -size / 2 - splitAmt, -size / 2, size, size);
      ctx.filter = 'hue-rotate(180deg) saturate(3)';
      ctx.drawImage(sprite, -size / 2 + splitAmt, -size / 2, size, size);
      ctx.filter = 'none';
      ctx.globalCompositeOperation = prevOp;
      ctx.globalAlpha = prevAlpha;
    }
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
    // BOMBER detonation windup — when HP drops below 30%, pulse red→white so
    // the player knows to finish it fast. Visual-only telegraph; the "detonates
    // on death" lore sells itself through the pulse.
    if (e.def === 'bomber' && e.hp / e.maxHp < 0.3) {
      const urgency = 1 - (e.hp / e.maxHp) / 0.3; // 0 → 1 as HP drops
      const strobe = (Math.sin(t * (12 + urgency * 20)) + 1) / 2;
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = 0.35 + strobe * 0.45 * urgency;
      ctx.fillStyle = strobe > 0.5 ? '#ffffff' : '#ff3355';
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    // Digital-entity motif: scanline corruption band slides vertically across
    // the sprite of unstable/phased enemies. Applied to PHANTOM, WRAITH, GLITCH,
    // CORRUPTOR. Sells "program running" without generic Matrix rain.
    if (e.def === 'phantom' || e.def === 'wraith' || e.def === 'glitch' || e.def === 'corruptor') {
      const bandCycle = (t * 0.55 + e.id * 0.17) % 1;
      const bandY = -size / 2 + bandCycle * size;
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = e.def === 'corruptor' ? '#ff2d95' : '#00fff0';
      ctx.fillRect(-size / 2, bandY, size, 2);
      // Second thinner trailing band for glitch feel.
      ctx.globalAlpha = 0.25;
      ctx.fillRect(-size / 2, bandY + 4, size, 1);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    // VOIDLORD body tint — soft fill in the active immunity color, applied via
    // source-atop so only opaque sprite pixels are tinted. 35% alpha so the
    // sprite detail still reads through.
    if (e.phaseShiftType && e.def === 'voidlord') {
      const tint = PHASE_SHIFT_COLOR[e.phaseShiftType] ?? '#ffffff';
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = tint;
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    // White-tint hit flash — fills the sprite's opaque pixels with white during
    // the first ~40ms after a hit. Source-atop clips the fill to the sprite
    // silhouette so it never spills into background pixels. Fades out fast.
    if (e.hitFlash > 0.12) {
      const flashAlpha = Math.min(1, (e.hitFlash - 0.12) * 12);
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha.toFixed(3)})`;
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }
  // Always draw a colored body circle as baseline so enemies are always visible
  if (!sprite) {
    ctx.fillStyle = def.color;
    ctx.strokeStyle = def.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Juggernaut stomp ground ring
  if (e.def === 'juggernaut') {
    const stompCycle = (e.progress * 2.5) % 1;
    if (stompCycle < 0.2) {
      const ringAlpha = (1 - stompCycle / 0.2) * 0.6;
      const ringR = size * (0.4 + stompCycle * 1.5);
      ctx.save();
      ctx.globalAlpha = ringAlpha;
      ctx.strokeStyle = '#ff6600';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ff6600';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(cx, cy + size * 0.3, ringR, ringR * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Slow tint overlay
  if (e.speedMult < 1) {
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#00aaff';
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // HP bar
  const hpPct = Math.max(0, e.hp / e.maxHp);
  const barW = Math.max(size * 0.7, 16);
  const barH = e.isBoss ? 6 : 3;
  const bx = cx - barW / 2;
  const by = cy - size * 0.55;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
  ctx.fillStyle = hpPct > 0.5 ? '#00ff88' : hpPct > 0.25 ? '#ffd600' : '#ff3355';
  ctx.fillRect(bx, by, barW * hpPct, barH);
  ctx.restore();
}

function drawProjectile(ctx: CanvasRenderingContext2D, vp: RenderViewport, p: Projectile): void {
  const cs = vp.cellSize;
  const cx = p.pos.x * cs + cs / 2;
  const cy = p.pos.y * cs + cs / 2;
  ctx.save();

  if (p.fromTower === 'honeypot') {
    // Fat green goo blob with thick dripping trail
    ctx.lineCap = 'round';
    if (p.trail.length > 0) {
      ctx.lineWidth = 9;
      ctx.strokeStyle = p.trailColor;
      ctx.globalAlpha = 0.5;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      const tp0 = p.trail[0];
      ctx.moveTo(tp0.x * cs + cs / 2, tp0.y * cs + cs / 2);
      for (let i = 1; i < p.trail.length; i++) {
        const tp = p.trail[i];
        ctx.lineTo(tp.x * cs + cs / 2, tp.y * cs + cs / 2);
      }
      ctx.lineTo(cx, cy);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 22;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(cx - 2, cy - 2, 3, 0, Math.PI * 2);
    ctx.fill();

  } else if (p.fromTower === 'chain') {
    // Electric zigzag bolt — thick with bright white core
    if (p.trail.length > 0) {
      // Outer glow pass
      ctx.lineWidth = 5;
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = 0.5;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      const t0 = p.trail[0];
      ctx.moveTo(t0.x * cs + cs / 2, t0.y * cs + cs / 2);
      for (let i = 1; i < p.trail.length; i++) {
        const tp = p.trail[i];
        ctx.lineTo(tp.x * cs + cs / 2 + (Math.random() - 0.5) * 12, tp.y * cs + cs / 2 + (Math.random() - 0.5) * 12);
      }
      ctx.lineTo(cx, cy);
      ctx.stroke();
      // White inner core
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.9;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(t0.x * cs + cs / 2, t0.y * cs + cs / 2);
      for (let i = 1; i < p.trail.length; i++) {
        const tp = p.trail[i];
        ctx.lineTo(tp.x * cs + cs / 2 + (Math.random() - 0.5) * 6, tp.y * cs + cs / 2 + (Math.random() - 0.5) * 6);
      }
      ctx.lineTo(cx, cy);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

  } else if (p.fromTower === 'sniper') {
    // Long green laser beam — thinner than railgun, with green glow
    if (p.trail.length > 0) {
      ctx.lineWidth = 5;
      ctx.strokeStyle = p.trailColor;
      ctx.globalAlpha = 0.4;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 20;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const s0 = p.trail[0];
      ctx.moveTo(s0.x * cs + cs / 2, s0.y * cs + cs / 2);
      for (let i = 1; i < p.trail.length; i++) {
        const sp = p.trail[i];
        ctx.lineTo(sp.x * cs + cs / 2, sp.y * cs + cs / 2);
      }
      ctx.lineTo(cx, cy);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.9;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(s0.x * cs + cs / 2, s0.y * cs + cs / 2);
      for (let i = 1; i < p.trail.length; i++) {
        const sp = p.trail[i];
        ctx.lineTo(sp.x * cs + cs / 2, sp.y * cs + cs / 2);
      }
      ctx.lineTo(cx, cy);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 22;
    ctx.fillStyle = p.isCrit ? '#ffffff' : p.color;
    ctx.beginPath();
    ctx.arc(cx, cy, p.isCrit ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fill();

  } else if (p.fromTower === 'scrambler') {
    // Fast pink disruption bolt with jagged crackle
    if (p.trail.length > 0) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = 0.65;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      const sc0 = p.trail[0];
      ctx.moveTo(sc0.x * cs + cs / 2, sc0.y * cs + cs / 2);
      for (let i = 1; i < p.trail.length; i++) {
        const sp = p.trail[i];
        ctx.lineTo(sp.x * cs + cs / 2 + (Math.random() - 0.5) * 5, sp.y * cs + cs / 2 + (Math.random() - 0.5) * 5);
      }
      ctx.lineTo(cx, cy);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();

  } else if (p.fromTower === 'railgun') {
    // Long bright hyper-velocity streak with white-hot core
    if (p.trail.length > 0) {
      // Wide glow beam
      ctx.lineWidth = 7;
      ctx.strokeStyle = p.trailColor;
      ctx.globalAlpha = 0.45;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 30;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const r0 = p.trail[0];
      ctx.moveTo(r0.x * cs + cs / 2, r0.y * cs + cs / 2);
      for (let i = 1; i < p.trail.length; i++) {
        const rp = p.trail[i];
        ctx.lineTo(rp.x * cs + cs / 2, rp.y * cs + cs / 2);
      }
      ctx.lineTo(cx, cy);
      ctx.stroke();
      // Bright white core
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.95;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(r0.x * cs + cs / 2, r0.y * cs + cs / 2);
      for (let i = 1; i < p.trail.length; i++) {
        const rp = p.trail[i];
        ctx.lineTo(rp.x * cs + cs / 2, rp.y * cs + cs / 2);
      }
      ctx.lineTo(cx, cy);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 28;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();

  } else {
    // Default: colored dot with glowing trail — size/glow varies by tower
    const headR = p.fromTower === 'antivirus' ? 4 : p.fromTower === 'quantum' ? 4.5 : p.isCrit ? 5 : 3.5;
    const glowBlur = p.fromTower === 'quantum' ? 18 : p.fromTower === 'antivirus' ? 14 : 12;
    ctx.strokeStyle = p.trailColor;
    ctx.lineWidth = p.fromTower === 'quantum' ? 4 : 3;
    ctx.globalAlpha = 0.65;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = glowBlur * 0.5;
    ctx.beginPath();
    for (let i = 0; i < p.trail.length; i++) {
      const pt = p.trail[i];
      const x = pt.x * cs + cs / 2;
      const y = pt.y * cs + cs / 2;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.lineTo(cx, cy);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = glowBlur;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(cx, cy, headR, 0, Math.PI * 2);
    ctx.fill();
    if (p.isCrit) {
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(cx - 1, cy - 1, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawPuddles(ctx: CanvasRenderingContext2D, vp: RenderViewport, s: RunState): void {
  const cs = vp.cellSize;
  ctx.save();
  for (const pu of s.puddles) {
    const cx = pu.pos.x * cs + cs / 2;
    const cy = pu.pos.y * cs + cs / 2;
    const r = pu.radius * cs;
    const life = pu.timeLeft / pu.maxTime;
    const pulse = 0.5 + 0.15 * Math.sin(s.elapsed * 4);
    ctx.globalAlpha = life * pulse;
    const c1 = pu.color ?? '#00ff88';
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, c1 + '55');
    grad.addColorStop(0.6, c1 + '33');
    grad.addColorStop(1, '#00000000');
    ctx.fillStyle = grad;
    ctx.strokeStyle = c1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // Rim
    const rimColor = pu.color ?? '#00ff88';
    ctx.globalAlpha = life * 0.6;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = rimColor;
    ctx.shadowBlur = 8;
    ctx.stroke();
  }
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, vp: RenderViewport, s: RunState): void {
  const cs = vp.cellSize;
  ctx.save();
  for (const p of s.particles) {
    const a = p.fade === undefined ? (p.life / p.maxLife) : Math.pow(p.life / p.maxLife, p.fade);
    if (a <= 0) continue;
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.fillStyle = p.color;
    // Axis-aligned square, snapped to integer device pixels for the pixel-art grid.
    const x = Math.round(p.pos.x * cs + cs / 2);
    const y = Math.round(p.pos.y * cs + cs / 2);
    const half = Math.max(1, Math.round(p.size * 0.6));
    ctx.fillRect(x - half, y - half, half * 2, half * 2);
  }
  ctx.restore();
}

function drawSentinelAura(ctx: CanvasRenderingContext2D, vp: RenderViewport, t: TowerInstance, s: RunState): void {
  const cs = vp.cellSize;
  const cx = t.grid.x * cs + cs / 2;
  const cy = t.grid.y * cs + cs / 2;
  const def = TOWERS[t.def];
  const range = def.range * cs;
  const col = def.accentColor;
  ctx.save();

  // Affected grid cells — subtle tint so you can see which squares are in the field
  const map = getMap(s.mapId);
  const cellR = Math.ceil(def.range) + 1;
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = col;
  for (let dx = -cellR; dx <= cellR; dx++) {
    for (let dy = -cellR; dy <= cellR; dy++) {
      const gx = t.grid.x + dx;
      const gy = t.grid.y + dy;
      if (gx < 0 || gy < 0 || gx >= map.cols || gy >= map.rows) continue;
      const dist = Math.sqrt((dx + 0.5) ** 2 + (dy + 0.5) ** 2);
      if (dist > def.range) continue;
      ctx.fillRect(gx * cs + 1, gy * cs + 1, cs - 2, cs - 2);
    }
  }

  // Radar sweep — single bright arc rotating around the field
  const sweepAngle = (s.elapsed * 1.4 + t.id) % (Math.PI * 2);
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(sweepAngle);
  const sweepGrad = ctx.createLinearGradient(0, 0, range, 0);
  sweepGrad.addColorStop(0, col + '00');
  sweepGrad.addColorStop(0.6, col + '18');
  sweepGrad.addColorStop(1, col + '00');
  ctx.fillStyle = sweepGrad;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, range, -0.45, 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Range border — two concentric rings for depth
  ctx.shadowColor = col;
  ctx.shadowBlur = 8;
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.5 + 0.2 * Math.sin(s.elapsed * 2.5 + t.id);
  ctx.setLineDash([5, 5]);
  ctx.lineDashOffset = -(s.elapsed * 18) % 10;
  ctx.beginPath();
  ctx.arc(cx, cy, range, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(cx, cy, range * 0.6, 0, Math.PI * 2);
  ctx.stroke();

  // Tick marks on the border ring for a "sensor" feel
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 2;
  ctx.shadowBlur = 6;
  ctx.setLineDash([]);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + s.elapsed * 0.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (range - 5), cy + Math.sin(a) * (range - 5));
    ctx.lineTo(cx + Math.cos(a) * (range + 3), cy + Math.sin(a) * (range + 3));
    ctx.stroke();
  }

  ctx.restore();
}

function drawMark(ctx: CanvasRenderingContext2D, vp: RenderViewport, e: EnemyInstance): void {
  const cs = vp.cellSize;
  const cx = e.pos.x * cs + cs / 2;
  const cy = e.pos.y * cs + cs / 2;
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = '#ffdd00';
  ctx.shadowColor = '#ffdd00';
  ctx.shadowBlur = 8;
  ctx.lineWidth = 1.5;
  const r = e.size * cs * 0.45;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawFloaters(ctx: CanvasRenderingContext2D, vp: RenderViewport, s: RunState): void {
  const cs = vp.cellSize;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  for (const f of s.floaters) {
    const tLife = f.life / f.maxLife;
    // Damage numbers (with physics) fade only in the last 200ms; status text
    // keeps the original life-scaled fade and adds the retro upward drift.
    const hasPhysics = f.gravity !== undefined || f.vx !== undefined;
    const a = hasPhysics
      ? (f.life < 0.2 ? Math.max(0, f.life / 0.2) : 1)
      : Math.max(0, tLife);
    // Crits briefly scale up then settle for punch.
    const critAge = f.maxLife - f.life;
    const critScale = f.isCrit && critAge < 0.1 ? (1 + (1 - critAge / 0.1) * 0.25) : 1;
    ctx.globalAlpha = a;
    ctx.fillStyle = f.color;
    // Damage numbers use Press Start 2P for that crunchy pixel-arcade read.
    // Status text stays on Orbitron so wave banners etc. keep their shape.
    const pixelFont = hasPhysics ? '"Press Start 2P", "VT323", monospace' : '"Orbitron", "JetBrains Mono", monospace';
    const fontWeight = hasPhysics ? '400' : '900';
    const fontSize = hasPhysics ? f.size * critScale * 0.8 : f.size * critScale;
    ctx.font = `${fontWeight} ${fontSize}px ${pixelFont}`;
    ctx.shadowColor = f.color;
    ctx.shadowBlur = f.isCrit ? 10 : 4;
    const cx = f.pos.x * cs + cs / 2;
    const cy = f.pos.y * cs + cs / 2 + (hasPhysics ? 0 : (1 - a) * -30);
    // Outline pass for readability over busy backgrounds.
    if (f.outline) {
      ctx.shadowBlur = 0;
      ctx.lineWidth = f.isCrit ? 4 : 3;
      ctx.strokeStyle = f.outline;
      ctx.strokeText(f.text, cx, cy);
      ctx.shadowColor = f.color;
      ctx.shadowBlur = f.isCrit ? 10 : 4;
    }
    ctx.fillText(f.text, cx, cy);
  }
  ctx.restore();
}
