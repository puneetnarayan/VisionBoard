import { supabase } from "./supabase";

export type Slot = "morning" | "afternoon" | "evening";
export type View = { date: string; slot: Slot; at: string };

export const SLOTS: { id: Slot; label: string; icon: string; hours: string }[] = [
  { id: "morning", label: "Morning", icon: "🌅", hours: "5 am – 12 pm" },
  { id: "afternoon", label: "Afternoon", icon: "☀️", hours: "12 pm – 5 pm" },
  { id: "evening", label: "Evening", icon: "🌙", hours: "5 pm – 5 am" },
];
export const DAILY_TARGET = SLOTS.length;

const LOCAL_KEY = "visionboard_views_v2";
const LEGACY_KEY = "visionboard_views";
const VISITOR_KEY = "visionboard_visitor_id";

export function dateKey(d: Date) {
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

export function parseDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function slotFor(d: Date): Slot {
  const h = d.getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  return "evening";
}

export function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function visitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `vb-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "anonymous-browser";
  }
}

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
    localStorage.setItem(LOCAL_KEY, JSON.stringify(views));
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
  const cloud: View[] = data.map((r) => ({ date: r.view_date, slot: r.slot as Slot, at: r.viewed_at }));
  const merged = mergeViews(cloud, local);
  writeLocal(merged);
  const cloudKeys = new Set(cloud.map(keyOf));
  const missing = merged.filter((v) => !cloudKeys.has(keyOf(v)));
  if (missing.length) {
    await supabase
      .from("vision_board_views")
      .upsert(missing.map((v) => toRow(id, v)), { onConflict: "visitor_id,view_date,slot", ignoreDuplicates: true });
  }
  return merged;
}

export async function recordView(existing: View[], view: View): Promise<{ views: View[]; cloudOk: boolean }> {
  const views = mergeViews(existing, [view]);
  writeLocal(views);
  if (!supabase) return { views, cloudOk: false };
  const { error } = await supabase
    .from("vision_board_views")
    .upsert(toRow(visitorId(), view), { onConflict: "visitor_id,view_date,slot", ignoreDuplicates: true });
  return { views, cloudOk: !error };
}

export function groupByDate(views: View[]) {
  const map = new Map<string, View[]>();
  for (const v of views) map.set(v.date, [...(map.get(v.date) || []), v]);
  return map;
}

// Consecutive days with all daily slots done. Today doesn't break the streak while it is still in progress.
export function completeStreak(byDate: Map<string, View[]>) {
  const d = new Date();
  const isComplete = (day: Date) => (byDate.get(dateKey(day))?.length || 0) >= DAILY_TARGET;
  if (!isComplete(d)) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (isComplete(d)) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
