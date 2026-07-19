import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const APP_DIRECTORY = dirname(fileURLToPath(import.meta.url));

describe("locale route structure", () => {
  it("places rendered pages below [locale] and keeps fixed handlers outside", () => {
    expect(existsSync(resolve(APP_DIRECTORY, "[locale]/layout.tsx"))).toBe(true);
    expect(existsSync(resolve(APP_DIRECTORY, "[locale]/page.tsx"))).toBe(true);
    expect(existsSync(resolve(APP_DIRECTORY, "[locale]/(app)/login/page.tsx"))).toBe(true);
    expect(existsSync(resolve(APP_DIRECTORY, "auth/google/callback/route.ts"))).toBe(true);
    expect(existsSync(resolve(APP_DIRECTORY, "api/auth/google/start/route.ts"))).toBe(true);
    expect(existsSync(resolve(APP_DIRECTORY, "layout.tsx"))).toBe(false);
  });
});
