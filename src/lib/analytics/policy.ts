import { APP_ORIGIN } from "@/lib/site";

export interface AnalyticsPolicy {
  measurementId: string;
  origin: string;
}

/** Optional collection is OFF unless both explicit settings are valid. */
export function readAnalyticsPolicy(
  env: Record<string, string | undefined>,
): AnalyticsPolicy | null {
  const id = env.GA_MEASUREMENT_ID;
  if (env.GA_ENABLED !== "true" || !id || !/^G-[A-Z0-9]+$/.test(id) || id.trim() !== id)
    return null;
  const origin = readAnalyticsPolicyOrigin(env);
  return origin ? { measurementId: id, origin } : null;
}

/** The same origin validation applies to collection and withdrawal. */
export function readAnalyticsPolicyOrigin(env: Record<string, string | undefined>): string | null {
  const origin = env.GA4_ORIGIN || APP_ORIGIN;
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" || url.origin !== origin || url.username || url.password)
      return null;
  } catch {
    return null;
  }
  return origin;
}
