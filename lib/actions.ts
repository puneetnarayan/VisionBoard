import { supabase } from "./supabase";
import { dateKey, visitorId } from "./views";

export type Action = { id: string; area: string; week: string; text: string; done: boolean };

export const MAX_ACTIONS_PER_AREA = 3;
const LOCAL_KEY = "visionboard_actions_v1";

// Monday of the week containing d, as YYYY-MM-DD.
export function weekKey(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return dateKey(x);
}

export function newActionId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `a-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function loadLocalActions(): Action[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveLocalActions(actions: Action[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(actions));
  } catch {}
}

const toRow = (a: Action) => ({
  visitor_id: visitorId(),
  client_id: a.id,
  area: a.area,
  week_start: a.week,
  text: a.text,
  done: a.done,
  updated_at: new Date().toISOString(),
});

// Cloud rows win for actions present in both places; local-only actions are pushed to the cloud.
export async function loadActions(): Promise<Action[]> {
  const local = loadLocalActions();
  if (!supabase) return local;
  const { data, error } = await supabase
    .from("vision_board_actions")
    .select("client_id,area,week_start,text,done")
    .eq("visitor_id", visitorId());
  if (error || !data) return local;
  const cloud: Action[] = data.map((r) => ({ id: r.client_id, area: r.area, week: r.week_start, text: r.text, done: r.done }));
  const cloudIds = new Set(cloud.map((a) => a.id));
  const localOnly = local.filter((a) => !cloudIds.has(a.id));
  if (localOnly.length) await supabase.from("vision_board_actions").upsert(localOnly.map(toRow), { onConflict: "visitor_id,client_id" });
  const merged = [...cloud, ...localOnly];
  saveLocalActions(merged);
  return merged;
}

export async function syncAction(a: Action) {
  if (!supabase) return true;
  const { error } = await supabase.from("vision_board_actions").upsert(toRow(a), { onConflict: "visitor_id,client_id" });
  return !error;
}

export async function removeAction(id: string) {
  if (!supabase) return true;
  const { error } = await supabase.from("vision_board_actions").delete().eq("visitor_id", visitorId()).eq("client_id", id);
  return !error;
}
