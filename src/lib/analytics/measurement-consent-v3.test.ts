import { expect, it, vi } from "vitest";
import { createCookieConsent, parseProof } from "./cookie-consent";
import { createCookieJar } from "./cookie-runtime";

const policy = { measurementId: "G-TEST", origin: "https://example.test" };
const id = "A".repeat(43);

it("accepts only canonical v3 measurement choices and ignores every v2 proof", () => {
  expect(parseProof(`granted.v3.${id}`)).toMatchObject({ granted: true, id });
  expect(parseProof(`denied.v3.${id}`)).toMatchObject({ granted: false, id });
  expect(parseProof(`granted.v2.${id}`)).toBeNull();
  expect(parseProof(`denied.v2.${id}`)).toBeNull();
  expect(parseProof(`granted.v3.${"A".repeat(42)}`)).toBeNull();
});

it("persists a 43-character base64url choice marker containing underscore", () => {
  const values = new Map<string, string>();
  const jar = createCookieJar({ cookie: "" }, undefined, {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  });
  const marker = `accept.${"A".repeat(41)}_A`;
  jar.decide(marker);
  expect(jar.decision()).toBe(marker);
});

it.each(["granted", "denied"])(
  "deletes an old v2 %s choice and presents a fresh unanswered state",
  async (choice) => {
    const cookies = new Map([
      ["__Host-hb_ga_consent", `${choice}.v2.${id}`],
      ["__Host-hb_measurement_consent", ""],
    ]);
    const removed: string[] = [];
    const document = {
      get cookie() {
        return [...cookies]
          .filter(([, value]) => value)
          .map(([name, value]) => `${name}=${value}`)
          .join("; ");
      },
      set cookie(value: string) {
        const [entry] = value.split(";"),
          [name, ...parts] = entry.split("=");
        if (value.includes("Max-Age=0")) {
          cookies.delete(name);
          removed.push(name);
        } else cookies.set(name, parts.join("="));
      },
    };
    const storage = {
      getItem: vi.fn((key: string) =>
        key === "__Host-hb_ga_decision" ? `${choice}.old-generation` : null,
      ),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const jar = createCookieJar(document, () => {}, storage);
    const consent = createCookieConsent({
      policy,
      jar,
      api: { issue: vi.fn(), withdraw: vi.fn() },
      exclusive: async (work) => work(),
    });

    await consent.restore();

    expect(consent.getSnapshot()).toBe("unanswered");
    expect(consent.isGranted()).toBe(false);
    expect(removed).toContain("__Host-hb_ga_consent");
    expect(storage.removeItem).toHaveBeenCalledWith("__Host-hb_ga_decision");
  },
);

it("writes a fresh denial with one canonical 32-byte ID and withdraws that same ID", async () => {
  let cookie = "";
  const withdraw = vi.fn(async () => {});
  const consent = createCookieConsent({
    policy,
    jar: {
      read: () => cookie,
      write: (value) => {
        cookie = value;
      },
      decision: () => "",
      decide: () => {},
    },
    api: { issue: vi.fn(), withdraw },
    exclusive: async (work) => work(),
    newId: () => id,
  });

  await consent.reject();

  expect(cookie).toBe(`denied.v3.${id}`);
  expect(withdraw).toHaveBeenCalledWith(`denied.v3.${id}`);
  expect(consent.getSnapshot()).toBe("denied");
});
