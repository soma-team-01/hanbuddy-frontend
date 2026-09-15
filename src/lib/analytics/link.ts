export interface ConsentGrant {
  consentId: string;
  policyVersion: string;
  expiresAt: number;
}
export interface AnalyticsIdentifiers {
  clientId: string;
  sessionId: string;
}
export interface ConsentLinkPort {
  grant: (grant: ConsentGrant) => Promise<void>;
  link: (context: Omit<ConsentGrant, "expiresAt"> & AnalyticsIdentifiers) => Promise<void>;
  revoke: (consentId: string) => Promise<void>;
}

export function validIdentifiers(value: AnalyticsIdentifiers): boolean {
  return /^\d{1,20}\.\d{1,20}$/.test(value.clientId) && /^\d{1,20}$/.test(value.sessionId);
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
