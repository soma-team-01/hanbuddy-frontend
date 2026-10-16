import { afterEach, expect, it, vi } from "vitest";
import { createGoogleBrowser } from "./browser";

const policy = {
  measurementId: "G-TEST123",
  origin: "http://localhost:3000",
};
const page = {
  page_location: "http://localhost:3000/activities/detail",
  page_referrer: "" as const,
  page_title: "Activity",
};
afterEach(() => {
  document.head.querySelectorAll("[data-hanbuddy-analytics]").forEach((el) => el.remove());
  vi.unstubAllGlobals();
});
it("loads nothing on construction and sends only explicit safe fields after start", async () => {
  const queue: unknown[][] = [];
  const target = { location: { origin: policy.origin }, dataLayer: queue };
  const browser = createGoogleBrowser(target as unknown as Window, document);
  expect(document.querySelector("[data-hanbuddy-analytics]")).toBeNull();
  const loading = browser.start(policy, page);
  const script = document.querySelector("script[data-hanbuddy-analytics]") as HTMLScriptElement;
  expect(script.referrerPolicy).toBe("no-referrer");
  script.dispatchEvent(new Event("load"));
  await loading;
  browser.send("view_item", { ...page, items: [{ item_id: "42" }] });
  expect(Array.from(queue.find((entry) => entry[0] === "config")!)).toEqual([
    "config",
    "G-TEST123",
    {
      ...page,
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    },
  ]);
  expect(queue.filter((entry) => entry[0] === "event").map((entry) => Array.from(entry))).toEqual([
    ["event", "view_item", { ...page, items: [{ item_id: "42" }] }],
  ]);
  expect(
    Array.from(queue.find((entry) => entry[0] === "consent" && entry[1] === "update")!),
  ).toEqual([
    "consent",
    "update",
    {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    },
  ]);
});
it("cancels a pending load and never re-enables it from its late callback", async () => {
  const queue: unknown[][] = [];
  const target = { location: { origin: policy.origin }, dataLayer: queue };
  const browser = createGoogleBrowser(target as unknown as Window, document);
  const pending = browser.start(policy, page);
  const expectation = expect(pending).rejects.toThrow();
  const script = document.querySelector("script[data-hanbuddy-analytics]")!;
  browser.stop();
  script.dispatchEvent(new Event("load"));
  await expectation;
  browser.send("page_view", page);
  expect(
    queue.filter((entry) => entry[0] === "event").map((entry) => Array.from(entry)),
  ).toHaveLength(0);
  expect((target as Record<string, unknown>)["ga-disable-G-TEST123"]).toBe(true);
});
it("does not load on a different origin", async () => {
  const browser = createGoogleBrowser(
    { location: { origin: "https://unapproved.test" } } as Window,
    document,
  );
  await expect(browser.start(policy, page)).rejects.toThrow();
  expect(document.querySelector("[data-hanbuddy-analytics]")).toBeNull();
});
it("validates identifier callbacks and refuses identities after stop", async () => {
  const target = {
    location: { origin: policy.origin },
    dataLayer: [] as unknown[][],
    gtag: vi.fn((...args: unknown[]) => {
      if (args[0] === "get")
        (args[3] as (value: unknown) => void)(args[2] === "client_id" ? "123.456" : "789");
    }),
  };
  const browser = createGoogleBrowser(target as unknown as Window, document);
  const loading = browser.start(policy, page);
  document.querySelector("script[data-hanbuddy-analytics]")!.dispatchEvent(new Event("load"));
  await loading;
  await expect(browser.identifiers()).resolves.toEqual({ clientId: "123.456", sessionId: "789" });
  browser.stop();
  await expect(browser.identifiers()).rejects.toThrow();
});

it("uses the documented Arguments command queue and preserves cookies until explicit reset", async () => {
  const queue: ArrayLike<unknown>[] = [];
  const target = { location: { origin: policy.origin, hostname: "localhost" }, dataLayer: queue };
  const browser = createGoogleBrowser(target as unknown as Window, document);
  document.cookie = "_ga=synthetic-client; Path=/";
  document.cookie = "_ga_TEST123=synthetic-session; Path=/";
  const loading = browser.start(policy, page);
  expect(Object.prototype.toString.call(queue[0])).toBe("[object Arguments]");
  document.querySelector("script[data-hanbuddy-analytics]")!.dispatchEvent(new Event("load"));
  await loading;
  browser.stop();
  expect(document.cookie).toContain("_ga=synthetic-client");
  expect(document.cookie).toContain("_ga_TEST123=synthetic-session");
  browser.send("page_view", page);
  expect(queue.some((command) => command[0] === "event")).toBe(false);
  // Explicit reset is the withdrawal/expiry operation, distinct from pagehide.
  browser.stop(true);
  expect(document.cookie).not.toContain("_ga=");
  expect(document.cookie).not.toContain("_ga_TEST123=");
});

it("can clear expired identity on reload before any tag has been loaded", () => {
  document.cookie = "_ga=synthetic-client; Path=/";
  document.cookie = "_ga_TEST123=synthetic-session; Path=/";
  const browser = createGoogleBrowser(
    { location: { origin: policy.origin, hostname: "localhost" } } as Window,
    document,
    policy.measurementId,
  );
  browser.stop(true);
  expect(document.cookie).not.toContain("_ga=");
  expect(document.cookie).not.toContain("_ga_TEST123=");
  expect(document.querySelector("[data-hanbuddy-analytics]")).toBeNull();
});

it.each(["unset", "timeout"])(
  "fails closed when Google's identifier is %s without fabricating a session",
  async (mode) => {
    vi.useFakeTimers();
    try {
      const target = {
        location: { origin: policy.origin },
        gtag: vi.fn((...args: unknown[]) => {
          if (args[0] === "get" && mode === "unset")
            (args[3] as (value: unknown) => void)(undefined);
        }),
      };
      const browser = createGoogleBrowser(target as unknown as Window, document);
      const loading = browser.start(policy, page);
      document.querySelector("script[data-hanbuddy-analytics]")!.dispatchEvent(new Event("load"));
      await loading;
      const unavailable = expect(browser.identifiers()).rejects.toThrow("Analytics unavailable");
      await vi.advanceTimersByTimeAsync(3000);
      await unavailable;
      expect(target.gtag.mock.calls.some((command) => command[0] === "event")).toBe(false);
      browser.stop(true);
    } finally {
      vi.useRealTimers();
    }
  },
);
it("returns a real client identifier without inventing an unset optional session", async () => {
  const target = {
    location: { origin: policy.origin },
    gtag: vi.fn((...args: unknown[]) => {
      if (args[0] === "get")
        (args[3] as (v: unknown) => void)(args[2] === "client_id" ? "123.456" : undefined);
    }),
  };
  const browser = createGoogleBrowser(target as unknown as Window, document);
  const loading = browser.start(policy, page);
  document.querySelector("script[data-hanbuddy-analytics]")!.dispatchEvent(new Event("load"));
  await loading;
  await expect(browser.identifiers()).resolves.toEqual({ clientId: "123.456" });
  browser.stop();
});

it("preserves entry UTM until consent and configures GA before the first page view", async () => {
  const queue: unknown[][] = [];
  const location = new URL(
    `${policy.origin}/en?utm_source=meetup&utm_medium=social&utm_campaign=autumn&code=secret`,
  );
  const target = { location, dataLayer: queue };
  const browser = createGoogleBrowser(target as unknown as Window, document);
  expect(queue).toEqual([]);
  // Initial restore and ACCEPT invalidate unverified consent before issuing proof.
  browser.stop(true);
  location.href = `${policy.origin}/en/explore`;
  const loading = browser.start(policy, page);
  document.querySelector("script[data-hanbuddy-analytics]")!.dispatchEvent(new Event("load"));
  await loading;
  browser.send("page_view", page);
  const commands = queue.map((entry) => Array.from(entry));
  const attribution = commands.findIndex(
    (entry) =>
      entry[0] === "set" &&
      typeof entry[1] === "object" &&
      (entry[1] as Record<string, unknown>).campaign_source === "meetup",
  );
  expect(attribution).toBeGreaterThanOrEqual(0);
  expect(attribution).toBeLessThan(commands.findIndex((entry) => entry[0] === "config"));
  expect(JSON.stringify(commands)).not.toContain("secret");
  expect(JSON.stringify(commands)).not.toContain("utm_");
  browser.stop(true);
  const restart = browser.start(policy, page);
  document.querySelector("script[data-hanbuddy-analytics]")!.dispatchEvent(new Event("load"));
  await restart;
  const campaignCommands = queue
    .map((entry) => Array.from(entry))
    .filter(
      (entry) =>
        entry[0] === "set" &&
        typeof entry[1] === "object" &&
        Object.hasOwn(entry[1] as object, "campaign_source"),
    );
  expect(campaignCommands.at(-1)?.[1]).toMatchObject({
    campaign_source: undefined,
    campaign_medium: undefined,
    campaign_name: undefined,
  });
});

it("carries UTM through real consent restore and acceptance without pre-consent events", async () => {
  const { createCookieConsent } = await import("./cookie-consent");
  const { createCookieAnalytics } = await import("./cookie-controller");
  let cookie = "",
    decision = "";
  const consent = createCookieConsent({
    policy,
    jar: {
      read: () => cookie,
      write: (value) => {
        cookie = value;
      },
      decision: () => decision,
      decide: (value) => {
        decision = value;
      },
    },
    api: {
      issue: async () => ({
        proof: `granted.v3.${"A".repeat(43)}`,
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      }),
      withdraw: async () => {},
    },
    exclusive: async (work) => work(),
  });
  const queue: unknown[][] = [];
  const target = {
    location: new URL(`${policy.origin}/en?utm_source=instagram&utm_medium=social`),
    dataLayer: queue,
  };
  const browser = createGoogleBrowser(target as unknown as Window, document);
  const controller = createCookieAnalytics({ policy, consent, browser });
  controller.visit("/en");
  await controller.restore();
  expect(queue.some((entry) => entry[0] === "event")).toBe(false);
  expect(document.querySelector("script[data-hanbuddy-analytics]")).toBeNull();
  target.location.href = `${policy.origin}/en/explore`;
  controller.visit("/en/explore");
  const accepting = controller.accept();
  await vi.waitFor(() =>
    expect(document.querySelector("script[data-hanbuddy-analytics]")).not.toBeNull(),
  );
  document.querySelector("script[data-hanbuddy-analytics]")!.dispatchEvent(new Event("load"));
  await accepting;
  expect(queue.map((entry) => Array.from(entry))).toContainEqual([
    "set",
    expect.objectContaining({ campaign_source: "instagram", campaign_medium: "social" }),
  ]);
  expect(queue.filter((entry) => entry[0] === "event").map((entry) => entry[1])).toEqual([
    "page_view",
  ]);
  await controller.reject();
  controller.visit("/en/activities/42");
  expect(queue.some((entry) => entry[0] === "event")).toBe(false);
  controller.dispose();
});
