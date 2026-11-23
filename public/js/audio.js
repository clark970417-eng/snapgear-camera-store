// Retro GBA Chiptune Synthesizer & Sound Effects (Web Audio API)
// Inspired by the procedural Web Audio engine analyzed in akshayakula.com

class RetroAudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.unlocked = false;
    this.playing = false;
    this.timerId = null;
    this.step = 0;
    this.mode = "town"; // "town" | "mart"

    const unlock = () => {
      this.unlocked = true;
      this.ensureCtx();
      if (!this.muted && !this.playing) {
        this.startBgm();
      }
    };
    window.addEventListener("pointerdown", unlock, { capture: true, once: true });
    window.addEventListener("keydown", unlock, { capture: true, once: true });
  }

  ensureCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  midiToHz(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  noteToMidi(name) {
    const m = /^([A-G])(#?)(\d)$/.exec(name);
    if (!m) return 60;
    const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
    return 12 * (Number(m[3]) + 1) + base + (m[2] ? 1 : 0);
  }

  tone(freq, dur = 0.08, type = "square", vol = 0.04, delay = 0) {
    if (this.muted || !this.unlocked) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(Math.max(0.0001, vol), t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  blip() {
    this.tone(740, 0.055, "square", 0.032);
  }

  confirm() {
    this.tone(659, 0.06, "square", 0.035, 0);
    this.tone(987, 0.09, "square", 0.035, 0.055);
  }

  door() {
    this.tone(440, 0.07, "triangle", 0.05, 0);
    this.tone(554, 0.07, "triangle", 0.05, 0.06);
    this.tone(659, 0.12, "triangle", 0.05, 0.12);
  }

  shutter() {
    this.tone(1100, 0.03, "square", 0.03, 0);
    this.tone(320, 0.05, "triangle", 0.04, 0.04);
  }

  addCart() {
    this.tone(587, 0.05, "square", 0.032, 0);
    this.tone(880, 0.08, "square", 0.032, 0.05);
  }

  purchaseFanfare() {
    const notes = ["C5", "E5", "G5", "C6"];
    notes.forEach((n, idx) => {
      this.tone(this.midiToHz(this.noteToMidi(n)), idx === 3 ? 0.28 : 0.09, "square", 0.036, idx * 0.08);
    });
  }

  setMode(mode) {
    this.mode = mode === "mart" ? "mart" : "town";
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopBgm();
    } else {
      this.unlocked = true;
      this.ensureCtx();
      this.startBgm();
      this.blip();
    }
    return this.muted;
  }

  startBgm() {
    if (this.playing || this.muted) return;
    this.playing = true;
    const townMelody = [
      "E5", null, "G5", "A5", "B5", null, "A5", "G5",
      "E5", null, "D5", "E5", "G5", null, null, null,
      "A5", null, "G5", "E5", "D5", null, "E5", "G5",
      "A5", null, "B5", "A5", "G5", null, null, null
    ];
    const townBass = [
      "C3", null, "G3", null, "C3", null, "G3", null,
      "A2", null, "E3", null, "A2", null, "E3", null,
      "F2", null, "C3", null, "G2", null, "D3", null,
      "C3", null, "G3", null, "C3", null, "G2", null
    ];
    const martMelody = [
      "G5", "A5", "B5", null, "D6", null, "B5", "G5",
      "A5", null, "G5", "E5", "D5", null, "E5", "G5",
      "C6", null, "B5", "A5", "G5", null, "E5", "G5",
      "A5", "B5", "A5", "G5", "G5", null, null, null
    ];
    const martBass = [
      "G2", null, "D3", null, "G2", null, "D3", null,
      "E2", null, "B2", null, "C3", null, "G3", null,
      "C3", null, "G3", null, "D3", null, "A3", null,
      "G2", null, "D3", null, "G2", null, "D3", null
    ];

    this.timerId = window.setInterval(() => {
      if (this.muted || !this.unlocked || document.hidden) return;
      const mel = this.mode === "mart" ? martMelody : townMelody;
      const bas = this.mode === "mart" ? martBass : townBass;
      const i = this.step % mel.length;
      const mNote = mel[i];
      const bNote = bas[i];
      if (mNote) {
        this.tone(this.midiToHz(this.noteToMidi(mNote)), 0.16, "square", 0.015);
      }
      if (bNote) {
        this.tone(this.midiToHz(this.noteToMidi(bNote)), 0.22, "triangle", 0.026);
      }
      this.step++;
    }, 220);
  }

  stopBgm() {
    this.playing = false;
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}

export const retroAudio = new RetroAudioEngine();
