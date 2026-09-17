import { describe, expect, it, vi } from "vitest";
import { createCookieConsent, type ConsentCookieJar, type ProofApi } from "./cookie-consent";

const policy = {
  measurementId: "G-TEST",
  origin: "https://example.test",
  version: "synthetic",
  consentMaxAgeMs: 60000,
  cookieMaxAgeSeconds: 60,
};
const proof = (id = "1", choice = "granted") =>
  `${choice}.v1.00000000-0000-4000-8000-${id.padStart(12, "0")}.1000.1060.synthetic.${"a".repeat(43)}`;
function environment() {
  let value = "",
    decision = "";
  let tail = Promise.resolve();
  const jar: ConsentCookieJar = {
    read: () => value,
    write: (v) => {
      value = v;
    },
    decision: () => decision,
    decide: (v) => {
      decision = v;
    },
  };
  const exclusive = <T>(work: () => Promise<T>): Promise<T> => {
    const next = tail.then(work);
    tail = next.then(
      () => {},
      () => {},
    );
    return next;
  };
  const api: ProofApi = {
    issue: vi.fn(async () => ({ proof: proof(), expiresAt: "1970-01-01T00:17:40Z" })),
    withdraw: vi.fn(async () => {}),
  };
  const make = () => createCookieConsent({ policy, jar, api, exclusive, now: () => 1000000 });
  return { jar, api, make };
}
describe("signed cookie consent", () => {
  it("accepts only explicitly, restores the same proof and never extends expiry", async () => {
    const e = environment(),
      c = e.make();
    await c.restore();
    expect(e.api.issue).not.toHaveBeenCalled();
    await c.accept();
    expect(c.isGranted()).toBe(true);
    expect(e.jar.read()).toBe(proof());
    await c.restore();
    expect(e.api.issue).toHaveBeenLastCalledWith("RESTORE");
    expect(e.jar.read()).toBe(proof());
  });
  it("serializes two tab acceptances, with only the latest intent allowed to issue", async () => {
    const e = environment(),
      a = e.make(),
      b = e.make();
    await Promise.all([a.accept(), b.accept()]);
    expect(e.api.issue).toHaveBeenCalledTimes(1);
    expect(b.isGranted()).toBe(true);
    await a.restore();
    expect(a.isGranted()).toBe(true);
  });
  it("revokes a late proof after denial and keeps withdrawal incomplete during issuance", async () => {
    const e = environment(),
      a = e.make(),
      b = e.make();
    let finish!: (v: { proof: string; expiresAt: string }) => void;
    vi.mocked(e.api.issue).mockImplementationOnce(
      () =>
        new Promise((r) => {
          finish = r;
        }),
    );
    const accepting = a.accept();
    await vi.waitFor(() => expect(finish).toBeDefined());
    const rejecting = b.reject();
    expect(b.isGranted()).toBe(false);
    expect(b.isWithdrawalPending()).toBe(true);
    finish({ proof: proof(), expiresAt: "1970-01-01T00:17:40Z" });
    await accepting;
    await rejecting;
    expect(e.api.withdraw).toHaveBeenCalledWith(proof("1", "denied"));
    expect(e.jar.read()).toBe(proof("1", "denied"));
    expect(a.isGranted()).toBe(false);
    expect(b.isWithdrawalPending()).toBe(false);
  });
  it("retains failed late revocation and cannot adopt a new key until acknowledged", async () => {
    const e = environment(),
      a = e.make(),
      b = e.make();
    let finish!: (v: { proof: string; expiresAt: string }) => void;
    vi.mocked(e.api.issue).mockImplementationOnce(
      () =>
        new Promise((r) => {
          finish = r;
        }),
    );
    vi.mocked(e.api.withdraw).mockRejectedValue(new Error("offline"));
    const accepting = a.accept();
    await vi.waitFor(() => expect(finish).toBeDefined());
    const rejecting = b.reject();
    finish({ proof: proof(), expiresAt: "1970-01-01T00:17:40Z" });
    await accepting;
    await rejecting;
    await b.accept();
    expect(e.api.issue).toHaveBeenCalledTimes(1);
    expect(e.jar.read()).toBe(proof("1", "denied"));
    expect(b.isWithdrawalPending()).toBe(true);
    expect(b.isGranted()).toBe(false);
  });
  it("does not automatically ACCEPT after a lost issuance response or reload", async () => {
    const e = environment(),
      a = e.make();
    vi.mocked(e.api.issue).mockRejectedValue(new Error("response lost"));
    await a.accept();
    await a.restore();
    await e.make().restore();
    expect(e.api.issue).toHaveBeenCalledTimes(1);
    expect(a.isGranted()).toBe(false);
  });
  it("does not turn failed RESTORE into ACCEPT", async () => {
    const e = environment();
    e.jar.write(proof(), 60);
    vi.mocked(e.api.issue).mockRejectedValue(new Error("expired"));
    const c = e.make();
    await c.restore();
    expect(e.api.issue).toHaveBeenCalledExactlyOnceWith("RESTORE");
    expect(c.isGranted()).toBe(false);
  });
  it("rejects mismatched server expiry/version and cannot collect if cookie writes fail", async () => {
    const e = environment();
    vi.mocked(e.api.issue).mockResolvedValue({ proof: proof(), expiresAt: "1970-01-01T00:18:40Z" });
    const a = e.make();
    await a.accept();
    expect(a.isGranted()).toBe(false);
    const c = createCookieConsent({
      policy,
      jar: {
        ...e.jar,
        write: () => {
          throw new Error("blocked");
        },
      },
      api: e.api,
      exclusive: async (f) => f(),
      now: () => 1000000,
    });
    await expect(c.accept()).resolves.toBeUndefined();
    expect(c.isGranted()).toBe(false);
  });
  it("cannot accept without origin-wide serialization or policy", async () => {
    const e = environment();
    for (const overrides of [{ exclusive: null }, { policy: null }]) {
      const c = createCookieConsent({
        policy,
        jar: e.jar,
        api: e.api,
        exclusive: async (f) => f(),
        now: () => 1000000,
        ...overrides,
      });
      await c.accept();
      expect(c.isGranted()).toBe(false);
    }
    expect(e.api.issue).not.toHaveBeenCalled();
  });
});
it("passive restore during issuance does not revoke the same unchanged acceptance", async () => {
  const e = environment(),
    c = e.make();
  let finish!: (v: { proof: string; expiresAt: string }) => void;
  vi.mocked(e.api.issue).mockImplementationOnce(
    () =>
      new Promise((r) => {
        finish = r;
      }),
  );
  const accepting = c.accept();
  await vi.waitFor(() => expect(finish).toBeDefined());
  const restoring = c.restore();
  finish({ proof: proof(), expiresAt: "1970-01-01T00:17:40Z" });
  await accepting;
  await restoring;
  expect(e.api.withdraw).not.toHaveBeenCalled();
  expect(c.isGranted()).toBe(true);
});
it("still revokes a late denied proof if persisting it fails", async () => {
  const e = environment(),
    a = e.make(),
    b = e.make();
  let finish!: (v: { proof: string; expiresAt: string }) => void;
  vi.mocked(e.api.issue).mockImplementationOnce(
    () =>
      new Promise((r) => {
        finish = r;
      }),
  );
  const accepting = a.accept();
  await vi.waitFor(() => expect(finish).toBeDefined());
  const rejecting = b.reject();
  e.jar.write = () => {
    throw new Error("blocked");
  };
  finish({ proof: proof(), expiresAt: "1970-01-01T00:17:40Z" });
  await accepting;
  await rejecting;
  expect(e.api.withdraw).toHaveBeenCalledWith(proof("1", "denied"));
  expect(a.isGranted()).toBe(false);
});
it("a stale failed revoke cannot overwrite a newer tab's granted proof", async () => {
  const e = environment(),
    a = e.make(),
    b = e.make();
  await a.accept();
  vi.mocked(e.api.withdraw).mockRejectedValueOnce(new Error("offline"));
  await a.reject();
  vi.mocked(e.api.issue).mockResolvedValue({
    proof: proof("2"),
    expiresAt: "1970-01-01T00:17:40Z",
  });
  await b.accept();
  expect(e.jar.read()).toBe(proof("2"));
  await a.restore();
  expect(e.jar.read()).toBe(proof("2"));
  expect(a.isGranted()).toBe(true);
});
it("recovers a denied decision persisted before the granted proof could be flipped", async () => {
  const e = environment();
  e.jar.write(proof(), 60);
  e.jar.decide("denied.reload", 60);
  const c = e.make();
  await c.restore();
  expect(e.api.withdraw).toHaveBeenCalledWith(proof("1", "denied"));
  expect(e.jar.read()).toBe(proof("1", "denied"));
  expect(c.isWithdrawalPending()).toBe(false);
});
it("does not mistake a timer chunk for long proof expiry", async () => {
  vi.useFakeTimers();
  try {
    const start = 1000000,
      duration = 3000000000;
    vi.setSystemTime(start);
    const e = environment();
    const longProof = proof().replace(".1060.", `.${(start + duration) / 1000}.`);
    vi.mocked(e.api.issue).mockResolvedValue({
      proof: longProof,
      expiresAt: new Date(start + duration).toISOString(),
    });
    const c = createCookieConsent({
      policy: { ...policy, consentMaxAgeMs: duration },
      jar: e.jar,
      api: e.api,
      exclusive: async (f) => f(),
    });
    await c.accept();
    await vi.advanceTimersByTimeAsync(2147483647);
    expect(c.isGranted()).toBe(true);
    expect(e.api.withdraw).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(duration - 2147483647);
    expect(c.isGranted()).toBe(false);
    c.dispose();
  } finally {
    vi.useRealTimers();
  }
});
it("attempts existing-proof withdrawal even when both local denial writes fail", async () => {
  const e = environment(),
    c = e.make();
  await c.accept();
  e.jar.decide = () => {
    throw new Error("blocked");
  };
  e.jar.write = () => {
    throw new Error("blocked");
  };
  await c.reject();
  expect(e.api.withdraw).toHaveBeenCalledWith(proof("1", "denied"));
  expect(c.isGranted()).toBe(false);
});
