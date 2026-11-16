import { getVisitorId } from "./identity";

// Actions are permanent items per life area (no week). `synced` is in-memory only:
// true once Neon has confirmed the latest version of this action.
export type Action = { id: string; area: string; text: string; done: boolean; synced?: boolean };

const LOCAL_KEY = "visionboard_actions_v1";
const API = "/api/actions";

export function newActionId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `a-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Older versions stored a `week` field; it is simply ignored now.
export function loadLocalActions(): Action[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    return Array.isArray(raw) ? raw.map(({ id, area, text, done }) => ({ id, area, text, done: !!done })) : [];
  } catch {
    return [];
  }
}

export function saveLocalActions(actions: Action[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(actions.map(({ id, area, text, done }) => ({ id, area, text, done }))));
  } catch {}
}

const headers = () => ({ "content-type": "application/json", "x-visitor-id": getVisitorId() });
const payload = (a: Action) => ({ id: a.id, area: a.area, text: a.text, done: a.done });

// Resolves true only when Neon confirmed the write.
async function put(list: Action[]) {
  try {
    for (let i = 0; i < list.length; i += 200) {
      const res = await fetch(API, { method: "PUT", headers: headers(), body: JSON.stringify({ actions: list.slice(i, i + 200).map(payload) }) });
      if (!res.ok) return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Cloud rows win for actions present in both places; local-only actions are pushed to the cloud.
export async function loadActions(): Promise<Action[]> {
  const local = loadLocalActions();
  try {
    const res = await fetch(API, { headers: headers(), cache: "no-store" });
    if (!res.ok) return local;
    const { actions } = (await res.json()) as { actions: { client_id: string; area: string; text: string; done: boolean }[] };
    const cloud: Action[] = actions.map((r) => ({ id: r.client_id, area: r.area, text: r.text, done: r.done, synced: true }));
    const cloudIds = new Set(cloud.map((a) => a.id));
    const localOnly = local.filter((a) => !cloudIds.has(a.id));
    if (localOnly.length && (await put(localOnly))) localOnly.forEach((a) => (a.synced = true));
    const merged = [...cloud, ...localOnly];
    saveLocalActions(merged);
    return merged;
  } catch {
    return local;
  }
}

export const syncAction = (a: Action) => put([a]);

export async function removeAction(id: string) {
  try {
    const res = await fetch(`${API}?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: headers() });
    return res.ok;
  } catch {
    return false;
  }
}
