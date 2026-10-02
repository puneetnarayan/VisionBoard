import { supabase } from "./supabase";

export const cloudConfigured = !!supabase;

// Label shown next to saved data: only "saved in Supabase" once the database has confirmed the write.
export function syncLabel(synced?: boolean) {
  if (synced) return { text: "☁ Saved in Supabase", state: "synced" as const };
  if (cloudConfigured) return { text: "⚠ This device only — not in Supabase", state: "local" as const };
  return { text: "This device only (Supabase not configured)", state: "local" as const };
}
