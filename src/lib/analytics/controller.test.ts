import { describe, expect, it, vi } from "vitest";
import { createAnalytics } from "./controller";
import { readAnalyticsPolicy } from "./policy";

const policy = {
  measurementId: "G-TEST123",
  origin: "https://example.test",
  version: "test-v1",
  consentMaxAgeMs: 10000,
};
function setup(overrides: Record<string, unknown> = {}) {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  const browser = {
    start: vi.fn(async () => {}),
    send: vi.fn(),
    stop: vi.fn(),
    identifiers: vi.fn(async () => ({ clientId: "123.456", sessionId: "789" })),
  };
  const link = {
    grant: vi.fn(async () => {}),
    link: vi.fn(async () => {}),
    revoke: vi.fn<(id: string) => Promise<void>>(async () => {}),
  };
  let now = 1000;
  const analytics = createAnalytics({
    policy,
    storage,
    browser,
    link,
    now: () => now,
    newId: () => "00000000-0000-4000-8000-000000000001",
    ...overrides,
  });
  return {
    analytics,
    browser,
    link,
    values,
    storage,
    advance: () => {
      now = 12000;
    },
  };
}

describe("operational activation", () => {
  it("does not activate from an ID alone or invent retention", () => {
    expect(readAnalyticsPolicy({ GA_MEASUREMENT_ID: "G-TEST123" })).toBeNull();
    expect(readAnalyticsPolicy({ GA_ENABLED: "false", GA_MEASUREMENT_ID: "G-TEST" })).toBeNull();
  });
  it("requires policy and the actual backend binding even after accept", async () => {
    for (const overrides of [{ policy: null }, { link: null }]) {
      const { analytics, browser } = setup(overrides);
      analytics.visit("/en/activities/42");
      await analytics.accept();
      analytics.track("booking_cta_click", "/en/activities/42", 42);
      expect(browser.start).not.toHaveBeenCalled();
      expect(browser.send).not.toHaveBeenCalled();
    }
  });
});

describe("consent lifecycle and safe events", () => {
  it("drops preconsent actions and emits only four allowed events with safe page context", async () => {
    const { analytics, browser, link } = setup();
    analytics.visit("/en/activities/42?paymentKey=secret#email");
    analytics.track("booking_cta_click", "/en/activities/42", 42);
    expect(browser.send).not.toHaveBeenCalled();
    analytics.visit("/en/activities/42");
    await analytics.accept();
    expect(browser.send.mock.calls.map((call) => call[0])).toEqual(["page_view"]);
    analytics.track("view_item", "/en/activities/42", 42);
    analytics.track("booking_cta_click", "/en/activities/42", 42);
    analytics.track("purchase" as never, "/en/activities/42", 42);
    analytics.track("view_item", "/en/activities/person@example.test", 42);
    analytics.track("view_item", "/en/activities/42", Number.NaN);
    expect(browser.send.mock.calls.map((call) => call[0])).toEqual([
      "page_view",
      "view_item",
      "booking_cta_click",
    ]);
    expect(browser.send.mock.calls[1]).toEqual([
      "view_item",
      {
        page_location: "https://example.test/activities/detail",
        page_referrer: "",
        page_title: "Activity",
        items: [{ item_id: "42" }],
      },
    ]);
    expect(JSON.stringify(browser.send.mock.calls)).not.toMatch(/secret|email|paymentKey|purchase/);
    expect(link.link).not.toHaveBeenCalled();
  });
  it("deduplicates committed visits, rerenders and returns without manufacturing CTA", async () => {
    const { analytics, browser } = setup();
    analytics.visit("/en/activities/42/book");
    await analytics.accept();
    analytics.track("begin_checkout", "/en/activities/42/book", 42);
    analytics.track("begin_checkout", "/en/activities/42/book", 42);
    analytics.visit("/en/activities/42/book");
    analytics.visit("/en/explore");
    analytics.track("begin_checkout", "/en/activities/42/book", 42);
    expect(browser.send.mock.calls.map((c) => c[0])).toEqual([
      "page_view",
      "begin_checkout",
      "page_view",
      "page_view",
      "begin_checkout",
    ]);
  });
  it("stops locally before a failed server revoke and retries revocation without accepting", async () => {
    const { analytics, browser, link } = setup();
    analytics.visit("/en/explore");
    await analytics.accept();
    link.revoke.mockRejectedValueOnce(new Error("private raw server text"));
    await analytics.reject();
    analytics.track("view_item", "/en/activities/42", 42);
    expect(analytics.getSnapshot()).toBe("denied");
    expect(browser.stop).toHaveBeenCalled();
    expect(browser.send).toHaveBeenCalledTimes(1);
    await analytics.restore();
    expect(link.revoke).toHaveBeenCalledTimes(2);
    expect(browser.start).toHaveBeenCalledTimes(1);
  });
  it("cancels asynchronous initialization and linking when withdrawal wins", async () => {
    let finish!: () => void;
    const { analytics, browser, link } = setup();
    link.grant.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    analytics.visit("/en/explore");
    const pending = analytics.accept();
    await analytics.reject();
    finish();
    await pending;
    expect(browser.start).not.toHaveBeenCalled();
    expect(link.link).not.toHaveBeenCalled();
    expect(link.revoke).toHaveBeenCalled();
  });
  it("fails closed when storage cannot persist consent", async () => {
    const { analytics, browser, link } = setup({
      storage: {
        getItem: () => null,
        setItem: () => {
          throw new Error("unavailable");
        },
      },
    });
    await analytics.accept();
    expect(browser.start).not.toHaveBeenCalled();
    expect(link.grant).not.toHaveBeenCalled();
  });
  it("expires consent and blocks tracking when another tab withdraws", async () => {
    const { analytics, browser, storage, advance } = setup();
    analytics.visit("/en/explore");
    await analytics.accept();
    advance();
    analytics.track("view_item", "/en/activities/42", 42);
    expect(browser.send).toHaveBeenCalledTimes(1);
    expect(analytics.getSnapshot()).toBe("denied");
    storage.setItem("hanbuddy.gaConsent.v1", JSON.stringify({ state: "denied" }));
    await analytics.restore();
    expect(browser.start).toHaveBeenCalledTimes(1);
  });
  it("never loads tags or links on a sensitive or unknown route", async () => {
    const { analytics, browser } = setup();
    analytics.visit("/en/payments/success?paymentKey=secret");
    await analytics.accept();
    expect(browser.start).not.toHaveBeenCalled();
    analytics.visit("/en/explore");
    await analytics.restore();
    expect(browser.start).toHaveBeenCalledTimes(1);
    analytics.visit("/en/chat/private");
    expect(browser.stop).toHaveBeenCalled();
  });
});

it("actively expires an idle grant without a user action", async () => {
  vi.useFakeTimers();
  try {
    const { analytics, browser, link, advance } = setup();
    analytics.visit("/en/explore");
    await analytics.accept();
    advance();
    await vi.advanceTimersByTimeAsync(10000);
    expect(browser.stop).toHaveBeenCalled();
    expect(link.revoke).toHaveBeenCalled();
    expect(analytics.getSnapshot()).toBe("denied");
  } finally {
    vi.useRealTimers();
  }
});
it("stops again after a canceled transport resolves", async () => {
  const { analytics, browser, link } = setup();
  let finish!: () => void;
  browser.start.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  analytics.visit("/en/explore");
  const pending = analytics.accept();
  await Promise.resolve();
  await analytics.reject();
  const stops = browser.stop.mock.calls.length;
  finish();
  await pending;
  expect(browser.stop.mock.calls.length).toBeGreaterThan(stops);
  expect(link.link).not.toHaveBeenCalled();
});
it("removes the stale grant when denial cannot be persisted", async () => {
  const base = setup();
  let fail = false;
  const storage = {
    getItem: base.storage.getItem,
    setItem: (key: string, value: string) => {
      if (fail) throw new Error("quota");
      base.storage.setItem(key, value);
    },
    removeItem: (key: string) => {
      base.values.delete(key);
    },
  };
  const { analytics } = setup({ storage });
  analytics.visit("/en/explore");
  await analytics.accept();
  fail = true;
  await analytics.reject();
  expect(storage.getItem("hanbuddy.gaConsent.v1")).toBeNull();
});
it("does not forget a failed revocation when the user tries to accept again", async () => {
  const { analytics, browser, link } = setup();
  analytics.visit("/en/explore");
  await analytics.accept();
  link.revoke.mockRejectedValue(new Error("offline"));
  await analytics.reject();
  await analytics.accept();
  expect(browser.start).toHaveBeenCalledTimes(1);
  expect(analytics.getSnapshot()).toBe("denied");
});
it("analytics sink failure cannot break a booking activation", async () => {
  const { analytics, browser } = setup();
  analytics.visit("/en/activities/42");
  await analytics.accept();
  browser.send.mockImplementation(() => {
    throw new Error("sink failed");
  });
  expect(() => analytics.track("booking_cta_click", "/en/activities/42", 42)).not.toThrow();
});
it("serializes restart across an interrupted grant without revoking the live consent", async () => {
  const { analytics, browser, link } = setup();
  let finish!: () => void;
  link.grant.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  analytics.visit("/en/explore");
  const pending = analytics.accept();
  analytics.visit("/en/payments/success");
  analytics.visit("/en/explore");
  const restoring = analytics.restore();
  expect(link.grant).toHaveBeenCalledTimes(1);
  finish();
  await pending;
  await restoring;
  await vi.waitFor(() => expect(browser.send).toHaveBeenCalledTimes(1));
  expect(link.revoke).not.toHaveBeenCalled();
});
it("does not resurrect consent when reject overtakes a reaccept awaiting revocation", async () => {
  const { analytics, link, browser } = setup();
  analytics.visit("/en/explore");
  await analytics.accept();
  await analytics.reject();
  let finish!: (value?: void) => void;
  link.revoke.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const pending = analytics.accept();
  await analytics.reject();
  finish();
  await pending;
  expect(browser.start).toHaveBeenCalledTimes(1);
  expect(analytics.getSnapshot()).toBe("denied");
});
it("revokes the known epoch when cross-tab storage is removed", async () => {
  const { analytics, link, values } = setup();
  analytics.visit("/en/explore");
  await analytics.accept();
  values.clear();
  await analytics.restore();
  expect(link.revoke).toHaveBeenCalled();
  expect(analytics.getSnapshot()).toBe("unanswered");
});
it("does not restart pending initialization after pagehide or unmount suspension", async () => {
  const { analytics, browser } = setup();
  let finish!: () => void;
  browser.start.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  analytics.visit("/en/explore");
  const pending = analytics.accept();
  await vi.waitFor(() => expect(browser.start).toHaveBeenCalledTimes(1));
  analytics.suspend();
  finish();
  await pending;
  await Promise.resolve();
  expect(browser.start).toHaveBeenCalledTimes(1);
  expect(browser.send).not.toHaveBeenCalled();
  await analytics.restore();
  expect(browser.start).toHaveBeenCalledTimes(2);
});

it("preserves identity during suspension but resets it on withdrawal and suspended expiry", async () => {
  vi.useFakeTimers();
  try {
    const { analytics, browser, advance } = setup();
    analytics.visit("/en/explore");
    await analytics.accept();
    analytics.suspend();
    expect(browser.stop).toHaveBeenLastCalledWith(false);
    advance();
    await vi.advanceTimersByTimeAsync(10000);
    expect(browser.stop).toHaveBeenLastCalledWith(true);
    await analytics.reject();
    expect(browser.stop).toHaveBeenLastCalledWith(true);
  } finally {
    vi.useRealTimers();
  }
});

const secondId = "00000000-0000-4000-8000-000000000002";
function twoTabs() {
  const first = setup();
  const second = setup({ storage: first.storage, newId: () => secondId });
  first.analytics.visit("/en/explore");
  second.analytics.visit("/en/explore");
  return { first, second };
}
it("reuses existing shared acceptance instead of minting another epoch", async () => {
  const { first, second } = twoTabs();
  await first.analytics.accept();
  await second.analytics.accept();
  expect(second.link.grant.mock.calls).toEqual(first.link.grant.mock.calls);
});
it("does not overwrite a newer shared consent when an old tab checks permission", async () => {
  const { first, second } = twoTabs();
  await first.analytics.accept();
  await second.analytics.reject();
  await second.analytics.accept();
  const newer = first.storage.getItem("hanbuddy.gaConsent.v1");
  expect(first.analytics.isActive()).toBe(false);
  expect(first.storage.getItem("hanbuddy.gaConsent.v1")).toBe(newer);
  expect(first.link.revoke).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000001");
});
it("revokes the previous epoch before adopting another tab's acceptance and retains failed revocation", async () => {
  const { first, second } = twoTabs();
  await first.analytics.accept();
  await second.analytics.reject();
  await second.analytics.accept();
  first.link.revoke.mockRejectedValueOnce(new Error("offline"));
  await first.analytics.restore();
  expect(first.analytics.isActive()).toBe(false);
  expect(first.browser.start).toHaveBeenCalledTimes(1);
  await first.analytics.restore();
  expect(first.link.revoke).toHaveBeenCalledTimes(2);
  expect(first.link.grant).toHaveBeenLastCalledWith(
    expect.objectContaining({ consentId: secondId }),
  );
});
it.each(["grant", "transport"] as const)(
  "withdraws both known epochs when another tab replaces a pending %s",
  async (operation) => {
    const { first, second } = twoTabs();
    let finish!: () => void;
    const deferred = operation === "grant" ? first.link.grant : first.browser.start;
    deferred.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const pending = first.analytics.accept();
    await vi.waitFor(() => expect(deferred).toHaveBeenCalledTimes(1));
    await second.analytics.reject();
    await second.analytics.accept();
    await first.analytics.reject();
    expect(first.link.revoke).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000001");
    expect(first.link.revoke).toHaveBeenCalledWith(secondId);
    expect(JSON.parse(first.storage.getItem("hanbuddy.gaConsent.v1")!).id).toBe(secondId);
    finish();
    await pending;
    expect(first.browser.send).not.toHaveBeenCalled();
    expect(first.analytics.isActive()).toBe(false);
  },
);

it("retains both failed withdrawal handles when shared storage subsequently changes", async () => {
  const { first, second } = twoTabs();
  await first.analytics.accept();
  await second.analytics.reject();
  await second.analytics.accept();
  first.link.revoke.mockRejectedValue(new Error("offline"));
  await first.analytics.reject();
  first.values.clear();
  first.link.revoke.mockResolvedValue(undefined);
  first.link.revoke.mockClear();
  await first.analytics.restore();
  expect(first.link.revoke).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000001");
  expect(first.link.revoke).toHaveBeenCalledWith(secondId);
});
it("does not overwrite a new shared decision after awaiting retirement", async () => {
  const { first, second } = twoTabs();
  await first.analytics.accept();
  await first.analytics.reject();
  let finish!: () => void;
  first.link.revoke.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const pending = first.analytics.accept();
  await second.analytics.accept();
  const current = first.storage.getItem("hanbuddy.gaConsent.v1");
  finish();
  await pending;
  expect(first.storage.getItem("hanbuddy.gaConsent.v1")).toBe(current);
  expect(first.link.grant).toHaveBeenCalledTimes(1);
});

it("a terminal synthetic server rejects a delayed grant after cross-tab withdrawal", async () => {
  const base = setup();
  const states = new Map<string, "granted" | "linked" | "revoked">();
  const server = {
    grant: async ({ consentId }: { consentId: string }) => {
      if (states.get(consentId) === "revoked") throw new Error("terminal consent");
      states.set(consentId, "granted");
    },
    link: async ({ consentId }: { consentId: string }) => {
      if (states.get(consentId) !== "granted") throw new Error("inactive consent");
      states.set(consentId, "linked");
    },
    revoke: async (consentId: string) => {
      states.set(consentId, "revoked");
    },
  };
  let finish!: () => void;
  const delayed = {
    ...server,
    grant: async (value: { consentId: string }) => {
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      await server.grant(value);
    },
  };
  const first = setup({ storage: base.storage, link: delayed });
  const second = setup({ storage: base.storage, link: server, newId: () => secondId });
  first.analytics.visit("/en/explore");
  second.analytics.visit("/en/explore");
  const pending = first.analytics.accept();
  await vi.waitFor(() => expect(finish).toBeDefined());
  await second.analytics.reject();
  await second.analytics.accept();
  await first.analytics.reject();
  finish();
  await pending;
  expect([...states.values()]).toEqual(["revoked", "revoked"]);
  expect(first.browser.send).not.toHaveBeenCalled();
});

it("does not expire a newer tab's consent when the old tab's idle timer runs", async () => {
  vi.useFakeTimers();
  try {
    const { first, second } = twoTabs();
    await first.analytics.accept();
    await second.analytics.reject();
    await second.analytics.accept();
    const newer = first.storage.getItem("hanbuddy.gaConsent.v1");
    first.advance();
    await vi.advanceTimersByTimeAsync(10000);
    expect(first.storage.getItem("hanbuddy.gaConsent.v1")).toBe(newer);
    expect(first.analytics.isActive()).toBe(false);
    expect(first.link.revoke).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000001");
  } finally {
    vi.useRealTimers();
  }
});

it("resets identity when permission observes a different denied epoch", async () => {
  const { first, second } = twoTabs();
  await first.analytics.accept();
  await second.analytics.reject();
  await second.analytics.accept();
  await second.analytics.reject();
  expect(first.analytics.isActive()).toBe(false);
  expect(first.browser.stop).toHaveBeenLastCalledWith(true);
});

it("retains a failed shared-epoch retirement during acceptance even if storage disappears", async () => {
  const { first, second } = twoTabs();
  await first.analytics.accept();
  await second.analytics.reject();
  await second.analytics.accept();
  second.advance();
  await second.analytics.reject();
  first.link.revoke.mockImplementation(async (id: string) => {
    if (id === secondId) throw new Error("offline");
  });
  await first.analytics.accept();
  first.values.clear();
  first.link.revoke.mockResolvedValue(undefined);
  first.link.revoke.mockClear();
  await first.analytics.restore();
  expect(first.link.revoke).toHaveBeenCalledWith(secondId);
  expect(first.analytics.isActive()).toBe(false);
});

it("does not replace a newer withdrawal handle when an older acceptance resumes", async () => {
  const { first, second } = twoTabs();
  await first.analytics.accept();
  await second.analytics.reject();
  await second.analytics.accept();
  await second.analytics.reject();
  let finish!: () => void;
  first.link.revoke.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const accepting = first.analytics.accept();
  const thirdId = "00000000-0000-4000-8000-000000000003";
  first.storage.setItem(
    "hanbuddy.gaConsent.v1",
    JSON.stringify({ id: thirdId, version: policy.version, expiresAt: 11000, state: "granted" }),
  );
  first.link.revoke.mockImplementation(async (id: string) => {
    if (id !== "00000000-0000-4000-8000-000000000001") throw new Error("offline");
  });
  await first.analytics.reject();
  first.values.clear();
  finish();
  await accepting;
  first.link.revoke.mockResolvedValue(undefined);
  first.link.revoke.mockClear();
  await first.analytics.restore();
  expect(first.link.revoke).toHaveBeenCalledWith(thirdId);
  expect(first.analytics.isActive()).toBe(false);
});

it.each([
  ["/en/activities/42", "view_item"],
  ["/en/activities/42", "booking_cta_click"],
  ["/en/activities/42/book", "begin_checkout"],
] as const)("does not gate %s / %s on identifiers or an application", async (path, event) => {
  const { analytics, browser, link } = setup();
  browser.identifiers.mockRejectedValue(new Error("session not initialized"));
  link.link.mockRejectedValue(new Error("no application exists"));
  analytics.visit(path);
  await analytics.accept();
  expect(analytics.track(event, path, 42)).toBe(true);
  expect(browser.send.mock.calls.map((call) => call[0])).toEqual(["page_view", event]);
  expect(browser.identifiers).not.toHaveBeenCalled();
  expect(link.link).not.toHaveBeenCalled();
  await analytics.reject();
  expect(analytics.track(event, path, 42)).toBe(false);
});
it("does not submit application linkage even when identifier lookup would succeed", async () => {
  const { analytics, browser, link } = setup();
  analytics.visit("/en/activities/42");
  await analytics.accept();
  expect(browser.send.mock.calls.map((call) => call[0])).toEqual(["page_view"]);
  expect(link.link).not.toHaveBeenCalled();
  analytics.suspend();
});
