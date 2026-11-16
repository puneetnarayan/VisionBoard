import { supabase } from "./supabase";

export type ConnectionStatus = "checking" | "connected" | "not-connected";
export type DbState = { status: ConnectionStatus; bytes?: number };

const TIMEOUT_MS = 4000;

export function formatBytes(n: number) {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

// Connected means: the site has Supabase configured AND the database answered a real request without error.
// A request that gets no answer within a few seconds counts as not connected (the client would otherwise keep retrying).
export async function checkSupabase(): Promise<DbState> {
  if (!supabase) return { status: "not-connected" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const { error } = await supabase
      .from("vision_board_views")
      .select("id", { count: "exact", head: true })
      .abortSignal(controller.signal);
    if (error) return { status: "not-connected" };
    const usage = await supabase.rpc("vision_board_usage").abortSignal(controller.signal);
    return { status: "connected", bytes: typeof usage.data === "number" ? usage.data : undefined };
  } catch {
    return { status: "not-connected" };
  } finally {
    clearTimeout(timer);
  }
}

export async function checkNeon(): Promise<DbState> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch("/api/status", { cache: "no-store", signal: controller.signal });
    if (!res.ok) return { status: "not-connected" };
    const data = await res.json();
    return data.connected ? { status: "connected", bytes: data.bytes } : { status: "not-connected" };
  } catch {
    return { status: "not-connected" };
  } finally {
    clearTimeout(timer);
  }
}
