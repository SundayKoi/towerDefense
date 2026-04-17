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
  drawGrid(ctx, vp, map);
  drawPaths(ctx, vp, map, s.elapsed);
  drawEndPortal(ctx, vp, map, s.elapsed);

  // Range preview for selected tower
  const sel = s.selection;
  if (sel.kind === 'tower') {
    const t = s.towers.find((x) => x.id === sel.towerId);
    if (t) drawRangeCircle(ctx, vp, t.grid, effectiveRange(s, t), TOWERS[t.def].accentColor);
  }
  if (sel.kind === 'placing' && hoverCell) {
    const def = TOWERS[sel.def];
    const valid = canPlaceAt(s, hoverCell);
    drawPlacementGhost(ctx, vp, hoverCell, def.id, def.range * (1 + s.mods.globalRangePct), valid);
  }

  // Puddles (under towers/enemies)
  drawPuddles(ctx, vp, s);

  // Towers
  for (const t of s.towers) { drawTower(ctx, vp, t); drawTowerDebuffs(ctx, vp, t, s.elapsed); }

  // Enemies
  for (const e of s.enemies) drawEnemy(ctx, vp, e, s.elapsed);

  // Projectiles
  for (const p of s.projectiles) drawProjectile(ctx, vp, p);

  // Particles
  drawParticles(ctx, vp, s);

  // Floaters
  drawFloaters(ctx, vp, s);

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
    const phase = (t * 0.55 + i * 0.33) % 1;
    const r = phase * cs * 0.85;
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
  ctx.save();
  ctx.globalAlpha = 0.5;
  const sprite = getTowerSprite(id as any);
  if (sprite) ctx.drawImage(sprite, cx - cs * 0.45, cy - cs * 0.45, cs * 0.9, cs * 0.9);
  ctx.globalAlpha = 1;
  drawRangeCircle(ctx, vp, g, range, valid ? '#00ff88' : '#ff3355');
  // Cell indicator
  ctx.strokeStyle = valid ? '#00ff88' : '#ff3355';
  ctx.lineWidth = 2;
  ctx.strokeRect(g.x * cs + 2, g.y * cs + 2, cs - 4, cs - 4);
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

function drawTower(ctx: CanvasRenderingContext2D, vp: RenderViewport, t: TowerInstance): void {
  const cs = vp.cellSize;
  const cx = t.grid.x * cs + cs / 2;
  const cy = t.grid.y * cs + cs / 2;
  const def = TOWERS[t.def];
  const sprite = getTowerSprite(t.def);

  ctx.save();
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
    if (t.fireFlash > 0) {
      ctx.shadowColor = def.accentColor;
      ctx.shadowBlur = 24;
    }
    const s = cs * 0.9;
    ctx.drawImage(sprite, -s / 2, -s / 2, s, s);
    ctx.restore();
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

function drawEnemy(ctx: CanvasRenderingContext2D, vp: RenderViewport, e: EnemyInstance, t: number): void {
  const cs = vp.cellSize;
  // Walk bob — vertical sine offset based on progress for a lively gait. Bosses bob slower/bigger.
  const bobFreq = e.isBoss ? 3.2 : 6.5;
  const bobAmp = e.isBoss ? 0.06 : 0.035;
  const bob = Math.sin(e.progress * bobFreq + e.id * 0.7) * bobAmp;
  const cx = e.pos.x * cs + cs / 2;
  const cy = (e.pos.y + bob) * cs + cs / 2;
  const def = ENEMIES[e.def];
  const size = cs * e.size;

  ctx.save();
  // Invisibility fade (stealth)
  let alpha = 1;
  if (def.invisChance) {
    const flicker = (Math.sin(t * 3 + e.id) + 1) / 2;
    alpha = flicker < def.invisChance ? 0.25 : 1;
  }
  ctx.globalAlpha = alpha;

  // Shadow / footprint
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + size * 0.35, size * 0.4, size * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hit flash glow
  if (e.hitFlash > 0) {
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 20 * (e.hitFlash / 0.18);
  }

  const sprite = getEnemySprite(e.def);
  if (sprite) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(e.angle);
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
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
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;
    const cx = p.pos.x * cs + cs / 2;
    const cy = p.pos.y * cs + cs / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, p.size * a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFloaters(ctx: CanvasRenderingContext2D, vp: RenderViewport, s: RunState): void {
  const cs = vp.cellSize;
  ctx.save();
  ctx.font = 'bold 14px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  for (const f of s.floaters) {
    const a = Math.max(0, f.life / f.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = f.color;
    ctx.font = `bold ${f.size}px "JetBrains Mono", monospace`;
    ctx.shadowColor = f.color;
    ctx.shadowBlur = 6;
    const cx = f.pos.x * cs + cs / 2;
    const cy = f.pos.y * cs + cs / 2 + (1 - a) * -30;
    ctx.fillText(f.text, cx, cy);
  }
  ctx.restore();
}
