import { APP_ORIGIN } from "@/lib/site";

export interface AnalyticsPolicy {
  measurementId?: string;
  pixelId?: string;
  origin: string;
}

/** Optional collection is OFF unless both explicit settings are valid. */
export function readAnalyticsPolicy(
  env: Record<string, string | undefined>,
): AnalyticsPolicy | null {
  const measurementId = env.GA_MEASUREMENT_ID;
  const pixelId = env.META_PIXEL_ID;
  const validMeasurementId =
    env.GA_ENABLED === "true" &&
    Boolean(
      measurementId &&
      /^G-[A-Z0-9]+$/.test(measurementId) &&
      measurementId.trim() === measurementId,
    );
  const validPixelId =
    env.META_PIXEL_ENABLED === "true" &&
    Boolean(pixelId && /^[1-9]\d{4,31}$/.test(pixelId) && pixelId.trim() === pixelId);
  if (!validMeasurementId && !validPixelId) return null;
  const origin = readAnalyticsPolicyOrigin(env);
  return origin
    ? {
        ...(validMeasurementId ? { measurementId } : {}),
        ...(validPixelId ? { pixelId } : {}),
        origin,
      }
    : null;
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
