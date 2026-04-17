// Ambient grid / starfield background behind the main UI.
// Runs continuously for menu ambiance.

export interface BackgroundHandle {
  setPixelMode: (on: boolean, factor: number) => void;
}

export function initBackground(canvas: HTMLCanvasElement): BackgroundHandle {
  const ctx = canvas.getContext('2d')!;
  const points: { x: number; y: number; vy: number; size: number; color: string }[] = [];
  const colors = ['#00fff0', '#ff2d95', '#b847ff'];
  const N = 80;
  let w = 0, h = 0;
  let pixelMode = false;
  let pixelFactor = 3;
  let pixCanvas: HTMLCanvasElement | null = null;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < N; i++) {
    points.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vy: 0.1 + Math.random() * 0.6,
      size: 0.5 + Math.random() * 1.8,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }

  let last = performance.now();
  function frame(t: number) {
    last = t;
    ctx.clearRect(0, 0, w, h);

    // Soft radial vignette
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.8);
    grad.addColorStop(0, 'rgba(10, 14, 24, 0.0)');
    grad.addColorStop(1, 'rgba(5, 6, 10, 0.9)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    if (pixelMode) {
      drawTronGrid(ctx, t, w, h);
    } else {
      // Static flat grid
      ctx.strokeStyle = 'rgba(0,255,240,0.04)';
      ctx.lineWidth = 1;
      const gs = 40;
      const offY = (t * 0.02) % gs;
      ctx.beginPath();
      for (let x = 0; x < w; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      for (let y = -gs + offY; y < h + gs; y += gs) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
      ctx.stroke();
    }

    // Particles drifting down
    for (const p of points) {
      p.y += p.vy;
      if (p.y > h) { p.y = -10; p.x = Math.random() * w; }
      ctx.fillStyle = p.color;
      ctx.globalAlpha = pixelMode ? 0.85 : 0.5;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = pixelMode ? 10 : 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Pixelate post-process
    if (pixelMode) {
      const srcW = canvas.width, srcH = canvas.height;
      const dstW = Math.max(1, Math.floor(srcW / pixelFactor));
      const dstH = Math.max(1, Math.floor(srcH / pixelFactor));
      if (!pixCanvas) pixCanvas = document.createElement('canvas');
      if (pixCanvas.width !== dstW || pixCanvas.height !== dstH) {
        pixCanvas.width = dstW;
        pixCanvas.height = dstH;
      }
      const offCtx = pixCanvas.getContext('2d')!;
      offCtx.imageSmoothingEnabled = false;
      offCtx.clearRect(0, 0, dstW, dstH);
      offCtx.drawImage(canvas, 0, 0, srcW, srcH, 0, 0, dstW, dstH);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, srcW, srcH);
      ctx.drawImage(pixCanvas, 0, 0, dstW, dstH, 0, 0, srcW, srcH);
      ctx.restore();
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    setPixelMode: (on, factor) => {
      pixelMode = on;
      pixelFactor = factor;
    },
  };
}

// Tron-style perspective grid — horizontal lines recede to a horizon with a glowing sun.
function drawTronGrid(ctx: CanvasRenderingContext2D, t: number, w: number, h: number): void {
  const horizonY = h * 0.5;
  const gridColor = '#00fff0';
  const accent = '#ff2d95';

  // Horizon glow (Tron sun)
  const sunGrad = ctx.createRadialGradient(w / 2, horizonY, 0, w / 2, horizonY, w * 0.55);
  sunGrad.addColorStop(0, 'rgba(255, 45, 149, 0.45)');
  sunGrad.addColorStop(0.3, 'rgba(0, 255, 240, 0.18)');
  sunGrad.addColorStop(1, 'rgba(5, 6, 10, 0)');
  ctx.fillStyle = sunGrad;
  ctx.fillRect(0, 0, w, h);

  // Sun horizontal band (classic Tron retrowave stripes)
  const sunCx = w / 2;
  const sunR = Math.min(w, h) * 0.22;
  const sunT = t * 0.0002;
  for (let i = 0; i < 6; i++) {
    const yOff = i * (sunR * 0.18);
    const y = horizonY - sunR + yOff * 2;
    if (y < horizonY - sunR || y > horizonY + sunR * 0.1) continue;
    const dx = Math.sqrt(Math.max(0, sunR * sunR - (y - horizonY) * (y - horizonY)));
    ctx.fillStyle = i % 2 === 0 ? accent : gridColor;
    ctx.globalAlpha = 0.25 - i * 0.03;
    ctx.fillRect(sunCx - dx, y - 1, dx * 2, 2);
  }
  ctx.globalAlpha = 1;

  // Sun disc outline
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(sunCx, horizonY, sunR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  // Ground plane perspective grid
  ctx.strokeStyle = gridColor;
  ctx.shadowColor = gridColor;
  ctx.shadowBlur = 4;

  // Horizontal receding lines (distance scroll)
  const lineCount = 14;
  const scrollOffset = (t * 0.00008) % 1;
  for (let i = 1; i <= lineCount; i++) {
    const progress = ((i + scrollOffset) / lineCount);
    const easedProgress = Math.pow(progress, 2.4);
    const y = horizonY + easedProgress * (h - horizonY);
    if (y > h) continue;
    ctx.globalAlpha = Math.min(1, progress * 1.4) * 0.8;
    ctx.lineWidth = 1 + easedProgress * 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Vertical converging lines (vanishing to horizon center)
  const vlines = 14;
  ctx.lineWidth = 1;
  for (let i = -vlines; i <= vlines; i++) {
    const bottomX = w / 2 + (i / vlines) * w * 1.5;
    const topX = w / 2 + (i / vlines) * w * 0.05;
    ctx.globalAlpha = 0.35 - Math.abs(i / vlines) * 0.15;
    ctx.beginPath();
    ctx.moveTo(bottomX, h);
    ctx.lineTo(topX, horizonY);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // Thin horizon line
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  ctx.shadowColor = gridColor;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.lineTo(w, horizonY);
  ctx.stroke();
  ctx.shadowBlur = 0;
}
