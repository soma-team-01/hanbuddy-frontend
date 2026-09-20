import { expect, it, vi } from "vitest";
import { createMetaBrowser } from "./meta-browser";

const policy = {
  pixelId: "123456789012345",
  origin: "https://example.test",
};
const page = {
  page_location: "https://example.test/activities/detail",
  page_referrer: "" as const,
  page_title: "Activity",
};

it("is inert until start and maps only approved app events without Purchase", async () => {
  const appended: HTMLScriptElement[] = [];
  const delivered: unknown[][] = [];
  type PixelQueue = ((...args: unknown[]) => void) & {
    callMethod?: (...args: unknown[]) => void;
    loaded?: boolean;
    push?: (...args: unknown[]) => void;
    queue?: unknown[][];
  };
  const target = {
    location: new URL(`${policy.origin}/en/activities/42?campaign=safe#details`),
  } as unknown as Window;
  const document = {
    cookie: "",
    createElement: () => ({ dataset: {}, remove: vi.fn() }) as unknown as HTMLScriptElement,
    head: {
      appendChild: (script: HTMLScriptElement) => {
        appended.push(script);
        const pixel = (target as Window & { fbq: PixelQueue }).fbq;
        pixel.callMethod = (...args) => delivered.push(args);
        pixel.queue?.forEach((args) => pixel.callMethod?.(...args));
        pixel.queue = [];
        script.onload?.(new Event("load"));
      },
    },
  } as unknown as Document;
  const browser = createMetaBrowser(target, document, policy.pixelId);

  expect(appended).toHaveLength(0);
  browser.send("page_view", page);
  expect((target as Window & { fbq?: unknown }).fbq).toBeUndefined();

  await browser.start(policy, page);
  browser.send("page_view", page);
  browser.send("view_item", { ...page, items: [{ item_id: "42" }] });
  browser.send("sign_up", { ...page, method: "google" });
  browser.send("inquiry_click", {
    ...page,
    channel: "email",
    placement: "landing_contact",
    locale: "en",
  });
  browser.send("begin_checkout", { ...page, items: [{ item_id: "42" }] });
  browser.send("select_item", {
    ...page,
    item_list_id: "explore_activities",
    item_list_name: "Explore activities",
    items: [{ item_id: "42", index: 1 }],
  });

  const pixel = (target as Window & { fbq: PixelQueue }).fbq;
  expect(pixel.loaded).toBe(true);
  expect(pixel.push).toBe(pixel);
  expect(delivered).toContainEqual(["track", "PageView"]);
  expect(delivered).toContainEqual([
    "track",
    "ViewContent",
    { content_ids: ["42"], content_type: "product" },
  ]);
  expect(delivered).toContainEqual(["track", "CompleteRegistration"]);
  expect(delivered).toContainEqual(["track", "Contact"]);
  expect(delivered).toContainEqual([
    "track",
    "InitiateCheckout",
    { content_ids: ["42"], content_type: "product" },
  ]);
  expect(delivered.flat()).not.toContain("Purchase");
  expect(delivered.flat()).not.toContain("select_item");
  expect(appended[0].src).toBe("https://connect.facebook.net/en_US/fbevents.js");
  expect(appended[0].referrerPolicy).toBe("no-referrer");
});

it("revokes queued Meta consent and clears only Meta cookies on withdrawal", async () => {
  const writes: string[] = [];
  const document = {
    get cookie() {
      return "_fbp=fb.1.1700000000000.123; _fbc=fb.1.1700000000000.click";
    },
    set cookie(value: string) {
      writes.push(value);
    },
    createElement: () => ({ dataset: {}, remove: vi.fn() }) as unknown as HTMLScriptElement,
    head: { appendChild: (script: HTMLScriptElement) => script.onload?.(new Event("load")) },
  } as unknown as Document;
  const target = {
    location: new URL(`${policy.origin}/en/activities/42`),
  } as unknown as Window;
  const browser = createMetaBrowser(target, document, policy.pixelId);
  await browser.start(policy, page);

  browser.stop(true);

  const queue = (target as Window & { fbq: { queue: unknown[][] } }).fbq.queue;
  expect(queue).toContainEqual(["consent", "revoke"]);
  expect(writes.some((value) => value.startsWith("_fbp=;"))).toBe(true);
  expect(writes.some((value) => value.startsWith("_fbc=;"))).toBe(true);
  expect(writes.every((value) => !value.startsWith("_ga"))).toBe(true);
});

it.each(["/en/login", "/auth/google/callback", "/en/payments/success"])(
  "does not emit Meta events after the live browser moves to sensitive route %s",
  async (path) => {
    const delivered: unknown[][] = [];
    type PixelQueue = ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[][];
    };
    const target = {
      location: new URL(`${policy.origin}/en/activities/42?campaign=safe`),
    } as unknown as Window;
    const document = {
      cookie: "",
      createElement: () => ({ dataset: {}, remove: vi.fn() }) as unknown as HTMLScriptElement,
      head: {
        appendChild: (script: HTMLScriptElement) => {
          const pixel = (target as Window & { fbq: PixelQueue }).fbq;
          pixel.callMethod = (...args) => delivered.push(args);
          pixel.queue?.forEach((args) => pixel.callMethod?.(...args));
          pixel.queue = [];
          script.onload?.(new Event("load"));
        },
      },
    } as unknown as Document;
    const browser = createMetaBrowser(target, document, policy.pixelId);
    await browser.start(policy, page);
    delivered.length = 0;

    target.location = new URL(`${policy.origin}${path}?token=secret#callback`) as never;
    browser.send("page_view", page);

    expect(delivered.filter(([command]) => command === "track")).toEqual([]);
  },
);

it.each([
  ["/en/login?next=%2Fen%2Fexplore", `${policy.origin}/login`],
  ["/auth/google/callback?code=secret", page.page_location],
  ["/en/payments/success?paymentKey=secret", page.page_location],
  ["/en/private?token=secret", page.page_location],
] as const)(
  "does not initialize Meta on sensitive or unknown live route %s",
  async (path, pageLocation) => {
    const appendChild = vi.fn((script: HTMLScriptElement) => script.onload?.(new Event("load")));
    const target = { location: new URL(`${policy.origin}${path}`) } as unknown as Window;
    const document = {
      cookie: "",
      createElement: () => ({ dataset: {}, remove: vi.fn() }) as unknown as HTMLScriptElement,
      head: { appendChild },
    } as unknown as Document;
    const browser = createMetaBrowser(target, document, policy.pixelId);

    await expect(browser.start(policy, { ...page, page_location: pageLocation })).rejects.toThrow(
      "Analytics origin disabled",
    );

    expect(appendChild).not.toHaveBeenCalled();
    expect((target as Window & { fbq?: unknown }).fbq).toBeUndefined();
  },
);
