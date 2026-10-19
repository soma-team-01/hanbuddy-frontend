import type { NextRequest } from "next/server";

/** Trust deployment configuration, never Host or forwarded headers supplied by a request. */
export function isTrustedAuthOrigin(request: NextRequest): boolean {
  const configuredOrigin = process.env.AUTH_ORIGIN;
  let expectedOrigin = request.nextUrl.origin;
  if (configuredOrigin) {
    try {
      const url = new URL(configuredOrigin);
      if (url.protocol !== "https:" || url.origin !== configuredOrigin) return false;
      expectedOrigin = url.origin;
    } catch {
      return false;
    }
  } else if (process.env.NODE_ENV === "production") {
    // A missing deployment value must not fall back to an internal/attacker-selected host.
    return false;
  }

  const origin = request.headers.get("origin");
  if (origin !== null) return origin === expectedOrigin;
  // Preserve non-browser API clients, but do not accept explicit cross-site browser requests.
  return request.headers.get("sec-fetch-site") !== "cross-site";
}
