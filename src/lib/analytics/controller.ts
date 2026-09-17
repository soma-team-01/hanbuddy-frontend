import {
  eventFields,
  pageFields,
  safePage,
  type AnalyticsEvent,
  type FunnelEvent,
  type SafePage,
} from "./events";
import type { AnalyticsIdentifiers, ConsentLinkPort } from "./link";
import type { AnalyticsPolicy } from "./policy";

export const CONSENT_KEY = "hanbuddy.gaConsent.v1";
type ConsentState = "unanswered" | "granted" | "denied";
interface ConsentRecord {
  id: string;
  version: string;
  expiresAt: number;
  state: "granted" | "denied";
}
export interface AnalyticsBrowserPort {
  start: (policy: AnalyticsPolicy, page: ReturnType<typeof pageFields>) => Promise<void>;
  send: (
    name: AnalyticsEvent,
    params: ReturnType<typeof pageFields> & { items?: { item_id: string }[] },
  ) => void;
  identifiers: () => Promise<AnalyticsIdentifiers>;
  stop: (resetIdentity?: boolean) => void;
}
interface Options {
  policy: AnalyticsPolicy | null;
  link: ConsentLinkPort | null;
  browser: AnalyticsBrowserPort;
  storage: Pick<Storage, "getItem" | "setItem"> & Partial<Pick<Storage, "removeItem">>;
  now?: () => number;
  newId?: () => string;
}

export function createAnalytics({
  policy,
  link,
  browser,
  storage,
  now = Date.now,
  newId = () => crypto.randomUUID(),
}: Options) {
  let state: ConsentState = "unanswered";
  let revision = 0;
  let record: ConsentRecord | null = null;
  // At most one additional shared epoch: do not observe/adopt more while this
  // withdrawal is unacknowledged. The backend must enforce the scope barrier.
  let pendingWithdrawal: ConsentRecord | null = null;
  let page: SafePage | null = null;
  let active = false;
  let generation = 0;
  let starting: Promise<void> | null = null;
  let restartRequested = false;
  let expiryTimer: ReturnType<typeof setTimeout> | null = null;
  let pageSent = false;
  const seen = new Set<string>();
  const listeners = new Set<() => void>();
  const enabled = Boolean(policy && link);
  const notify = () => {
    revision++;
    listeners.forEach((listener) => listener());
  };
  const setState = (next: ConsentState) => {
    if (state !== next) {
      state = next;
      notify();
    }
  };
  function stop(resetIdentity = false) {
    restartRequested = false;
    generation++;
    active = false;
    if (expiryTimer) clearTimeout(expiryTimer);
    expiryTimer = null;
    browser.stop(resetIdentity);
    if (!resetIdentity) armExpiry();
  }
  function armExpiry() {
    if (expiryTimer) clearTimeout(expiryTimer);
    if (!record || state !== "granted") return;
    expiryTimer = setTimeout(
      () => {
        if (allowed()) armExpiry();
      },
      Math.min(Math.max(0, record.expiresAt - now()), 2147483647),
    );
  }
  function read(): ConsentRecord | null {
    try {
      const value = JSON.parse(storage.getItem(CONSENT_KEY) || "null");
      if (
        !value ||
        !/^[a-f0-9-]{36}$/.test(value.id) ||
        typeof value.version !== "string" ||
        !Number.isSafeInteger(value.expiresAt) ||
        !["granted", "denied"].includes(value.state)
      )
        return null;
      return {
        id: value.id,
        version: value.version,
        expiresAt: value.expiresAt,
        state: value.state,
      };
    } catch {
      return null;
    }
  }
  function persist(value: ConsentRecord) {
    try {
      storage.setItem(CONSENT_KEY, JSON.stringify(value));
      return true;
    } catch {
      if (value.state === "denied") {
        try {
          storage.removeItem?.(CONSENT_KEY);
        } catch {
          /* Backend revocation is still required even when all local storage writes fail. */
        }
      }
      return false;
    }
  }
  async function revoke(id: string) {
    try {
      await link?.revoke(id);
      return true;
    } catch {
      return false;
    }
  }
  async function retryWithdrawal() {
    if (!pendingWithdrawal) return true;
    const pending = pendingWithdrawal;
    stop(true);
    setState("denied");
    const intent = generation;
    if (!(await revoke(pending.id))) return false;
    if (pendingWithdrawal === pending) pendingWithdrawal = null;
    return generation === intent;
  }
  function allowed() {
    const stored = read();
    const valid =
      enabled &&
      state === "granted" &&
      stored?.state === "granted" &&
      stored.id === record?.id &&
      stored.version === policy?.version &&
      stored.expiresAt > now();
    if (!valid && state === "granted") {
      stop(stored?.id === record?.id || !stored || stored.state === "denied");
      setState("denied");
      if (record) {
        record = { ...record, state: "denied" };
        if (stored?.id === record.id) persist(record);
        void revoke(record.id);
      }
    }
    return valid;
  }
  function sendPage() {
    if (!active || !page || pageSent || !policy || !allowed()) return;
    pageSent = true;
    try {
      browser.send("page_view", pageFields(page, policy.origin));
    } catch {
      stop();
    }
  }
  async function start() {
    if (!allowed() || !page || !policy || !link || active) return;
    if (starting) {
      restartRequested = true;
      return starting;
    }
    armExpiry();
    const epoch = generation;
    const consent = record!;
    const live = () => generation === epoch && allowed() && page !== null;
    starting = (async () => {
      try {
        await link.grant({
          consentId: consent.id,
          policyVersion: consent.version,
          expiresAt: consent.expiresAt,
        });
        if (!live()) {
          if (state !== "granted" || record?.id !== consent.id) await revoke(consent.id);
          return;
        }
        await browser.start(policy, pageFields(page!, policy.origin));
        if (!live()) {
          browser.stop();
          return;
        }
        // Browser events precede application creation. Identifier lookup and
        // application-owned purchase linkage belong to a separate, future binding.
        active = true;
        sendPage();
        notify();
      } catch {
        if (generation === epoch) {
          stop(true);
          setState("denied");
          record = { ...consent, state: "denied" };
          if (read()?.id === consent.id) persist(record);
          await revoke(consent.id);
        }
      } finally {
        starting = null;
        const restart = restartRequested;
        restartRequested = false;
        if (restart && state === "granted" && page) void start();
      }
    })();
    return starting;
  }
  function canRestore(stored: ConsentRecord | null) {
    return (
      stored?.state === "granted" && stored.version === policy?.version && stored.expiresAt > now()
    );
  }
  async function retireStored(stored: ConsentRecord) {
    pendingWithdrawal = stored;
    if (!(await revoke(stored.id))) {
      stop(true);
      setState("denied");
      return false;
    }
    if (pendingWithdrawal === stored) pendingWithdrawal = null;
    return true;
  }
  return {
    enabled,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => state,
    getRevision: () => revision,
    isActive: () => active && allowed(),
    async accept() {
      if (!enabled || !policy) return;
      if (pendingWithdrawal && !(await retryWithdrawal())) return;
      // Repeated clicks do not create competing consent epochs.
      if (state === "granted" && allowed()) {
        await start();
        return;
      }
      // Reconcile shared state before minting an epoch. A failed retirement keeps
      // the old record locally; no new grant can discard that revocation handle.
      const stored = read();
      if (canRestore(stored)) {
        await this.restore();
        return;
      }
      const intent = ++generation;
      const previous = record;
      if (previous && !(await revoke(previous.id))) return;
      if (generation !== intent) return;
      if (stored && stored.id !== previous?.id && !(await retireStored(stored))) return;
      if (generation !== intent) return;
      // Awaited revocations may have overlapped another tab's decision.
      if (JSON.stringify(read()) !== JSON.stringify(stored)) return;
      const next: ConsentRecord = {
        id: newId(),
        version: policy.version,
        expiresAt: now() + policy.consentMaxAgeMs,
        state: "granted",
      };
      if (!persist(next)) {
        stop();
        setState("denied");
        return;
      }
      record = next;
      setState("granted");
      armExpiry();
      await start();
    },
    async reject() {
      stop(true);
      setState("denied");
      if (pendingWithdrawal && !(await retryWithdrawal())) return;
      const previous = record;
      const stored = read();
      if (!enabled || !policy) return;
      const denied: ConsentRecord = {
        id: stored?.id ?? previous?.id ?? newId(),
        version: stored?.version ?? previous?.version ?? policy.version,
        expiresAt: stored?.expiresAt ?? previous?.expiresAt ?? now() + policy.consentMaxAgeMs,
        state: "denied",
      };
      // Write the currently observed shared epoch, never this tab's stale one.
      persist(denied);
      const intent = generation;
      record = previous ? { ...previous, state: "denied" } : denied;
      pendingWithdrawal = denied.id !== record.id ? denied : null;
      const results = await Promise.all([
        revoke(record.id),
        ...(denied.id !== record.id ? [revoke(denied.id)] : []),
      ]);
      if (pendingWithdrawal === denied && results[1]) pendingWithdrawal = null;
      if (generation === intent && results.every(Boolean)) record = denied;
    },
    async restore() {
      if (!enabled) return;
      if (pendingWithdrawal && !(await retryWithdrawal())) return;
      let retiredId: string | null = null;
      const stored = read();
      if (record && (record.id !== stored?.id || record.state === "denied")) {
        const previous = record;
        stop(!stored || stored.state === "denied");
        setState("denied");
        record = { ...previous, state: "denied" };
        const intent = generation;
        if (!(await revoke(previous.id)) || generation !== intent) return;
        retiredId = previous.id;
        // A concurrent decision must be handled by its next notification/action.
        if (JSON.stringify(read()) !== JSON.stringify(stored)) return;
      }
      if (!stored) {
        stop(true);
        record = null;
        setState("unanswered");
        return;
      }
      if (record?.id !== stored.id || stored.state !== "granted") stop();
      record = stored;
      if (
        stored.id === retiredId ||
        stored.state === "denied" ||
        stored.expiresAt <= now() ||
        stored.version !== policy?.version
      ) {
        record = { ...stored, state: "denied" };
        persist(record);
        stop(true);
        setState("denied");
        if (stored.id !== retiredId) await revoke(stored.id);
        return;
      }
      setState("granted");
      armExpiry();
      await start();
    },
    visit(pathname: string) {
      const next = safePage(pathname);
      if (next?.key !== page?.key) {
        seen.clear();
        pageSent = false;
      }
      page = next;
      if (!next) {
        stop();
        return;
      }
      sendPage();
    },
    track(name: FunnelEvent, pathname: string, activityId: number) {
      this.visit(pathname);
      if (!active || !allowed() || !policy || !page) return false;
      const fields = eventFields(name, page, activityId, policy.origin);
      if (!fields) return false;
      const key = `${name}:${activityId}`;
      if (name !== "booking_cta_click" && seen.has(key)) return false;
      if (name !== "booking_cta_click") seen.add(key);
      try {
        browser.send(name, fields);
        return true;
      } catch {
        stop();
        return false;
      }
    },
    suspend: () => stop(),
  };
}
export type AnalyticsController = ReturnType<typeof createAnalytics>;
