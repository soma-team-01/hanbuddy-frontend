import {
  createCookieConsent,
  CONSENT_COOKIE,
  DECISION_COOKIE,
  LEGACY_CONSENT_COOKIE,
  LEGACY_DECISION_COOKIE,
  type ConsentCookieJar,
  type ProofApi,
} from "./cookie-consent";
import { createCookieAnalytics } from "./cookie-controller";
import { createMeasurementBrowser } from "./browser";
import type { AnalyticsPolicy } from "./policy";
import { validIdentifiers, type AnalyticsIdentifiers } from "./link";

type Request = typeof fetch;
const headers = { "Content-Type": "application/json", "X-Analytics-Request": "1" };
const ANALYTICS_REQUEST_TIMEOUT_MS = 3000;
const ACCOUNT_INVALIDATION_TIMEOUT_MS = 3000;

async function withAnalyticsTimeout<T>(work: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("Analytics unavailable"));
    }, ANALYTICS_REQUEST_TIMEOUT_MS);
  });
  try {
    return await Promise.race([work(controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

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
  storage?: Pick<Storage, "getItem" | "setItem"> & Partial<Pick<Storage, "removeItem">>,
): ConsentCookieJar {
  const read = (name: string) =>
    document.cookie
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(`${name}=`))
      ?.slice(name.length + 1) ?? "";
  const write = (name: string, value: string, maxAge?: number) => {
    if (
      !/^[A-Za-z0-9_.-]*$/.test(value) ||
      (maxAge !== undefined && (!Number.isSafeInteger(maxAge) || maxAge < 0))
    )
      throw new Error("Invalid cookie");
    const previous = read(name);
    const maxAgeAttribute = maxAge === undefined ? "" : `; Max-Age=${maxAge}`;
    document.cookie = `${name}=${value}; Path=/; Secure; SameSite=Lax${maxAgeAttribute}`;
    if (read(name) !== previous) changed();
  };
  write(LEGACY_CONSENT_COOKIE, "", 0);
  try {
    storage?.removeItem?.(LEGACY_DECISION_COOKIE);
  } catch {
    /* Legacy state is ignored even when storage deletion is blocked. */
  }
  return {
    read: () => read(CONSENT_COOKIE),
    write: (v, a) => write(CONSENT_COOKIE, v, a),
    decision: () => (storage ? (storage.getItem(DECISION_COOKIE) ?? "") : read(DECISION_COOKIE)),
    decide: (v, a) => {
      if (!storage) return write(DECISION_COOKIE, v, a);
      if (!/^(accept|denied)\.[A-Za-z0-9_-]{43}$/.test(v)) throw new Error("Invalid decision");
      const previous = storage.getItem(DECISION_COOKIE);
      // Only a choice/generation marker is persistent; never the server opaque proof.
      storage.setItem(DECISION_COOKIE, v);
      if (storage.getItem(DECISION_COOKIE) !== previous) changed();
    },
  };
}
export function createPaymentLinker({
  proof,
  epoch,
  origin,
  identifiers,
  request,
}: {
  proof: () => string | null;
  epoch: () => number;
  origin: string;
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
            const { registered, registration } = await withAnalyticsTimeout(async (signal) => {
              const registered = await request(
                `/api/applications/me/${applicationId}/analytics-consent`,
                {
                  method: "POST",
                  credentials: "same-origin",
                  cache: "no-store",
                  headers,
                  body: "{}",
                  signal,
                },
              );
              return { registered, registration: await registered.json().catch(() => null) };
            });
            if (!registered.ok || !live()) return;
            if (registration?.isSuccess !== true || registration.result?.registered !== true)
              return;
            const ids = await identifiers();
            if (!live() || !validIdentifiers(ids, origin)) return;
            await withAnalyticsTimeout((signal) =>
              request(`/api/applications/me/${applicationId}/analytics-link`, {
                method: "PUT",
                credentials: "same-origin",
                cache: "no-store",
                headers: { ...headers, "X-Analytics-Context": context },
                body: JSON.stringify(ids),
                signal,
              }),
            );
          } catch {
            /* Measurement failure never turns a successful payment preparation into an error. */
          }
        },
      };
    },
  };
}
let current: ReturnType<typeof createPaymentLinker> | null = null;
let authEpoch = 0;
const invalidators = new Set<() => Promise<void>>();
export async function invalidateAnalyticsAccount() {
  authEpoch++;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, ACCOUNT_INVALIDATION_TIMEOUT_MS);
  });
  try {
    await Promise.race([
      Promise.allSettled([...invalidators].map((invalidate) => invalidate())).then(() => undefined),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}
export function captureAnalyticsPayment() {
  return current?.capture() ?? null;
}

/** Inert until an explicit, complete policy and browser serialization support exist. */
export function createCookieRuntime(policy: AnalyticsPolicy, target: Window, document: Document) {
  let disposed = false;
  let storage: Storage | undefined;
  try {
    storage = target.localStorage;
  } catch {
    /* Fail closed when choice storage is blocked. */
  }
  let supported =
    target.location.origin === policy.origin &&
    policy.origin.startsWith("https://") &&
    Boolean(target.navigator.locks) &&
    Boolean(storage) &&
    typeof BroadcastChannel !== "undefined";
  let channel: BroadcastChannel | null = null;
  if (supported) {
    try {
      channel = new BroadcastChannel("hanbuddy.analytics.cookie.v1");
    } catch {
      supported = false;
    }
  }
  const browser = createMeasurementBrowser(target, document, policy);
  const jar = createCookieJar(document, () => channel?.postMessage("consent"), storage);
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
    origin: policy.origin,
    identifiers: () => browser.identifiers(),
    request: target.fetch.bind(target),
  });
  const invalidate = async () => {
    controller.suspend();
    channel?.postMessage("auth");
    await controller.restore();
  };
  invalidators.add(invalidate);
  if (supported) current = linker;
  if (channel)
    channel.onmessage = (event) => {
      if (event.data === "auth") {
        authEpoch++;
        controller.suspend();
        void controller.restore();
      }
      if (event.data === "consent") {
        void controller.restore();
      }
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
