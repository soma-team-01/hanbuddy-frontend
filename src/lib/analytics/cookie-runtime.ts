import {
  createCookieConsent,
  CONSENT_COOKIE,
  DECISION_COOKIE,
  type ConsentCookieJar,
  type ProofApi,
} from "./cookie-consent";
import { createCookieAnalytics } from "./cookie-controller";
import { createGoogleBrowser } from "./browser";
import type { AnalyticsPolicy } from "./policy";
import { validIdentifiers, type AnalyticsIdentifiers } from "./link";

type Request = typeof fetch;
const headers = { "Content-Type": "application/json", "X-Analytics-Request": "1" };
export function createProofApi(request: Request): ProofApi {
  async function call(path: string, body: object, extra: Record<string, string> = {}) {
    const response = await request(path, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { ...headers, ...extra },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok || payload?.isSuccess !== true || !payload.result)
      throw new Error("Analytics unavailable");
    return payload.result;
  }
  return {
    async issue(action) {
      const result = await call("/api/analytics/purchase-consent-proof", { action });
      if (typeof result.proof !== "string" || typeof result.expiresAt !== "string")
        throw new Error("Analytics unavailable");
      return { proof: result.proof, expiresAt: result.expiresAt };
    },
    async withdraw(proof) {
      const result = await call(
        "/api/analytics/purchase-withdrawal",
        {},
        { "X-Analytics-Proof": proof },
      );
      if (result.withdrawalAcknowledged !== true) throw new Error("Withdrawal pending");
    },
  };
}
export function createCookieJar(
  document: Pick<Document, "cookie">,
  changed: () => void = () => {},
): ConsentCookieJar {
  const read = (name: string) =>
    document.cookie
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(`${name}=`))
      ?.slice(name.length + 1) ?? "";
  const write = (name: string, value: string, maxAge: number) => {
    if (!/^[A-Za-z0-9_.-]*$/.test(value) || !Number.isSafeInteger(maxAge) || maxAge < 0)
      throw new Error("Invalid cookie");
    const previous = read(name);
    document.cookie = `${name}=${value}; Path=/; Secure; SameSite=Lax; Max-Age=${maxAge}`;
    if (read(name) !== previous) changed();
  };
  return {
    read: () => read(CONSENT_COOKIE),
    write: (v, a) => write(CONSENT_COOKIE, v, a),
    decision: () => read(DECISION_COOKIE),
    decide: (v, a) => write(DECISION_COOKIE, v, a),
  };
}
export function createPaymentLinker({
  proof,
  epoch,
  identifiers,
  request,
}: {
  proof: () => string | null;
  epoch: () => number;
  identifiers: () => Promise<AnalyticsIdentifiers>;
  request: Request;
}) {
  return {
    capture() {
      const original = proof(),
        generation = epoch();
      if (!original) return null;
      return {
        headers: { "X-Analytics-Request": "1" },
        async complete(applicationId: number, context: string | null) {
          const live = () => proof() === original && epoch() === generation;
          if (
            !live() ||
            !Number.isSafeInteger(applicationId) ||
            applicationId <= 0 ||
            !context ||
            !/^[a-f0-9]{64}$/.test(context)
          )
            return;
          try {
            const ids = await identifiers();
            if (!live() || !validIdentifiers(ids)) return;
            await request(`/api/applications/me/${applicationId}/analytics-link`, {
              method: "PUT",
              credentials: "same-origin",
              cache: "no-store",
              headers: { ...headers, "X-Analytics-Context": context },
              body: JSON.stringify({ clientId: ids.clientId, sessionId: ids.sessionId }),
            });
          } catch {
            /* Purchase preparation never waits on or fails because of late linkage. */
          }
        },
      };
    },
  };
}
let current: ReturnType<typeof createPaymentLinker> | null = null;
let authEpoch = 0;
const invalidators = new Set<() => void>();
export function invalidateAnalyticsAccount() {
  authEpoch++;
  invalidators.forEach((f) => {
    try {
      f();
    } catch {
      /* Authentication must remain usable. */
    }
  });
}
export function captureAnalyticsPayment() {
  return current?.capture() ?? null;
}

/** Inert until an explicit, complete policy and browser serialization support exist. */
export function createCookieRuntime(policy: AnalyticsPolicy, target: Window, document: Document) {
  let disposed = false;
  let supported =
    target.location.origin === policy.origin &&
    policy.origin.startsWith("https://") &&
    Boolean(target.navigator.locks) &&
    typeof BroadcastChannel !== "undefined";
  let channel: BroadcastChannel | null = null;
  if (supported) {
    try {
      channel = new BroadcastChannel("hanbuddy.analytics.cookie.v1");
    } catch {
      supported = false;
    }
  }
  const browser = createGoogleBrowser(target, document, policy.measurementId);
  const jar = createCookieJar(document, () => channel?.postMessage("consent"));
  const consent = createCookieConsent({
    policy,
    jar,
    api: createProofApi(target.fetch.bind(target)),
    exclusive: supported
      ? async (work) => await target.navigator.locks.request("hanbuddy.analytics.cookie.v1", work)
      : null,
  });
  const controller = createCookieAnalytics({ policy, consent, browser });
  const linker = createPaymentLinker({
    proof: () => (disposed ? null : consent.getProof()),
    epoch: () => authEpoch,
    identifiers: () => browser.identifiers(),
    request: target.fetch.bind(target),
  });
  const invalidate = () => channel?.postMessage("auth");
  invalidators.add(invalidate);
  if (supported) current = linker;
  if (channel)
    channel.onmessage = (event) => {
      if (event.data === "auth") authEpoch++;
      if (event.data === "consent") void controller.restore();
      // A denial must stop a peer even when both cookie writes were rejected.
      // Scope it to the observed decision so a delayed message cannot revoke a newer choice.
      if (event.data?.type === "deny" && typeof event.data.decision === "string") {
        try {
          if (event.data.decision === jar.decision()) void controller.reject();
        } catch {
          controller.suspend();
        }
      }
    };
  return {
    controller: {
      ...controller,
      async reject() {
        let decision = "";
        try {
          decision = jar.decision();
        } catch {
          /* Still stop locally. */
        }
        const pending = controller.reject();
        try {
          channel?.postMessage({ type: "deny", decision });
        } catch {
          /* Server revocation still proceeds. */
        }
        await pending;
      },
    },
    dispose() {
      disposed = true;
      authEpoch++;
      if (current === linker) current = null;
      invalidators.delete(invalidate);
      channel?.close();
      controller.dispose();
    },
  };
}
