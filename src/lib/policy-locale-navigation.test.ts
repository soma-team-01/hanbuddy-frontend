import { afterEach, describe, expect, it, vi } from "vitest";
import { LOCALES } from "@/i18n/routing";
import { reloadPolicyInLocale } from "./policy-locale-navigation";

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "NEXT_LOCALE=; Path=/; Max-Age=0";
});

describe("policy locale navigation", () => {
  it.each(LOCALES)("reloads the policy in %s without losing query or hash", (locale) => {
    const replace = vi.fn(() => expect(document.cookie).toContain(`NEXT_LOCALE=${locale}`));
    vi.stubGlobal("window", { location: { search: "?from=signup", hash: "#payment", replace } });
    expect(reloadPolicyInLocale("/policies/terms-of-service", locale)).toBe(true);
    expect(replace).toHaveBeenCalledWith(
      `/${locale}/policies/terms-of-service?from=signup#payment`,
    );
  });

  it("does not reload or change preferences outside policy pages", () => {
    const replace = vi.fn();
    vi.stubGlobal("window", { location: { replace } });
    document.cookie = "NEXT_LOCALE=ko; Path=/";
    expect(reloadPolicyInLocale("/explore", "en")).toBe(false);
    expect(replace).not.toHaveBeenCalled();
    expect(document.cookie).toContain("NEXT_LOCALE=ko");
  });
});
