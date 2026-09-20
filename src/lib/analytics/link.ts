export interface ConsentGrant {
  consentId: string;
  policyVersion: string;
  expiresAt: number;
}
export interface AnalyticsIdentifiers {
  clientId: string;
  sessionId?: string;
  fbp?: string;
  fbc?: string;
  eventSourceUrl?: string;
}
export interface ConsentLinkPort {
  grant: (grant: ConsentGrant) => Promise<void>;
  link: (context: Omit<ConsentGrant, "expiresAt"> & AnalyticsIdentifiers) => Promise<void>;
  revoke: (consentId: string) => Promise<void>;
}
const ANALYTICS_PAGE_PATHS = new Set([
  "/",
  "/explore",
  "/login",
  "/onboarding",
  "/buddy/onboarding",
  "/applications",
  "/activities/detail",
  "/activities/booking",
]);

export function validSessionId(value: string): boolean {
  return /^[1-9]\d{0,18}$/.test(value);
}
export function validFbp(value: string): boolean {
  return (
    value.length <= 512 &&
    /^[\x20-\x7E]+$/.test(value) &&
    /^fb\.[0-9]+\.[0-9]{13}\.[0-9]+(?:\.[A-Za-z0-9_-]+)*$/.test(value)
  );
}
export function validFbc(value: string): boolean {
  return (
    value.length <= 512 &&
    /^[\x20-\x7E]+$/.test(value) &&
    /^fb\.[0-9]+\.[0-9]{13}\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/.test(value)
  );
}
export function validEventSourceUrl(value: string, origin: string): boolean {
  if (value.length > 512 || !/^[\x20-\x7E]+$/.test(value)) return false;
  try {
    const url = new URL(value);
    return (
      value === `${url.origin}${url.pathname}` &&
      url.protocol === "https:" &&
      url.origin === origin &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      ANALYTICS_PAGE_PATHS.has(url.pathname)
    );
  } catch {
    return false;
  }
}
export function validIdentifiers(value: AnalyticsIdentifiers, origin?: string): boolean {
  const hasFbp = value.fbp !== undefined;
  const hasFbc = value.fbc !== undefined;
  const hasSource = value.eventSourceUrl !== undefined;
  const validMeta =
    !hasFbp && !hasFbc && !hasSource
      ? true
      : Boolean(
          origin &&
          hasSource &&
          (hasFbp || hasFbc) &&
          (!hasFbp || validFbp(value.fbp!)) &&
          (!hasFbc || validFbc(value.fbc!)) &&
          validEventSourceUrl(value.eventSourceUrl!, origin),
        );
  return (
    /^\d{1,20}\.\d{1,20}$/.test(value.clientId) &&
    (value.sessionId === undefined || validSessionId(value.sessionId)) &&
    validMeta
  );
}

/** The request binding is supplied only after the counterpart BFF contract is published. */
export function createConsentLinkPort(
  request: (operation: "grant" | "link" | "revoke", body: object) => Promise<void>,
): ConsentLinkPort {
  return {
    grant: async ({ consentId, policyVersion, expiresAt }) =>
      request("grant", { consentId, policyVersion, expiresAt }),
    link: async ({ consentId, policyVersion, clientId, sessionId }) => {
      if (!validIdentifiers({ clientId, sessionId })) throw new Error("Invalid analytics context");
      await request("link", { consentId, policyVersion, clientId, sessionId });
    },
    revoke: async (consentId) => request("revoke", { consentId }),
  };
}
