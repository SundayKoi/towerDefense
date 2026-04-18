// Procedural Web Audio SFX — no audio files, all synthesized at runtime.

type SoundId =
  | 'ui_click'
  | 'ui_hover'
  | 'place'
  | 'sell'
  | 'upgrade'
  | 'wave_start'
  | 'fire_firewall'
  | 'fire_honeypot'
  | 'fire_antivirus'
  | 'fire_quantum'
  | 'fire_ice'
  | 'fire_chain'
  | 'fire_railgun'
  | 'fire_mine'
  | 'fire_pulse'
  | 'enemy_die'
  | 'boss_die'
  | 'damage'
  | 'explode'
  | 'mine'
  | 'card_reveal'
  | 'card_legendary'
  | 'victory'
  | 'gameover'
  | 'revive';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;
  private musicEnabled = true;
  private musicGain: GainNode | null = null;
  private musicNodes: { stop: () => void }[] = [];
  private musicActive = false;
  private pendingMusicKind: 'menu' | 'game' | null = null;
  // Rate-limit buckets: last-play timestamp per sound id. Prevents "wall of
  // explosions" when an artillery shell + cluster + frag all fire on one frame.
  private lastPlay: Record<string, number> = {};

  setEnabled(on: boolean) { this.enabled = on; }

  private ensure() {
    if (this.ctx) return this.ctx;
    try {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
      if (!Ctx) return null;
      const ctx = new Ctx();
      const master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;
      // Unlock on first gesture
      if (ctx.state === 'suspended') {
        const resume = () => { ctx.resume(); window.removeEventListener('pointerdown', resume); };
        window.addEventListener('pointerdown', resume, { once: true });
      }
      return ctx;
    } catch {
      return null;
    }
  }

  play(id: string): void {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    // Rate-limit loud / overlapping sounds so an artillery shell + cluster + frag
    // + secondary chain hits don't stack into a painful wall of noise.
    const cooldowns: Record<string, number> = { explode: 0.10, fire_mine: 0.08, boss_die: 0.2 };
    const cd = cooldowns[id];
    if (cd != null) {
      const now = ctx.currentTime;
      const last = this.lastPlay[id] ?? -Infinity;
      if (now - last < cd) return;
      this.lastPlay[id] = now;
    }
    const now = ctx.currentTime;
    switch (id as SoundId) {
      // ---------- UI ----------
      case 'ui_click':
        this.blip(ctx, 520, 0.03, 'square', 0.16);
        break;
      case 'ui_hover':
        this.blip(ctx, 960, 0.015, 'triangle', 0.05);
        break;
      case 'place':
        // Two-step square arpeggio 220 → 440, 0.08s total
        this.blip(ctx, 220, 0.04, 'square', 0.14);
        this.scheduleBlip(ctx, 440, 0.04, 'square', 0.14, now + 0.04);
        break;
      case 'sell':
        // Descending triangle sweep 440 → 110
        this.sweep(ctx, 440, 110, 0.12, 'triangle', 0.16);
        break;
      case 'upgrade':
        // 3-note square arpeggio 440 → 660 → 880, fast 0.18s total
        this.blip(ctx, 440, 0.06, 'square', 0.14);
        this.scheduleBlip(ctx, 660, 0.06, 'square', 0.14, now + 0.06);
        this.scheduleBlip(ctx, 880, 0.06, 'square', 0.15, now + 0.12);
        break;
      case 'wave_start':
        // Low square pulse 80 → 200 + bitcrushed noise burst, 0.35s
        this.sweep(ctx, 80, 200, 0.35, 'square', 0.22);
        this.crushedNoise(ctx, 0.25, 0.1, 600);
        break;

      // ---------- Tower fire ----------
      case 'fire_firewall':
        // Kinetic thump — low square 200 Hz 0.04s + quick noise tick
        this.blip(ctx, 200, 0.04, 'square', 0.14);
        this.noise(ctx, 0.025, 0.08, 1800);
        break;
      case 'fire_honeypot':
        // Gooey slap — sine at 380 Hz 0.05 s with short rising pitch
        this.sweep(ctx, 320, 480, 0.05, 'sine', 0.14);
        break;
      case 'fire_antivirus':
        // Laser zap — square sweep 1800 → 600, 0.06s
        this.sweep(ctx, 1800, 600, 0.06, 'square', 0.12);
        break;
      case 'fire_quantum':
        // Crystalline chirp — detuned triangle 660 + 680, 0.04s
        this.blip(ctx, 660, 0.04, 'triangle', 0.09);
        this.blip(ctx, 680, 0.04, 'triangle', 0.09);
        break;
      case 'fire_ice':
        // Crunch — short hi-pass noise 0.08s + low triangle thump
        this.bandNoise(ctx, 0.08, 0.1, 3200, 0.8);
        this.blip(ctx, 120, 0.06, 'triangle', 0.12);
        break;
      case 'fire_chain':
        // Zap — fast square sweep 2200 → 1100, 0.03s + tiny noise tick
        this.sweep(ctx, 2200, 1100, 0.03, 'square', 0.11);
        this.noise(ctx, 0.02, 0.05, 2200);
        break;
      case 'fire_railgun':
        // Big sci-fi cannon — square sweep 2400 → 200, 0.22 s + crunchy noise 0.15 s
        this.sweep(ctx, 2400, 200, 0.22, 'square', 0.2);
        this.crushedNoise(ctx, 0.15, 0.12, 500);
        this.blip(ctx, 80, 0.1, 'triangle', 0.18);
        break;
      case 'fire_mine':
        // Artillery boom — low triangle sweep 160 → 50 + low-pass noise 0.1s
        this.sweep(ctx, 160, 50, 0.22, 'triangle', 0.14);
        this.noise(ctx, 0.1, 0.09, 220);
        break;
      case 'fire_pulse':
        // EMP wub — dual square 180 + 240 detuned, 0.08s, with a downsweep
        this.blip(ctx, 180, 0.08, 'square', 0.1);
        this.blip(ctx, 240, 0.08, 'square', 0.09);
        this.sweep(ctx, 320, 120, 0.12, 'triangle', 0.1);
        break;

      // ---------- Combat feedback ----------
      case 'enemy_die':
        // "Destroy" stinger — short square thump 120 Hz + hi noise tick
        this.blip(ctx, 120, 0.07, 'square', 0.13);
        this.bandNoise(ctx, 0.05, 0.08, 4200, 1.0);
        break;
      case 'boss_die':
        // Big descent — square sweep 440 → 40 0.6s + thicker noise 0.3s + lowest octave drop
        this.sweep(ctx, 440, 40, 0.6, 'square', 0.24);
        this.crushedNoise(ctx, 0.3, 0.18, 400);
        this.sweep(ctx, 110, 30, 0.8, 'triangle', 0.2);
        break;
      case 'damage':
        // Player-hit sting — bitcrushed low noise 0.15s + square thump 100 Hz
        this.crushedNoise(ctx, 0.15, 0.22, 450);
        this.blip(ctx, 100, 0.1, 'square', 0.22);
        break;
      case 'explode':
        // Muffled thud — triangle sweep 200 → 50 + low-pass noise, SHORT
        this.sweep(ctx, 200, 50, 0.2, 'triangle', 0.09);
        this.noise(ctx, 0.22, 0.06, 160);
        break;
      case 'mine':
        // Low noise burst
        this.noise(ctx, 0.2, 0.22, 160);
        break;

      // ---------- Draft / meta ----------
      case 'card_reveal':
        // 2-note triangle arpeggio 523 → 659, 0.1s
        this.blip(ctx, 523, 0.05, 'triangle', 0.12);
        this.scheduleBlip(ctx, 659, 0.05, 'triangle', 0.12, now + 0.05);
        break;
      case 'card_legendary':
        // 4-note ascending arpeggio square + shimmer (fast repeated high triangle), 0.5s
        this.scheduleBlip(ctx, 523, 0.09, 'square', 0.12, now + 0.00);
        this.scheduleBlip(ctx, 659, 0.09, 'square', 0.12, now + 0.09);
        this.scheduleBlip(ctx, 784, 0.09, 'square', 0.12, now + 0.18);
        this.scheduleBlip(ctx, 988, 0.12, 'square', 0.13, now + 0.27);
        // Sparkle tail — rapid high triangle ticks
        for (let i = 0; i < 6; i++) {
          this.scheduleBlip(ctx, 1760 + (i % 2) * 220, 0.04, 'triangle', 0.06, now + 0.3 + i * 0.04);
        }
        break;
      case 'victory':
        // Major-third arpeggio 523 → 659 → 784 triangle with sparkle, 0.7s
        this.scheduleBlip(ctx, 523, 0.18, 'triangle', 0.18, now + 0.00);
        this.scheduleBlip(ctx, 659, 0.18, 'triangle', 0.18, now + 0.15);
        this.scheduleBlip(ctx, 784, 0.35, 'triangle', 0.2, now + 0.3);
        for (let i = 0; i < 5; i++) {
          this.scheduleBlip(ctx, 1568 + (i % 3) * 196, 0.05, 'triangle', 0.06, now + 0.4 + i * 0.05);
        }
        break;
      case 'gameover':
        // Descending minor arpeggio 440 → 349 → 262 → 174, square, 1.0s
        this.scheduleBlip(ctx, 440, 0.18, 'square', 0.18, now + 0.00);
        this.scheduleBlip(ctx, 349, 0.18, 'square', 0.18, now + 0.2);
        this.scheduleBlip(ctx, 262, 0.22, 'square', 0.18, now + 0.4);
        this.scheduleBlip(ctx, 174, 0.42, 'square', 0.2, now + 0.6);
        break;
      case 'revive':
        // Rising triangle arp 200 → 400 → 800, 0.3s, with a shimmering tail
        this.scheduleBlip(ctx, 200, 0.1, 'triangle', 0.18, now + 0.00);
        this.scheduleBlip(ctx, 400, 0.1, 'triangle', 0.18, now + 0.1);
        this.scheduleBlip(ctx, 800, 0.12, 'triangle', 0.2, now + 0.2);
        for (let i = 0; i < 4; i++) {
          this.scheduleBlip(ctx, 1600 + i * 80, 0.04, 'triangle', 0.05, now + 0.3 + i * 0.04);
        }
        break;
    }
  }

  private blip(ctx: AudioContext, freq: number, dur: number, type: OscillatorType, gain: number) {
    this.scheduleBlip(ctx, freq, dur, type, gain, ctx.currentTime);
  }

  // Same as blip but starts at an explicit time — used to schedule arpeggios from play().
  private scheduleBlip(ctx: AudioContext, freq: number, dur: number, type: OscillatorType, gain: number, startAt: number) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, startAt);
    g.gain.linearRampToValueAtTime(gain, startAt + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
    osc.connect(g).connect(this.master!);
    osc.start(startAt);
    osc.stop(startAt + dur + 0.02);
  }

  private sweep(ctx: AudioContext, fFrom: number, fTo: number, dur: number, type: OscillatorType, gain: number) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(fFrom, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, fTo), now + dur);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g).connect(this.master!);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  private noise(ctx: AudioContext, dur: number, gain: number, cutoff: number) {
    const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(filter).connect(g).connect(this.master!);
    src.start();
    src.stop(ctx.currentTime + dur + 0.02);
  }

  // Bitcrushed-feel noise — narrow bandpass around a low center freq gives that
  // crunchy 8-bit grit. cutoff = bandpass center, Q ≈ 1.2 for a tight band.
  private crushedNoise(ctx: AudioContext, dur: number, gain: number, cutoff: number) {
    const sampleRate = ctx.sampleRate;
    // Quantize the noise source to ~4-bit steps for bitcrush character.
    const steps = 8;
    const buf = ctx.createBuffer(1, Math.max(1, Math.floor(sampleRate * dur)), sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const raw = Math.random() * 2 - 1;
      const quant = Math.round(raw * steps) / steps;
      data[i] = quant * (1 - i / data.length);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = cutoff;
    bp.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(bp).connect(g).connect(this.master!);
    const now = ctx.currentTime;
    src.start(now);
    src.stop(now + dur + 0.02);
  }

  // Hi-pass / bandpass noise burst — used for chirp/crunch layers that need
  // airy top-end rather than a low thud.
  private bandNoise(ctx: AudioContext, dur: number, gain: number, cutoff: number, q: number) {
    const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = cutoff;
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(filter).connect(g).connect(this.master!);
    const now = ctx.currentTime;
    src.start(now);
    src.stop(now + dur + 0.02);
  }

  // =========== Ambient music (procedural drone + pulse) ===========

  startAmbient(kind: 'menu' | 'game' = 'game'): void {
    // Remember the last-requested kind so re-enabling music picks up where it should.
    this.pendingMusicKind = kind;
    if (!this.musicEnabled) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    if (this.musicActive) return;
    this.musicActive = true;

    // Master bus for music
    const bus = ctx.createGain();
    bus.gain.value = 0;
    bus.gain.setTargetAtTime(kind === 'menu' ? 0.12 : 0.09, ctx.currentTime, 1.5);
    bus.connect(this.master);
    this.musicGain = bus;

    const stops: Array<() => void> = [];

    // Root drone (deep sine layered with detuned saw)
    const rootFreq = kind === 'menu' ? 55 : 49; // A1 for menu, G1 for game
    const makeDrone = (freq: number, type: OscillatorType, gain: number, detune = 0) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = gain;
      osc.connect(g).connect(bus);
      osc.start();
      stops.push(() => { try { osc.stop(); } catch {} });
    };
    makeDrone(rootFreq, 'sine', 0.5);
    makeDrone(rootFreq * 2, 'sine', 0.2);
    makeDrone(rootFreq * 1.5, 'triangle', 0.1, 6);
    makeDrone(rootFreq * 3, 'sine', 0.05, -4);

    // Filtered noise wash (mild atmosphere)
    const noiseBuf = ctx.createBuffer(2, ctx.sampleRate * 4, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = noiseBuf.getChannelData(ch);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    noiseSrc.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 700;
    noiseFilter.Q.value = 1.5;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.05;
    noiseSrc.connect(noiseFilter).connect(noiseGain).connect(bus);
    noiseSrc.start();
    stops.push(() => { try { noiseSrc.stop(); } catch {} });

    // Slow arpeggio pulse — minor chord notes, quiet, every 2.5s
    const scale = [0, 3, 7, 10, 12]; // minor pentatonic
    const beatInterval = setInterval(() => {
      if (!this.musicActive || !this.musicGain) return;
      const now = ctx.currentTime;
      const step = scale[Math.floor(Math.random() * scale.length)];
      const f = rootFreq * 4 * Math.pow(2, step / 12);
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.05, now + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      o.connect(g).connect(bus);
      o.start(now);
      o.stop(now + 1.3);
    }, 2500);
    stops.push(() => clearInterval(beatInterval));

    // Slow LFO modulating filter for "breathing" feel
    const lfoInterval = setInterval(() => {
      if (!this.musicActive) return;
      const t = performance.now() / 1000;
      const f = 500 + Math.sin(t * 0.2) * 300;
      noiseFilter.frequency.setTargetAtTime(f, ctx.currentTime, 0.5);
    }, 400);
    stops.push(() => clearInterval(lfoInterval));

    this.musicNodes = [{ stop: () => stops.forEach((s) => s()) }];
  }

  stopAmbient(): void {
    if (!this.ctx || !this.musicActive) return;
    this.musicActive = false;
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
      const g = this.musicGain;
      setTimeout(() => { try { g.disconnect(); } catch {} }, 1500);
      this.musicGain = null;
    }
    for (const n of this.musicNodes) { try { n.stop(); } catch {} }
    this.musicNodes = [];
  }

  setMusicEnabled(on: boolean): void {
    this.musicEnabled = on;
    if (on && !this.musicActive) this.startAmbient(this.pendingMusicKind ?? 'game');
    if (!on && this.musicActive) this.stopAmbient();
  }
}

export const audio = new AudioEngine();
