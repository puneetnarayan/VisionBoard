// Soft temple-style bell synthesised with Web Audio: a few inharmonic partials with long, staggered decays.
const PARTIALS = [
  { ratio: 1, amp: 1, decay: 4.2 },
  { ratio: 2.0, amp: 0.55, decay: 3.2 },
  { ratio: 2.76, amp: 0.4, decay: 2.4 },
  { ratio: 5.4, amp: 0.22, decay: 1.4 },
  { ratio: 8.93, amp: 0.12, decay: 0.8 },
];

let ctx: AudioContext | null = null;
// 0-100 from the volume slider; 70 is the original loudness.
let volume = 70;
export const DEFAULT_VOLUME = 70;
export const volumeScale = (v: number) => v / DEFAULT_VOLUME;
export function setBellVolume(v: number) { volume = Math.min(100, Math.max(0, v)); }

// Call from a click handler so the browser allows audio to start.
export function prepareBell() {
  if (typeof window === "undefined") return;
  try {
    if (!ctx) {
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      ctx = new Ctx();
    }
    if (ctx.state === "suspended") void ctx.resume();
  } catch {}
}

function strike(at: number, base: number, level: number) {
  if (!ctx) return;
  const master = ctx.createGain();
  master.gain.value = level * volumeScale(volume);
  const soften = ctx.createBiquadFilter();
  soften.type = "lowpass";
  soften.frequency.value = 5200;
  master.connect(soften);
  soften.connect(ctx.destination);
  for (const p of PARTIALS) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = base * p.ratio;
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(p.amp, at + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, at + p.decay);
    osc.connect(env);
    env.connect(master);
    osc.start(at);
    osc.stop(at + p.decay + 0.05);
  }
}

// One clear strike: moving on to the next card.
export function playCardBell() {
  prepareBell();
  if (ctx) strike(ctx.currentTime + 0.02, 523.25, 0.32);
}

// Three falling strikes: the session is over.
export function playEndBell() {
  prepareBell();
  if (!ctx) return;
  const t = ctx.currentTime + 0.02;
  strike(t, 523.25, 0.32);
  strike(t + 1.4, 440, 0.32);
  strike(t + 2.8, 392, 0.34);
}
