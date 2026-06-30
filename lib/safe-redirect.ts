/** Blocks open redirects like //evil.com or javascript: URLs. */
export function sanitizeNextPath(next: string | null | undefined, fallback = "/") {
  if (!next || typeof next !== "string") {
    return fallback;
  }

  const trimmed = next.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes(":")) {
    return fallback;
  }

  return trimmed;
}
