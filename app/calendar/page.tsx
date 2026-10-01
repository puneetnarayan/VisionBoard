'use client';
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DAILY_TARGET, SLOTS, dateKey, groupByDate, loadLocalViews, loadViews, timeLabel, type View } from "../../lib/views";
import "./calendar.css";

type Mode = "day" | "week" | "month" | "year";
const MODES: Mode[] = ["day", "week", "month", "year"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfWeek(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-IN", o);

// Day block used by week and month views: shows the status of each slot.
function DayBlock({ date, views, today, muted, big }: { date: Date; views: View[]; today: string; muted?: boolean; big?: boolean }) {
  const count = views.length;
  const cls = "day-block" + (dateKey(date) === today ? " today" : "") + (muted ? " muted" : "") + (count >= DAILY_TARGET ? " complete" : count > 0 ? " partial" : "");
  return (
    <div className={cls}>
      <div className="day-num">{big && <small>{fmt(date, { weekday: "short" })}</small>}{date.getDate()}</div>
      <div className="day-slots">
        {SLOTS.map((s) => {
          const v = views.find((x) => x.slot === s.id);
          return (
            <span key={s.id} className={"slot-chip " + s.id + (v ? " done" : "")} title={`${s.label}${v ? " " + timeLabel(v.at) : " – not done"}`}>
              {s.icon}{big && v ? ` ${timeLabel(v.at)}` : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function MonthGrid({ year, month, byDate, today }: { year: number; month: number; byDate: Map<string, View[]>; today: string }) {
  const first = new Date(year, month, 1);
  const start = startOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const lastRow = cells.slice(35).every((d) => d.getMonth() !== month);
  return (
    <div className="month-grid">
      {WEEKDAYS.map((w) => <div key={w} className="weekday">{w}</div>)}
      {(lastRow ? cells.slice(0, 35) : cells).map((d) => (
        <DayBlock key={dateKey(d)} date={d} views={byDate.get(dateKey(d)) || []} today={today} muted={d.getMonth() !== month} />
      ))}
    </div>
  );
}

function MiniMonth({ year, month, byDate, today }: { year: number; month: number; byDate: Map<string, View[]>; today: string }) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  return (
    <div className="mini-month">
      <h4>{fmt(first, { month: "long" })}</h4>
      <div className="mini-grid">
        {Array.from({ length: offset }, (_, i) => <span key={"b" + i} />)}
        {Array.from({ length: days }, (_, i) => {
          const d = new Date(year, month, i + 1);
          const key = dateKey(d);
          const n = Math.min(byDate.get(key)?.length || 0, DAILY_TARGET);
          return <span key={key} className={"mini-day lvl" + n + (key === today ? " today" : "")} title={`${fmt(d, { day: "numeric", month: "short" })}: ${n}/${DAILY_TARGET}`}>{i + 1}</span>;
        })}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const [views, setViews] = useState<View[]>([]);
  const [mode, setMode] = useState<Mode>("month");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let active = true;
    setViews(loadLocalViews());
    loadViews().then((v) => { if (active) setViews(v); }).catch(() => {});
    return () => { active = false; };
  }, []);

  const byDate = useMemo(() => groupByDate(views), [views]);
  const today = dateKey(new Date());

  function shift(dir: number) {
    setAnchor((a) => (mode === "day" ? addDays(a, dir) : mode === "week" ? addDays(a, 7 * dir) : mode === "month" ? addMonths(a, dir) : new Date(a.getFullYear() + dir, 0, 1)));
  }

  const title =
    mode === "day" ? fmt(anchor, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : mode === "week" ? `${fmt(startOfWeek(anchor), { day: "numeric", month: "short" })} – ${fmt(addDays(startOfWeek(anchor), 6), { day: "numeric", month: "short", year: "numeric" })}`
    : mode === "month" ? fmt(anchor, { month: "long", year: "numeric" })
    : String(anchor.getFullYear());

  const rangeViews = views.filter((v) => {
    const d = v.date;
    if (mode === "day") return d === dateKey(anchor);
    if (mode === "week") return d >= dateKey(startOfWeek(anchor)) && d <= dateKey(addDays(startOfWeek(anchor), 6));
    if (mode === "month") return d.startsWith(dateKey(anchor).slice(0, 7));
    return d.startsWith(String(anchor.getFullYear()));
  });
  const completeDays = Array.from(groupByDate(rangeViews).values()).filter((l) => l.length >= DAILY_TARGET).length;

  if (!mounted) return <main className="page cal-page" aria-busy="true" />;

  return (
    <main className="page cal-page">
      <header className="cal-head">
        <Link href="/" className="back-link">← Vision board</Link>
        <h1>My viewing calendar</h1>
        <p>Target: {DAILY_TARGET} views a day — morning, afternoon and evening.</p>
      </header>

      <section className="cal-toolbar">
        <div className="mode-tabs" role="tablist">
          {MODES.map((m) => <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? "active" : ""} onClick={() => setMode(m)}>{m[0].toUpperCase() + m.slice(1)}</button>)}
        </div>
        <div className="cal-nav">
          <button onClick={() => shift(-1)} aria-label="Previous">‹</button>
          <strong>{title}</strong>
          <button onClick={() => shift(1)} aria-label="Next">›</button>
          <button className="today-btn" onClick={() => setAnchor(new Date())}>Today</button>
        </div>
        <div className="cal-summary">{rangeViews.length} views • {completeDays} full day{completeDays === 1 ? "" : "s"}</div>
      </section>

      {mode === "day" && (
        <section className="day-view">
          {SLOTS.map((s) => {
            const v = (byDate.get(dateKey(anchor)) || []).find((x) => x.slot === s.id);
            return (
              <div key={s.id} className={"day-slot " + (v ? "done" : "")}>
                <span className="day-slot-icon">{s.icon}</span>
                <div><strong>{s.label}</strong><small>{s.hours}</small></div>
                <span className="day-slot-status">{v ? `✓ ${timeLabel(v.at)} ${v.synced ? "☁ saved in Supabase" : "• device only"}` : "Not yet"}</span>
              </div>
            );
          })}
        </section>
      )}

      {mode === "week" && (
        <section className="week-grid">
          {Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i)).map((d) => (
            <DayBlock key={dateKey(d)} date={d} views={byDate.get(dateKey(d)) || []} today={today} big />
          ))}
        </section>
      )}

      {mode === "month" && <MonthGrid year={anchor.getFullYear()} month={anchor.getMonth()} byDate={byDate} today={today} />}

      {mode === "year" && (
        <section className="year-grid">
          {Array.from({ length: 12 }, (_, m) => <MiniMonth key={m} year={anchor.getFullYear()} month={m} byDate={byDate} today={today} />)}
        </section>
      )}

      <div className="cal-legend">
        {SLOTS.map((s) => <span key={s.id}>{s.icon} {s.label}</span>)}
        <span>☁ = confirmed saved in Supabase</span><span className="legend-note">Coloured = done • faded = not done{mode === "year" ? " • darker square = more views that day" : ""}</span>
      </div>
    </main>
  );
}
