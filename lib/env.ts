type SupabaseEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
};

function missingSupabaseKeys(): string[] {
  const missing: string[] = [];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() &&
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  ) {
    missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  return missing;
}

export function isSupabaseEnvConfigured() {
  return missingSupabaseKeys().length === 0;
}

export function getSupabaseEnv(): SupabaseEnv {
  const missing = missingSupabaseKeys();

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    supabasePublishableKey: (
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ).trim()
  };
}

export function isMapboxConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim());
}

export function getMapboxToken() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim();
  if (!token) {
    throw new Error("Missing NEXT_PUBLIC_MAPBOX_TOKEN");
  }
  return token;
}

/** @deprecated Use getSupabaseEnv — kept for callers that need all public env. */
export function getPublicEnv() {
  return {
    ...getSupabaseEnv(),
    mapboxToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ?? ""
  };
}

export function isPublicEnvConfigured() {
  return isSupabaseEnvConfigured();
}
