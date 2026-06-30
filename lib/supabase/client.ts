import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseEnv, isSupabaseEnvConfigured } from "@/lib/env";

export function createClient(): SupabaseClient | null {
  if (!isSupabaseEnvConfigured()) {
    return null;
  }

  const { supabaseUrl, supabasePublishableKey } = getSupabaseEnv();
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
