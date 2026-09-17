import type { AnalyticsPolicy } from "./policy";

export const CONSENT_COOKIE = "__Host-hb_ga_consent";
export const DECISION_COOKIE = "__Host-hb_ga_decision";
export interface ConsentCookieJar {
  read(): string;
  write(value: string, maxAgeSeconds: number): void;
  decision(): string;
  decide(value: string, maxAgeSeconds: number): void;
}
export interface ProofApi {
  issue(action: "ACCEPT" | "RESTORE"): Promise<{ proof: string; expiresAt: string }>;
  withdraw(deniedProof: string): Promise<void>;
}
export type Exclusive = <T>(work: () => Promise<T>) => Promise<T>;

/** Syntax and time checks only. Authenticity is established by the backend, never by this parser. */
export function parseProof(value: string) {
  const match =
    /^(granted|denied)\.v1\.([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\.(\d{1,12})\.(\d{1,12})\.([A-Za-z0-9_-]{1,64})\.([A-Za-z0-9_-]{43})$/.exec(
      value,
    );
  if (!match) return null;
  const issuedAt = Number(match[3]) * 1000,
    expiresAt = Number(match[4]) * 1000;
  if (expiresAt <= issuedAt) return null;
  return { value, granted: match[1] === "granted", issuedAt, expiresAt, version: match[5] };
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
  const choiceLifetime = () => Math.floor((policy?.consentMaxAgeMs ?? 0) / 1000);
  function write(value: string) {
    const parsed = parseProof(value);
    jar.write(value, parsed ? remaining(parsed.expiresAt) : choiceLifetime());
    if (read() !== value && (!parsed || parsed.expiresAt > now()))
      throw new Error("Cookie unavailable");
  }
  function decide(value: string) {
    jar.decide(value, choiceLifetime());
    if (decision() !== value) throw new Error("Cookie unavailable");
  }
  function valid(value: string) {
    const p = parseProof(value);
    return Boolean(
      policy &&
      p?.granted &&
      p.version === policy.version &&
      p.issuedAt <= now() &&
      p.expiresAt > now() &&
      p.expiresAt - p.issuedAt <= policy.consentMaxAgeMs,
    );
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
    // Expiry is terminal eligibility in the server contract, not a deletion acknowledgement.
    if (p.expiresAt > now()) await api.withdraw(retiring);
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
    if (
      !p ||
      !p.granted ||
      !valid(result.proof) ||
      Date.parse(result.expiresAt) !== p.expiresAt ||
      (existing && result.proof !== existing)
    )
      return null;
    return p;
  }
  async function establish(action: "ACCEPT" | "RESTORE", intent: string, local: number) {
    if (local !== operation || decision() !== intent) return;
    await drain();
    if (local !== operation || decision() !== intent) return;
    let existing = read();
    if (action === "RESTORE" && !valid(existing)) return;
    if (action === "ACCEPT" && !valid(existing)) {
      // Retire an older proof before starting a new key; never abandon its failed revoke.
      if (parseProof(existing)) await retire(existing);
      if (local !== operation || decision() !== intent) return;
      jar.write("", 0);
      existing = "";
    }
    const result = await api.issue(existing ? "RESTORE" : action);
    const p = verifiedResponse(result, existing);
    if (!p) {
      await retire(result.proof);
      throw new Error("Invalid proof response");
    }
    if (decision() !== intent) {
      // Persist the late key as denied for reload/offline recovery, never as a grant.
      await retire(result.proof);
      return;
    }
    try {
      write(result.proof);
    } catch {
      await retire(result.proof);
      throw new Error("Cookie unavailable");
    }
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
          else void controller.reject();
        },
        Math.min(Math.max(0, p.expiresAt - now()), 2147483647),
      );
    };
    arm();
    notify();
  }
  const controller = {
    enabled: Boolean(policy && exclusive),
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
        !decision().startsWith("denied") &&
        valid(ready),
      );
    },
    hasGrantCookie: () => valid(read()) && !decision().startsWith("denied"),
    getProof() {
      return this.isGranted() ? ready : null;
    },
    getSnapshot(): "unanswered" | "granted" | "denied" {
      if (this.isGranted()) return "granted";
      return read() || decision() || retiring ? "denied" : "unanswered";
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
          if (intent.startsWith("denied") || !valid(read())) {
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
      if (parseProof(current)) retiring = deniedProof(current);
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
