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
  try {
    const url = new URL(APP_ORIGIN);
    if (url.protocol !== "https:" || url.origin !== APP_ORIGIN || url.username || url.password)
      return null;
  } catch {
    return null;
  }
  return { measurementId: id, origin: APP_ORIGIN };
}
