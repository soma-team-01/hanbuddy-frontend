import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { LocaleSwitcher } from "./LocaleSwitcher";

const routerMock = vi.hoisted(() => ({ replace: vi.fn() }));
const pathnameMock = vi.hoisted(() => ({ value: "/my-activities/42/applicants" }));

vi.mock("@/i18n/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/i18n/navigation")>()),
  useRouter: () => routerMock,
  usePathname: () => pathnameMock.value,
}));

describe("LocaleSwitcher", () => {
  beforeEach(() => {
    routerMock.replace.mockReset();
    window.history.replaceState(null, "", "/en/my-activities/42/applicants?scheduleId=99");
  });

  it("keeps the query string when switching locale", () => {
    renderWithIntl(<LocaleSwitcher />, { locale: "en" });

    fireEvent.click(screen.getByRole("button", { expanded: false }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /한국어/ }));

    // usePathname은 쿼리를 버리므로 ?scheduleId= 가 함께 넘어가는지 확인한다
    expect(routerMock.replace).toHaveBeenCalledWith("/my-activities/42/applicants?scheduleId=99", {
      locale: "ko",
    });
  });

  it("does not navigate when the same locale is picked", () => {
    renderWithIntl(<LocaleSwitcher />, { locale: "en" });

    fireEvent.click(screen.getByRole("button", { expanded: false }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /English/ }));

    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it.each([
    ["en", "English(en)"],
    ["ko", "한국어(ko)"],
    ["ja", "日本語(ja)"],
    ["zh-Hans", "简体中文(zh-Hans)"],
    ["zh-Hant", "繁體中文(zh-Hant)"],
  ] as const)("shows the language name and code for %s", (locale, label) => {
    renderWithIntl(<LocaleSwitcher labelStyle="nameWithCode" />, { locale });

    expect(screen.getByRole("button", { expanded: false })).toHaveTextContent(label);
  });

  it.each([
    ["en", "English"],
    ["ko", "한국어"],
    ["ja", "日本語"],
    ["zh-Hans", "简体中文"],
    ["zh-Hant", "繁體中文"],
  ] as const)("shows only the language name in the simple trigger for %s", (locale, label) => {
    renderWithIntl(<LocaleSwitcher labelStyle="name" />, { locale });

    expect(screen.getByRole("button", { expanded: false })).toHaveTextContent(label);
  });

  it("uses lighter compact typography in the footer", () => {
    renderWithIntl(<LocaleSwitcher labelStyle="nameWithCode" variant="footer" />, { locale: "en" });

    expect(screen.getByRole("button", { expanded: false })).toHaveClass("text-xs", "font-medium");
    expect(screen.getByRole("button", { expanded: false })).not.toHaveClass("text-sm", "font-bold");
  });

  it("opens the compact footer menu upward without a heading", () => {
    renderWithIntl(<LocaleSwitcher labelStyle="nameWithCode" variant="footer" />, { locale: "en" });

    fireEvent.click(screen.getByRole("button", { expanded: false }));

    expect(screen.getByRole("menu")).toHaveClass("bottom-[calc(100%+10px)]", "min-w-44");
    expect(screen.getByRole("menuitemradio", { name: "English" })).toHaveClass(
      "text-xs",
      "font-semibold",
    );
    expect(screen.queryByText("Language")).not.toBeInTheDocument();
  });

  it("keeps the default menu below the trigger without a heading", () => {
    renderWithIntl(<LocaleSwitcher />, { locale: "en" });

    fireEvent.click(screen.getByRole("button", { expanded: false }));

    expect(screen.getByRole("menu")).toHaveClass("top-[calc(100%+10px)]", "min-w-44");
    expect(screen.queryByText("Language")).not.toBeInTheDocument();
  });
});
