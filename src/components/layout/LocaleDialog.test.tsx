import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleDialog } from "@/components/layout/LocaleDialog";
import { renderWithIntl } from "@/test/render-with-intl";

const routerMock = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("@/i18n/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/i18n/navigation")>()),
  useRouter: () => routerMock,
  usePathname: () => "/explore",
}));

describe("LocaleDialog", () => {
  beforeEach(() => {
    routerMock.replace.mockReset();
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
});
