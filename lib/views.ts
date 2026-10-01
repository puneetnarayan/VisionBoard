import { supabase } from "./supabase";
import { getVisitorId } from "./identity";

export type Slot = "morning" | "afternoon" | "evening";
// `synced` is in-memory only: true once the cloud has confirmed this view.
export type View = { date: string; slot: Slot; at: string; synced?: boolean };

export const SLOTS: { id: Slot; label: string; icon: string; hours: string }[] = [
  { id: "morning", label: "Morning", icon: "🌅", hours: "3:30 am – 11 am" },
  { id: "afternoon", label: "Afternoon", icon: "☀️", hours: "11 am – 5 pm" },
  // Late views (11 pm – 3:30 am) also count here, as part of the day that is ending.
  { id: "evening", label: "Evening/Night", icon: "🌙", hours: "5 pm – 11 pm" },
];
export const DAILY_TARGET = SLOTS.length;

const LOCAL_KEY = "visionboard_views_v2";
const LEGACY_KEY = "visionboard_views";

export function dateKey(d: Date) {
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

export function parseDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// A "day" runs from 3:30 am to 3:29 am the next morning, so a view at 1 am belongs to the previous day.
const DAY_START_MINUTES = 3 * 60 + 30;

// The current moment shifted so its calendar date is the app's "day". Use for dates; use the real time for clocks.
export function logicalNow(): Date {
  return new Date(Date.now() - DAY_START_MINUTES * 60_000);
}

// Slot for a real clock time: morning from 3:30 am, afternoon from 11 am, evening/night from 5 pm until the day rolls over.
export function slotFor(d: Date): Slot {
  const minutes = d.getHours() * 60 + d.getMinutes();
  if (minutes >= DAY_START_MINUTES && minutes < 11 * 60) return "morning";
  if (minutes >= 11 * 60 && minutes < 17 * 60) return "afternoon";
  return "evening";
}

export function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

export const visitorId = getVisitorId;

const keyOf = (v: View) => `${v.date}|${v.slot}`;

function mergeViews(...lists: View[][]): View[] {
  const map = new Map<string, View>();
  for (const list of lists) for (const v of list) if (!map.has(keyOf(v))) map.set(keyOf(v), v);
  return Array.from(map.values()).sort((a, b) => a.at.localeCompare(b.at));
}

function readLocal(): View[] {
  let current: View[] = [];
  let legacy: View[] = [];
  try {
    current = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {}
  try {
    // V1 stored only a date per day with no time or slot; count each as one morning view.
    const dates: string[] = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]");
    legacy = dates.map((date) => ({ date, slot: "morning" as Slot, at: new Date(`${date}T09:00:00`).toISOString() }));
  } catch {}
  return mergeViews(current, legacy);
}

function writeLocal(views: View[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(views.map(({ date, slot, at }) => ({ date, slot, at }))));
  } catch {}
}

function toRow(id: string, v: View) {
  return { visitor_id: id, view_date: v.date, slot: v.slot, viewed_at: v.at };
}

export function loadLocalViews() {
  return readLocal();
}

// Merges cloud and local views, stores the result locally, and pushes any local-only views to the cloud.
export async function loadViews(): Promise<View[]> {
  const local = readLocal();
  if (!supabase) return local;
  const id = visitorId();
  const { data, error } = await supabase.from("vision_board_views").select("view_date,slot,viewed_at").eq("visitor_id", id);
  if (error || !data) return local;
  const cloud: View[] = data.map((r) => ({ date: r.view_date, slot: r.slot as Slot, at: r.viewed_at, synced: true }));
  const merged = mergeViews(cloud, local);
  writeLocal(merged);
  const cloudKeys = new Set(cloud.map(keyOf));
  const missing = merged.filter((v) => !cloudKeys.has(keyOf(v)));
  if (missing.length) {
    const { error: pushError } = await supabase
      .from("vision_board_views")
      .upsert(missing.map((v) => toRow(id, v)), { onConflict: "visitor_id,view_date,slot", ignoreDuplicates: true });
    if (!pushError) missing.forEach((v) => (v.synced = true));
  }
  return merged;
}

export async function recordView(existing: View[], view: View): Promise<{ views: View[]; cloudOk: boolean }> {
  const views = mergeViews(existing, [view]);
  const saved = views.find((v) => keyOf(v) === keyOf(view))!;
  writeLocal(views);
  if (!supabase) return { views, cloudOk: false };
  const { error } = await supabase
    .from("vision_board_views")
    .upsert(toRow(visitorId(), view), { onConflict: "visitor_id,view_date,slot", ignoreDuplicates: true });
  if (!error) saved.synced = true;
  return { views, cloudOk: !error };
}

export function groupByDate(views: View[]) {
  const map = new Map<string, View[]>();
  for (const v of views) map.set(v.date, [...(map.get(v.date) || []), v]);
  return map;
}

// Consecutive days with all daily slots done. Today doesn't break the streak while it is still in progress.
export function completeStreak(byDate: Map<string, View[]>) {
  const d = logicalNow();
  const isComplete = (day: Date) => (byDate.get(dateKey(day))?.length || 0) >= DAILY_TARGET;
  if (!isComplete(d)) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (isComplete(d)) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
