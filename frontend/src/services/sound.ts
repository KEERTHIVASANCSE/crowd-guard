class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private currentOscillators: OscillatorNode[] = [];

  constructor() {
    // Initialized lazily on first user interaction to comply with browser audio autoplay policies
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopAll();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public stopAll() {
    this.currentOscillators.forEach(osc => {
      try { osc.stop(); } catch {}
    });
    this.currentOscillators = [];
  }

  /**
   * Police Tactical Alert (Fast alternating wail 700Hz <-> 1300Hz)
   */
  public playPoliceAlert() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    this.stopAll();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.linearRampToValueAtTime(1300, now + 0.3);
    osc.frequency.linearRampToValueAtTime(700, now + 0.6);
    osc.frequency.linearRampToValueAtTime(1300, now + 0.9);
    osc.frequency.linearRampToValueAtTime(700, now + 1.2);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(now + 1.3);
    this.currentOscillators.push(osc);
  }

  /**
   * Fire Klaxon Emergency Tone (Dual pulsing 880Hz / 440Hz alarm)
   */
  public playFireAlert() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    this.stopAll();
    const now = this.ctx.currentTime;

    [0, 0.25, 0.5, 0.75].forEach((offset) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now + offset);

      gain.gain.setValueAtTime(0.12, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.18);
      this.currentOscillators.push(osc);
    });
  }

  /**
   * Ambulance Hi-Lo Cadence Tone (960Hz <-> 770Hz)
   */
  public playAmbulanceAlert() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    this.stopAll();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(960, now);
    osc.frequency.setValueAtTime(770, now + 0.4);
    osc.frequency.setValueAtTime(960, now + 0.8);
    osc.frequency.setValueAtTime(770, now + 1.2);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(now + 1.5);
    this.currentOscillators.push(osc);
  }

  /**
   * Information / Beep
   */
  public playBeep() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, this.ctx.currentTime); // C6

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }
}

export const soundEngine = new SoundEngine();
