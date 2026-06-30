/** Cookie/demo booking fallbacks are for local dev only — not production. */
export function isDemoFallbackEnabled() {
  return process.env.NODE_ENV !== "production";
}

/**
 * Demo map spots: on in dev by default, off in production unless explicitly enabled.
 * Set NEXT_PUBLIC_ENABLE_DEMO_SPOTS=true in .env.local to show demos in production.
 */
export function areDemoSpotsEnabled() {
  const flag = process.env.NEXT_PUBLIC_ENABLE_DEMO_SPOTS?.trim().toLowerCase();

  if (flag === "true" || flag === "1") {
    return true;
  }

  if (flag === "false" || flag === "0") {
    return false;
  }

  return process.env.NODE_ENV !== "production";
}
