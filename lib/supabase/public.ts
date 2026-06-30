import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv, isSupabaseEnvConfigured } from "@/lib/env";

/** Read-only Supabase client for public data — no cookies, safe to cache. */
export function getPublicSupabase() {
  if (!isSupabaseEnvConfigured()) {
    throw new Error("Missing Supabase environment variables.");
  }

  const { supabaseUrl, supabasePublishableKey } = getSupabaseEnv();
  return createClient(supabaseUrl, supabasePublishableKey);
}
