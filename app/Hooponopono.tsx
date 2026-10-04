'use client';
import { useEffect, useState } from "react";

const PHRASES = [
  { text: "I'm sorry", meaning: "Repentance" },
  { text: "Please forgive me", meaning: "Forgiveness" },
  { text: "Thank you", meaning: "Gratitude" },
  { text: "I love you", meaning: "Love" },
];

// Seconds each phrase stays on screen, slowest to fastest.
const PACES = [12, 10, 8, 6, 5, 4, 3, 2.5, 2, 1.5, 1];
const DEFAULT_PACE = 5;
const PACE_KEY = "visionboard_hooponopono_pace";

type State = { pos: number; counts: number[] };
const EMPTY: State = { pos: -1, counts: PHRASES.map(() => 0) };

export default function Hooponopono() {
  const [pace, setPace] = useState(DEFAULT_PACE);
  const [running, setRunning] = useState(false);
  const [state, setState] = useState<State>(EMPTY);
  const secs = PACES[pace];

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PACE_KEY);
      const p = saved === null ? NaN : Number(saved);
      if (Number.isInteger(p) && p >= 0 && p < PACES.length) setPace(p);
    } catch {}
  }, []);

  const tick = () =>
    setState((s) => {
      const next = (s.pos + 1) % PHRASES.length;
      return { pos: next, counts: s.counts.map((c, i) => (i === next ? c + 1 : c)) };
    });

  // Each tick moves to the next phrase and adds one to its count. A speed change applies from the next wait.
  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(tick, secs * 1000);
    return () => window.clearTimeout(id);
  }, [running, state.pos, secs]);

  function start() {
    if (state.pos === -1) tick();
    setRunning(true);
  }
  function reset() {
    setRunning(false);
    setState(EMPTY);
  }
  function setSpeed(p: number) {
    const next = Math.min(PACES.length - 1, Math.max(0, p));
    setPace(next);
    try { localStorage.setItem(PACE_KEY, String(next)); } catch {}
  }

  const rounds = Math.min(...state.counts);
  const total = state.counts.reduce((a, b) => a + b, 0);

  return (
    <section className="hoo" aria-label="Hoʻoponopono">
      <div className="hoo-head">
        <h2>Hoʻoponopono</h2>
        <p>Read each phrase aloud as it lights up. Let the pace match your voice.</p>
      </div>

      <div className="hoo-phrases">
        {PHRASES.map((p, i) => (
          <div key={p.text} className={"hoo-phrase" + (state.pos === i ? " on" : "")}>
            <small>{p.meaning}</small>
            <strong>“{p.text}”</strong>
            <span className="hoo-count" aria-label={`${p.text} said ${state.counts[i]} times`}>{state.counts[i]}</span>
          </div>
        ))}
      </div>

      <div className="hoo-summary">{rounds} full {rounds === 1 ? "round" : "rounds"} • {total} {total === 1 ? "phrase" : "phrases"} said</div>

      <div className="hoo-controls">
        <button type="button" className="hoo-big" onClick={() => setSpeed(pace - 1)} disabled={pace === 0} aria-label="Slower">− Slower</button>
        <div className="hoo-speed">
          <b>{secs} s</b>
          <span>per phrase</span>
        </div>
        <button type="button" className="hoo-big" onClick={() => setSpeed(pace + 1)} disabled={pace === PACES.length - 1} aria-label="Faster">Faster +</button>
      </div>

      <label className="hoo-slider">
        <span>Slow</span>
        <input type="range" min={0} max={PACES.length - 1} step={1} value={pace} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Pace" />
        <span>Fast</span>
      </label>

      <div className="hoo-actions">
        {running
          ? <button type="button" className="hoo-main" onClick={() => setRunning(false)}>⏸ Pause</button>
          : <button type="button" className="hoo-main" onClick={start}>{state.pos === -1 ? "▶ Start" : "▶ Resume"}</button>}
        <button type="button" onClick={reset} disabled={state.pos === -1}>Reset counts</button>
      </div>
    </section>
  );
}
