import { supabase } from "./supabase";

export type ConnectionStatus = "checking" | "connected" | "not-connected";

const TIMEOUT_MS = 4000;

// Connected means: the site has Supabase configured AND the database answered a real request without error.
// A request that gets no answer within a few seconds counts as not connected (the client would otherwise keep retrying).
export async function checkSupabase(): Promise<ConnectionStatus> {
  if (!supabase) return "not-connected";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const { error } = await supabase
      .from("vision_board_views")
      .select("id", { count: "exact", head: true })
      .abortSignal(controller.signal);
    return error ? "not-connected" : "connected";
  } catch {
    return "not-connected";
  } finally {
    clearTimeout(timer);
  }
}
