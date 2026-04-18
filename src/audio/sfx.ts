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
    switch (id as SoundId) {
      case 'ui_click':      this.blip(ctx, 440, 0.04, 'square', 0.15); break;
      case 'ui_hover':      this.blip(ctx, 780, 0.02, 'sine', 0.08); break;
      case 'place':         this.sweep(ctx, 200, 600, 0.12, 'sawtooth', 0.15); break;
      case 'sell':          this.sweep(ctx, 600, 200, 0.15, 'square', 0.15); break;
      case 'upgrade':       this.chord(ctx, [400, 600, 800], 0.25, 'triangle', 0.15); break;
      case 'wave_start':    this.sweep(ctx, 120, 500, 0.6, 'sawtooth', 0.2); this.noise(ctx, 0.4, 0.1, 400); break;
      case 'fire_firewall': this.blip(ctx, 880 + Math.random()*80, 0.05, 'square', 0.08); break;
      case 'fire_honeypot': this.blip(ctx, 520, 0.06, 'sine', 0.07); break;
      case 'fire_antivirus':this.sweep(ctx, 1200, 400, 0.12, 'sawtooth', 0.13); break;
      case 'fire_quantum':  this.blip(ctx, 660 + Math.random()*120, 0.05, 'triangle', 0.1); break;
      case 'fire_ice':      this.noise(ctx, 0.15, 0.22, 800); break;
      case 'fire_chain':    this.sweep(ctx, 2000, 1000, 0.06, 'sawtooth', 0.12); break;
      case 'fire_railgun':  this.sweep(ctx, 2200, 200, 0.25, 'sawtooth', 0.22); this.noise(ctx, 0.2, 0.12, 300); break;
      // Artillery cannon report — soft muffled thud, not the high-pitched square blip.
      case 'fire_mine':     this.sweep(ctx, 140, 50, 0.18, 'triangle', 0.09); this.noise(ctx, 0.08, 0.05, 180); break;
      case 'enemy_die':     this.noise(ctx, 0.08, 0.12, 600); this.blip(ctx, 180, 0.08, 'square', 0.1); break;
      case 'boss_die':      this.sweep(ctx, 400, 40, 1.2, 'sawtooth', 0.3); this.noise(ctx, 0.6, 0.3, 300); break;
      case 'damage':        this.sweep(ctx, 180, 60, 0.3, 'square', 0.25); break;
      // Explosion thud — low-pass noise + gentle triangle sweep. Was a sawtooth sweep
      // at 0.2 gain (piercing). Now triangle at 0.08 with noise at 0.06.
      case 'explode':       this.noise(ctx, 0.28, 0.06, 150); this.sweep(ctx, 180, 55, 0.22, 'triangle', 0.08); break;
      case 'mine':          this.noise(ctx, 0.3, 0.25, 150); break;
      case 'card_reveal':   this.chord(ctx, [523, 659], 0.15, 'triangle', 0.12); break;
      case 'card_legendary':this.chord(ctx, [523, 659, 784, 988], 0.6, 'triangle', 0.18); break;
      case 'victory':       this.chord(ctx, [523, 659, 784], 0.8, 'triangle', 0.2); break;
      case 'gameover':      this.sweep(ctx, 400, 80, 1.2, 'sawtooth', 0.22); break;
      case 'revive':        this.sweep(ctx, 200, 900, 0.5, 'triangle', 0.2); break;
    }
  }

  private blip(ctx: AudioContext, freq: number, dur: number, type: OscillatorType, gain: number) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = 0;
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g).connect(this.master!);
    osc.start(now);
    osc.stop(now + dur + 0.02);
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

  private chord(ctx: AudioContext, freqs: number[], dur: number, type: OscillatorType, gain: number) {
    for (const f of freqs) this.blip(ctx, f, dur, type, gain / freqs.length);
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
