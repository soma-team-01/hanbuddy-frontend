import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleDialog } from "@/components/layout/LocaleDialog";
import { renderWithIntl } from "@/test/render-with-intl";

const routerMock = vi.hoisted(() => ({ replace: vi.fn() }));
const pathnameMock = vi.hoisted(() => ({ value: "/explore" }));
const reloadPolicyMock = vi.hoisted(() => vi.fn(() => false));
vi.mock("@/lib/policy-locale-navigation", () => ({ reloadPolicyInLocale: reloadPolicyMock }));

vi.mock("@/i18n/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/i18n/navigation")>()),
  useRouter: () => routerMock,
  usePathname: () => pathnameMock.value,
}));

describe("LocaleDialog", () => {
  beforeEach(() => {
    routerMock.replace.mockReset();
    pathnameMock.value = "/explore";
    reloadPolicyMock.mockReset().mockReturnValue(false);
    window.history.replaceState(null, "", "/en/explore?category=food#results");
  });

  it("keeps the query and hash when switching language", () => {
    renderWithIntl(<LocaleDialog onClose={vi.fn()} />, { locale: "en" });

    const dialog = screen.getByRole("dialog", { name: "Language" });
    fireEvent.click(within(dialog).getByRole("radio", { name: "한국어" }));

    expect(routerMock.replace).toHaveBeenCalledWith("/explore?category=food#results", {
      locale: "ko",
    });
  });

  it("closes without navigation when the active language is selected", () => {
    const onClose = vi.fn();
    renderWithIntl(<LocaleDialog onClose={onClose} />, { locale: "en" });

    fireEvent.click(screen.getByRole("radio", { name: "English" }));

    expect(routerMock.replace).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("reloads the chosen policy language without using a stale intercepted route", () => {
    pathnameMock.value = "/policies/terms-of-service";
    reloadPolicyMock.mockReturnValue(true);
    renderWithIntl(<LocaleDialog onClose={vi.fn()} />, { locale: "en" });
    fireEvent.click(screen.getByRole("radio", { name: "한국어" }));
    expect(reloadPolicyMock).toHaveBeenCalledWith("/policies/terms-of-service", "ko");
    expect(routerMock.replace).not.toHaveBeenCalled();
  });
});
