import type { AnalyticsPolicy } from "./policy";

export const CONSENT_COOKIE = "__Host-hb_ga_consent";
export const DECISION_COOKIE = "__Host-hb_ga_decision";
export interface ConsentCookieJar {
  read(): string;
  write(value: string, maxAgeSeconds?: number): void;
  decision(): string;
  decide(value: string, maxAgeSeconds?: number): void;
}
export interface ProofApi {
  issue(action: "ACCEPT" | "RESTORE"): Promise<{ proof: string; expiresAt: string }>;
  withdraw(deniedProof: string): Promise<void>;
}
export type Exclusive = <T>(work: () => Promise<T>) => Promise<T>;

/** Syntax only: 32 random bytes in canonical unpadded base64url; state lives on the server. */
export function parseProof(value: string) {
  const match = /^(granted|denied)\.v2\.([A-Za-z0-9_-]{42}[AEIMQUYcgkosw048])$/.exec(value);
  return match ? { value, granted: match[1] === "granted", id: match[2] } : null;
}
export const deniedProof = (value: string) => value.replace(/^granted\./, "denied.");

export function createCookieConsent({
  policy,
  jar,
  api,
  exclusive,
  now = Date.now,
  newId = () => crypto.randomUUID(),
}: {
  policy: AnalyticsPolicy | null;
  jar: ConsentCookieJar;
  api: ProofApi;
  exclusive: Exclusive | null;
  now?: () => number;
  newId?: () => string;
}) {
  let ready = "",
    readyDecision = "",
    pending = false,
    operation = 0,
    revision = 0;
  // One failed key is retained; a new issuance cannot proceed until it is retired.
  let retiring = "";
  let verifiedProof = "",
    verifiedExpiry = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  const notify = () => {
    revision++;
    listeners.forEach((f) => f());
  };
  const read = () => {
    try {
      return jar.read();
    } catch {
      return "";
    }
  };
  const decision = () => {
    try {
      return jar.decision();
    } catch {
      return "denied";
    }
  };
  const remaining = (expiresAt: number) => Math.max(0, Math.floor((expiresAt - now()) / 1000));
  function write(value: string, expiresAt?: number) {
    if (expiresAt === undefined && read() === value) return;
    jar.write(value, expiresAt === undefined ? undefined : remaining(expiresAt));
    if (read() !== value && (expiresAt === undefined || expiresAt > now()))
      throw new Error("Cookie unavailable");
  }
  function decide(value: string) {
    jar.decide(value);
    if (decision() !== value) throw new Error("Cookie unavailable");
  }
  function candidate(value: string) {
    return Boolean(policy && parseProof(value)?.granted);
  }
  function valid(value: string) {
    return candidate(value) && value === verifiedProof && verifiedExpiry > now();
  }
  function reset() {
    ready = "";
    clearTimeout(timer);
    notify();
  }
  async function retire(value: string) {
    const p = parseProof(value);
    if (!p) return;
    retiring = deniedProof(value);
    pending = true;
    notify();
    const current = read();
    try {
      if (!parseProof(current) || deniedProof(current) === retiring) write(retiring);
    } catch {
      /* Still attempt server revocation; retain the key in memory on failure. */
    }
    // Expired and old-policy IDs still require server withdrawal acknowledgement.
    await api.withdraw(retiring);
    retiring = "";
  }
  async function drain() {
    if (retiring) await retire(retiring);
    const current = read();
    if (parseProof(current) && (!parseProof(current)!.granted || decision().startsWith("denied")))
      await retire(current);
  }
  function verifiedResponse(result: { proof: string; expiresAt: string }, existing: string) {
    const p = parseProof(result.proof);
    const expiresAt = Date.parse(result.expiresAt);
    if (
      !p?.granted ||
      !policy ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= now() ||
      (parseProof(existing)?.granted && result.proof !== existing) ||
      (parseProof(existing)?.granted === false && p.id === parseProof(existing)?.id) ||
      (result.proof === verifiedProof && expiresAt !== verifiedExpiry)
    )
      return null;
    return { ...p, expiresAt };
  }
  async function establish(action: "ACCEPT" | "RESTORE", intent: string, local: number) {
    if (local !== operation || decision() !== intent) return;
    await drain();
    if (local !== operation || decision() !== intent) return;
    let existing = read();
    if (action === "RESTORE" && !candidate(existing)) return;
    if (action === "ACCEPT" && !parseProof(existing)) {
      // Legacy/malformed data is never promoted. Only this explicit acceptance may replace it.
      jar.write("", 0);
      existing = "";
    }
    const result = await api.issue(action);
    const p = verifiedResponse(result, existing);
    if (!p) {
      await retire(result.proof);
      if (local === operation) {
        pending = false;
        notify();
      }
      throw new Error("Invalid proof response");
    }
    if (decision() !== intent) {
      // Persist the late key as denied for reload/offline recovery, never as a grant.
      await retire(result.proof);
      return;
    }
    try {
      write(result.proof, p.expiresAt);
    } catch {
      await retire(result.proof);
      throw new Error("Cookie unavailable");
    }
    verifiedProof = result.proof;
    verifiedExpiry = p.expiresAt;
    // A passive restore may supersede this operation without changing the user decision.
    // It will verify the persisted proof under the same lock; do not revoke that grant.
    if (local !== operation) return;
    ready = result.proof;
    readyDecision = intent;
    pending = false;
    clearTimeout(timer);
    const arm = () => {
      timer = setTimeout(
        () => {
          if (p.expiresAt > now()) arm();
          else {
            // Expiry invalidates this proof, not the user's selection or remote withdrawal.
            reset();
          }
        },
        Math.min(Math.max(0, p.expiresAt - now()), 2147483647),
      );
    };
    arm();
    notify();
  }
  const controller = {
    enabled: Boolean(policy && exclusive),
    invalidate() {
      operation++;
      reset();
    },
    getRevision: () => revision,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    isGranted() {
      return Boolean(
        ready &&
        ready === read() &&
        readyDecision === decision() &&
        decision().startsWith("accept.") &&
        valid(ready),
      );
    },
    hasGrantCookie: () =>
      candidate(read()) &&
      (read() !== verifiedProof || verifiedExpiry > now()) &&
      decision().startsWith("accept."),
    getProof() {
      return this.isGranted() ? ready : null;
    },
    getSnapshot(): "unanswered" | "granted" | "denied" {
      if (this.isGranted() || decision().startsWith("accept.")) return "granted";
      return decision().startsWith("denied") || parseProof(read())?.granted === false || retiring
        ? "denied"
        : "unanswered";
    },
    isWithdrawalPending: () => pending || Boolean(retiring),
    async accept() {
      if (!policy || !exclusive) return;
      const local = ++operation,
        intent = `accept.${newId()}`;
      reset();
      try {
        decide(intent);
        await exclusive(() => establish("ACCEPT", intent, local));
      } catch {
        reset();
      }
    },
    async restore() {
      if (!policy || !exclusive) return;
      const local = ++operation,
        intent = decision();
      reset();
      try {
        await exclusive(async () => {
          if (local !== operation || decision() !== intent) return;
          await drain();
          if (!intent.startsWith("accept.") || !candidate(read())) {
            pending = false;
            notify();
            return;
          }
          await establish("RESTORE", intent, local);
        });
      } catch {
        reset();
      }
    },
    async reject() {
      const local = ++operation,
        intent = `denied.${newId()}`;
      reset();
      pending = true;
      notify();
      if (!policy) return;
      // Local storage failures must not suppress remote revocation of a known key.
      try {
        decide(intent);
      } catch {
        /* The cookie or server can still enforce denial. */
      }
      const current = read();
      if (parseProof(current)) {
        retiring = deniedProof(current);
      }
      try {
        write(retiring || "denied");
      } catch {
        /* Keep the key in memory and withdraw below. */
      }
      try {
        if (!exclusive) return; // Cannot claim completion while another tab may still issue.
        await exclusive(async () => {
          await drain();
          if (local === operation && decision() === intent) {
            pending = false;
            notify();
          }
        });
      } catch {
        reset();
      }
    },
    dispose() {
      operation++;
      reset();
      listeners.clear();
    },
  };
  return controller;
}
export type CookieConsent = ReturnType<typeof createCookieConsent>;
