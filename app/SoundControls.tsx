'use client';
import { playCardBell, prepareBell } from "../lib/bell";

const OM_KEY = "visionboard_om_volume";
const BELL_KEY = "visionboard_bell_volume";
const DEFAULT = 70;

function read(key: string) {
  try {
    const raw = localStorage.getItem(key);
    const n = raw === null ? NaN : Number(raw);
    if (Number.isFinite(n) && n >= 0 && n <= 100) return n;
  } catch {}
  return DEFAULT;
}

export function loadVolumes() {
  return { om: read(OM_KEY), bell: read(BELL_KEY) };
}

function save(key: string, v: number) {
  try { localStorage.setItem(key, String(v)); } catch {}
}

type Props = { om: number; bell: number; onOm: (v: number) => void; onBell: (v: number) => void };

export default function SoundControls({ om, bell, onOm, onBell }: Props) {
  return (
    <section className="sound-controls" aria-label="Sound volume" onClick={(e) => e.stopPropagation()}>
      <label>
        <span>🔊 OM chanting</span>
        <input type="range" min={0} max={100} step={5} value={om} aria-label="OM chanting volume" onChange={(e) => { const v = Number(e.target.value); onOm(v); save(OM_KEY, v); }} />
        <b>{om}%</b>
      </label>
      <label>
        <span>🔔 Bell</span>
        <input
          type="range" min={0} max={100} step={5} value={bell} aria-label="Bell volume"
          onChange={(e) => { const v = Number(e.target.value); onBell(v); save(BELL_KEY, v); }}
          onPointerUp={() => { prepareBell(); playCardBell(); }}
          onKeyUp={() => { prepareBell(); playCardBell(); }}
        />
        <b>{bell}%</b>
      </label>
    </section>
  );
}
