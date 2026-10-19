import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("reset link isolation", () => {
  it("has its own document root without analytics or authenticated session providers", () => {
    const layout = readFileSync("src/app/auth/reset-password/layout.tsx", "utf8");
    const provider = readFileSync("src/components/auth/ResetPasswordLocaleProvider.tsx", "utf8");
    expect(layout).toContain("<html");
    expect(layout).not.toMatch(/import.*AnalyticsProvider/);
    expect(layout).not.toMatch(/<AnalyticsProvider|<ChatRoomsPoller/);
    expect(provider).not.toMatch(/import.*AnalyticsProvider|<AnalyticsProvider|<ChatRoomsPoller/);
    expect(provider).toContain("mayHaveSession={false}");
    expect(provider).not.toMatch(/localStorage|sessionStorage|window\.location|router\./);
  });
  it("keeps temporary credentials out of storage, queries, logs and automatic submissions", () => {
    const form = readFileSync("src/components/auth/ResetPasswordForm.tsx", "utf8");
    expect(form).not.toMatch(/localStorage|sessionStorage|console\./);
    expect(form).toContain("history.replaceState");
    expect(form).toContain("window.location.hash.slice(1)");
  });
});
