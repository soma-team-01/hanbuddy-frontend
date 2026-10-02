import { vi } from "vitest";
import { createAnalytics } from "@/lib/analytics/controller";

export function createTestAnalytics() {
  const values = new Map<string, string>();
  const browser = {
    start: vi.fn(async () => {}),
    send: vi.fn(),
    stop: vi.fn(),
    identifiers: async () => ({ clientId: "123.456", sessionId: "789" }),
  };
  const controller = createAnalytics({
    policy: {
      measurementId: "G-TEST",
      origin: "https://example.test",
      version: "synthetic",
      consentMaxAgeMs: 10000,
    },
    storage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
      removeItem: (key) => {
        values.delete(key);
      },
    },
    browser,
    link: { grant: async () => {}, link: async () => {}, revoke: async () => {} },
  });
  return { controller, browser };
}
