'use client';
import { useEffect, useRef, useState } from "react";
import { playCardBell, playEndBell, prepareBell } from "../lib/bell";

type Card = { id: string; title: string; icon: string };
type Props = { cards: Card[]; onFocus: (index: number | null) => void; onComplete: () => void };
type Phase = "idle" | "running" | "paused" | "done";

const CARD_MS = 2 * 60 * 1000;
const DURATIONS = [5, 10, 15, 20];
const DEFAULT_MINUTES = 10;
const MINUTES_KEY = "visionboard_timer_minutes";
const BELL_KEY = "visionboard_bell_on";

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export default function FocusTimer({ cards, onFocus, onComplete }: Props) {
  const [minutes, setMinutes] = useState(DEFAULT_MINUTES);
  const [bellOn, setBellOn] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [remaining, setRemaining] = useState(DEFAULT_MINUTES * 60000);
  const endAt = useRef(0);
  const lastIndex = useRef(0);
  const bellRef = useRef(true);
  const totalMs = minutes * 60000;

  useEffect(() => {
    try {
      const m = Number(localStorage.getItem(MINUTES_KEY));
      if (DURATIONS.includes(m)) { setMinutes(m); setRemaining(m * 60000); }
      if (localStorage.getItem(BELL_KEY) === "off") setBellOn(false);
    } catch {}
  }, []);
  useEffect(() => { bellRef.current = bellOn; }, [bellOn]);

  const indexAt = (rem: number) => Math.floor((totalMs - rem) / CARD_MS) % cards.length;

  useEffect(() => {
    if (phase !== "running") return;
    const id = window.setInterval(() => {
      const rem = endAt.current - Date.now();
      if (rem <= 0) {
        window.clearInterval(id);
        setRemaining(0);
        setPhase("done");
        onFocus(null);
        if (bellRef.current) playEndBell();
        onComplete();
        return;
      }
      setRemaining(rem);
      const idx = indexAt(rem);
      if (idx !== lastIndex.current) {
        lastIndex.current = idx;
        onFocus(idx);
        if (bellRef.current) playCardBell();
      }
    }, 250);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, totalMs, cards.length]);

  function start() {
    prepareBell();
    const rem = phase === "paused" ? remaining : totalMs;
    endAt.current = Date.now() + rem;
    if (phase !== "paused") {
      lastIndex.current = 0;
      setRemaining(totalMs);
      if (bellOn) playCardBell();
    }
    onFocus(indexAt(rem));
    setPhase("running");
  }
  function pause() {
    setRemaining(Math.max(0, endAt.current - Date.now()));
    setPhase("paused");
  }
  function reset() {
    setPhase("idle");
    setRemaining(totalMs);
    lastIndex.current = 0;
    onFocus(null);
  }
  function pickMinutes(m: number) {
    setMinutes(m);
    setRemaining(m * 60000);
    try { localStorage.setItem(MINUTES_KEY, String(m)); } catch {}
  }
  function toggleBell() {
    const next = !bellOn;
    setBellOn(next);
    try { localStorage.setItem(BELL_KEY, next ? "on" : "off"); } catch {}
    if (next) { prepareBell(); playCardBell(); }
  }

  const active = phase === "running" || phase === "paused";
  const idx = active ? indexAt(remaining) : -1;
  const cardLeft = active ? CARD_MS - ((totalMs - remaining) % CARD_MS) : 0;
  const cardLeftShown = active ? Math.min(cardLeft, remaining) : 0;
  const progress = totalMs ? ((totalMs - remaining) / totalMs) * 100 : 0;

  return (
    <section className={"focus-timer " + phase} aria-label="Vision board focus timer">
      <div className="ft-main">
        <div className="ft-clock" aria-live="off">{mmss(remaining)}</div>
        <div className="ft-info">
          {phase === "idle" && <strong>Focus session</strong>}
          {phase === "done" && <strong>Session complete 🔔</strong>}
          {active && <strong>{cards[idx].icon} Card {idx + 1} of {cards.length} — {cards[idx].title}</strong>}
          <span>
            {phase === "idle" && `${cards.length} cards • 2 minutes each • a bell rings when it is time to move on`}
            {phase === "done" && "Now tap “I Saw My Vision Board” to record this viewing."}
            {active && `${mmss(cardLeftShown)} left on this card${phase === "paused" ? " • paused" : ""}`}
          </span>
        </div>
        <div className="ft-actions">
          {phase !== "running" && <button type="button" className="ft-primary" onClick={start}>{phase === "paused" ? "▶ Resume" : phase === "done" ? "↻ Start again" : "▶ Start"}</button>}
          {phase === "running" && <button type="button" className="ft-primary" onClick={pause}>⏸ Pause</button>}
          {phase !== "idle" && <button type="button" onClick={reset}>Reset</button>}
        </div>
      </div>
      <div className="ft-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><i style={{ width: progress + "%" }} /></div>
      <div className="ft-options">
        <label>Total time
          <select value={minutes} onChange={(e) => pickMinutes(Number(e.target.value))} disabled={active}>
            {DURATIONS.map((m) => <option key={m} value={m}>{m} minutes{m === DEFAULT_MINUTES ? " (default)" : ""}</option>)}
          </select>
        </label>
        <button type="button" className={"ft-bell " + (bellOn ? "on" : "off")} onClick={toggleBell} aria-pressed={bellOn}>{bellOn ? "🔔 Bell on" : "🔕 Bell off"}</button>
      </div>
    </section>
  );
}
