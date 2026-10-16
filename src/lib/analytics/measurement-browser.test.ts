import { expect, it, vi } from "vitest";
import { createMeasurementBrowser } from "./browser";

const origin = "https://example.test";
const page = {
  page_location: `${origin}/explore`,
  page_referrer: "" as const,
  page_title: "Explore",
};

function environment(failGoogle = false) {
  const scripts: HTMLScriptElement[] = [];
  const document = {
    cookie: "",
    createElement: () => ({ dataset: {}, remove: vi.fn() }) as unknown as HTMLScriptElement,
    head: {
      appendChild: (script: HTMLScriptElement) => {
        scripts.push(script);
        if (failGoogle && script.src.includes("googletagmanager"))
          script.onerror?.(new Event("error"));
        else script.onload?.(new Event("load"));
      },
    },
  } as unknown as Document;
  const target = {
    location: new URL(`${origin}/en/explore?campaign=safe`),
  } as unknown as Window;
  return { target, document, scripts };
}

it("starts both configured providers and sends one explicit app PageView to each", async () => {
  const env = environment();
  const browser = createMeasurementBrowser(env.target, env.document, {
    measurementId: "G-TEST",
    pixelId: "123456789012345",
    origin,
  });
  expect(env.scripts).toHaveLength(0);

  await browser.start({ measurementId: "G-TEST", pixelId: "123456789012345", origin }, page);
  browser.send("page_view", page);

  expect(env.scripts.map((script) => script.src)).toEqual([
    "https://www.googletagmanager.com/gtag/js?id=G-TEST",
    "https://connect.facebook.net/en_US/fbevents.js",
  ]);
  const googleQueue = (env.target as Window & { dataLayer: IArguments[] }).dataLayer;
  expect([...googleQueue.at(-1)!]).toEqual(["event", "page_view", page]);
  const metaQueue = (env.target as Window & { fbq: { queue: unknown[][] } }).fbq.queue;
  expect(metaQueue).toContainEqual(["track", "PageView"]);
});

it("keeps Meta active when a configured Google script fails", async () => {
  const env = environment(true);
  const policy = { measurementId: "G-TEST", pixelId: "123456789012345", origin };
  const browser = createMeasurementBrowser(env.target, env.document, policy);

  await browser.start(policy, page);
  browser.send("page_view", page);

  const metaQueue = (env.target as Window & { fbq: { queue: unknown[][] } }).fbq.queue;
  expect(metaQueue).toContainEqual(["track", "PageView"]);
  const googleQueue = (env.target as Window & { dataLayer: IArguments[] }).dataLayer;
  expect([...googleQueue].some((entry) => [...entry][0] === "event")).toBe(false);
});

it.each([
  [{ measurementId: "G-TEST", origin }, "googletagmanager.com"],
  [{ pixelId: "123456789012345", origin }, "connect.facebook.net"],
] as const)("loads only the configured provider", async (policy, expectedHost) => {
  const env = environment();
  const browser = createMeasurementBrowser(env.target, env.document, policy);
  await browser.start(policy, page);
  expect(env.scripts).toHaveLength(1);
  expect(env.scripts[0].src).toContain(expectedHost);
});

it("reads allowlisted Meta cookies only after both providers are active and uses the sanitized page URL", async () => {
  const env = environment();
  env.document.cookie =
    "_fbp=fb.1.1720000000000.123456789; _fbc=fb.1.1720000000000.Click_123-X; private=drop";
  const policy = { measurementId: "G-TEST", pixelId: "123456789012345", origin };
  const browser = createMeasurementBrowser(env.target, env.document, policy);
  await browser.start(policy, page);
  (env.target as Window & { gtag: (...args: unknown[]) => void }).gtag = (...args) => {
    if (args[0] !== "get") return;
    const field = args[2];
    const callback = args[3] as (value: string) => void;
    callback(field === "client_id" ? "123.456" : "789");
  };

  await expect(browser.identifiers()).resolves.toEqual({
    clientId: "123.456",
    sessionId: "789",
    fbp: "fb.1.1720000000000.123456789",
    fbc: "fb.1.1720000000000.Click_123-X",
    eventSourceUrl: `${origin}/explore`,
  });
});

it("never reads Meta attribution for a GA-only policy and drops malformed Meta values", async () => {
  for (const policy of [
    { measurementId: "G-TEST", origin },
    { measurementId: "G-TEST", pixelId: "123456789012345", origin },
  ]) {
    const env = environment();
    env.document.cookie = "_fbp=fb.1.1720000000000.not-digits; _fbc=private@example.test";
    const browser = createMeasurementBrowser(env.target, env.document, policy);
    await browser.start(policy, page);
    (env.target as Window & { gtag: (...args: unknown[]) => void }).gtag = (...args) => {
      if (args[0] === "get")
        (args[3] as (value: string) => void)(args[2] === "client_id" ? "123.456" : "789");
    };
    await expect(browser.identifiers()).resolves.toEqual({
      clientId: "123.456",
      sessionId: "789",
    });
  }
});

it("starts the healthy provider without waiting and delivers queued events once to the late provider", async () => {
  const env = environment();
  env.document.head.appendChild = ((script: HTMLScriptElement) => {
    env.scripts.push(script);
    if (script.src.includes("googletagmanager")) script.onload?.(new Event("load"));
    return script;
  }) as typeof document.head.appendChild;
  const policy = { measurementId: "G-TEST", pixelId: "123456789012345", origin };
  const browser = createMeasurementBrowser(env.target, env.document, policy);
  let started = false;
  const loading = browser.start(policy, page).then(() => {
    started = true;
  });
  try {
    await vi.waitFor(() => expect(started).toBe(true), { timeout: 100 });
    browser.send("page_view", page);
    browser.send("view_item", { ...page, items: [{ item_id: "42" }] });
    const google = (env.target as Window & { dataLayer: IArguments[] }).dataLayer;
    expect(google.filter((entry) => entry[0] === "event")).toHaveLength(2);
    const meta = (env.target as Window & { fbq: { queue: unknown[][] } }).fbq.queue;
    expect(meta.filter((entry) => entry[0] === "track")).toHaveLength(0);
    env.scripts.find((script) => script.src.includes("facebook"))!.onload?.(new Event("load"));
    await vi.waitFor(() => expect(meta.filter((entry) => entry[0] === "track")).toHaveLength(2));
    expect(google.filter((entry) => entry[0] === "event")).toHaveLength(2);
  } finally {
    browser.stop();
    await loading.catch(() => {});
  }
});

it.each(["about", "faq"])("sends public %s page views to both providers", async (path) => {
  const env = environment();
  env.target.location.pathname = `/en/${path}`;
  const policy = { measurementId: "G-TEST", pixelId: "123456789012345", origin };
  const browser = createMeasurementBrowser(env.target, env.document, policy);
  await browser.start(policy, { ...page, page_location: `${origin}/${path}` });
  browser.send("page_view", { ...page, page_location: `${origin}/${path}` });
  expect((env.target as Window & { fbq?: { queue: unknown[][] } }).fbq?.queue).toContainEqual([
    "track",
    "PageView",
  ]);
  browser.stop();
});

it.each(["google", "meta"])(
  "records signup with %s ready while its peer loads and drops pending events on withdrawal",
  async (healthy) => {
    const { createCookieAnalytics } = await import("./cookie-controller");
    const { createCookieConsent } = await import("./cookie-consent");
    const env = environment();
    env.target.location.pathname = "/en/onboarding";
    env.document.head.appendChild = ((script: HTMLScriptElement) => {
      env.scripts.push(script);
      const google = script.src.includes("googletagmanager");
      if (google === (healthy === "google")) script.onload?.(new Event("load"));
      return script;
    }) as typeof document.head.appendChild;
    let cookie = "",
      decision = "";
    const policy = { measurementId: "G-TEST", pixelId: "123456789012345", origin };
    const expiresAt = new Date(Date.now() + 60000).toISOString();
    const consent = createCookieConsent({
      policy,
      jar: {
        read: () => cookie,
        write: (v) => {
          cookie = v;
        },
        decision: () => decision,
        decide: (v) => {
          decision = v;
        },
      },
      api: {
        issue: async () => ({
          proof: `granted.v3.${"A".repeat(43)}`,
          expiresAt,
        }),
        withdraw: async () => {},
      },
      exclusive: async (work) => work(),
    });
    const browser = createMeasurementBrowser(env.target, env.document, policy);
    const controller = createCookieAnalytics({ policy, consent, browser });
    controller.visit("/en/onboarding");
    await controller.accept();
    expect(controller.trackSignup("/en/onboarding", "google")).toBe(true);
    expect(controller.trackSignup("/en/onboarding", "google")).toBe(false);
    const target = env.target as Window & { dataLayer: IArguments[]; fbq: { queue: unknown[][] } };
    if (healthy === "google")
      expect(target.dataLayer.filter((e) => e[0] === "event").map((e) => e[1])).toEqual([
        "page_view",
        "sign_up",
      ]);
    else
      expect(target.fbq.queue.filter((e) => e[0] === "track").map((e) => e[1])).toEqual([
        "PageView",
        "CompleteRegistration",
      ]);
    // Signup navigates immediately. The healthy provider already received it; restoring
    // the destination must not duplicate it or replay old-page events to a late Meta tag.
    env.target.location.pathname = "/en/explore";
    controller.visit("/en/explore");
    await controller.restore();
    if (healthy === "google") {
      expect(target.dataLayer.filter((e) => e[0] === "event" && e[1] === "sign_up")).toHaveLength(
        0,
      );
    } else {
      expect(
        target.fbq.queue.filter((e) => e[0] === "track" && e[1] === "CompleteRegistration"),
      ).toHaveLength(0);
    }
    await controller.reject();
    env.scripts.forEach((script) => script.onload?.(new Event("load")));
    await Promise.resolve();
    expect(target.dataLayer.some((e) => e[0] === "event")).toBe(false);
    expect(target.fbq.queue.some((e) => e[0] === "track")).toBe(false);
    controller.dispose();
  },
);
