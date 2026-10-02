import { createClient } from "@supabase/supabase-js";
import { getVisitorId } from "./identity";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// The sync code is sent with every request so database policies can limit access to that code's rows.
export const supabase =
  supabaseUrl && supabasePublishableKey
    ? createClient(supabaseUrl, supabasePublishableKey, { global: { headers: { "x-visitor-id": getVisitorId() } } })
    : null;
