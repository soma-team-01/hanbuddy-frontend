export interface AnalyticsPolicy {
  measurementId: string;
  origin: string;
  version: string;
  consentMaxAgeMs: number;
  cookieMaxAgeSeconds: number;
}

/** Missing approval evidence or retention values disables collection; there are no policy defaults. */
export function readAnalyticsPolicy(
  env: Record<string, string | undefined>,
): AnalyticsPolicy | null {
  const { GA_MEASUREMENT_ID: measurementId, GA_ORIGIN: origin, GA_POLICY_VERSION: version } = env;
  const consentMaxAgeMs = Number(env.GA_CONSENT_MAX_AGE_SECONDS) * 1000;
  const cookieMaxAgeSeconds = Number(env.GA_COOKIE_MAX_AGE_SECONDS);
  if (
    env.GA_ENABLED !== "true" ||
    env.GA_DESTINATION_VERIFIED !== "true" ||
    env.GA_AUTOMATIC_COLLECTION_DISABLED !== "true" ||
    !measurementId ||
    !/^G-[A-Z0-9]+$/.test(measurementId) ||
    !version ||
    !/^[a-zA-Z0-9_-]{1,64}$/.test(version) ||
    !origin ||
    !Number.isSafeInteger(consentMaxAgeMs) ||
    consentMaxAgeMs <= 0 ||
    !Number.isSafeInteger(cookieMaxAgeSeconds) ||
    cookieMaxAgeSeconds <= 0
  )
    return null;
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" || url.origin !== origin || url.username || url.password)
      return null;
  } catch {
    return null;
  }
  return { measurementId, origin, version, consentMaxAgeMs, cookieMaxAgeSeconds };
}
