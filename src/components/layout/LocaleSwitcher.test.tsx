import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { LocaleSwitcher } from "./LocaleSwitcher";

const routerMock = vi.hoisted(() => ({ replace: vi.fn() }));
const pathnameMock = vi.hoisted(() => ({ value: "/my-activities/42/applicants" }));
const reloadPolicyMock = vi.hoisted(() => vi.fn(() => false));
vi.mock("@/lib/policy-locale-navigation", () => ({ reloadPolicyInLocale: reloadPolicyMock }));

vi.mock("@/i18n/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/i18n/navigation")>()),
  useRouter: () => routerMock,
  usePathname: () => pathnameMock.value,
}));

describe("LocaleSwitcher", () => {
  it("uses an in-place locale handler without routing or policy reload", () => {
    const onLocaleChange = vi.fn();
    renderWithIntl(<LocaleSwitcher onLocaleChange={onLocaleChange} />);
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "한국어" }));
    expect(onLocaleChange).toHaveBeenCalledExactlyOnceWith("ko");
    expect(routerMock.replace).not.toHaveBeenCalled();
    expect(reloadPolicyMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { expanded: false })).toHaveFocus();
  });
  beforeEach(() => {
    routerMock.replace.mockReset();
    pathnameMock.value = "/my-activities/42/applicants";
    reloadPolicyMock.mockReset().mockReturnValue(false);
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

  it("reloads policy documents instead of retaining an old-language overlay", () => {
    pathnameMock.value = "/policies/terms-of-service";
    reloadPolicyMock.mockReturnValue(true);
    renderWithIntl(<LocaleSwitcher />, { locale: "en" });
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "한국어" }));
    expect(reloadPolicyMock).toHaveBeenCalledWith("/policies/terms-of-service", "ko");
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it("does not navigate when the same locale is picked", () => {
    renderWithIntl(<LocaleSwitcher />, { locale: "en" });

    fireEvent.click(screen.getByRole("button", { expanded: false }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /English/ }));

    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it("disables the trigger and already open options until it is enabled again", () => {
    const beforeChange = vi.fn();
    const { rerender } = renderWithIntl(<LocaleSwitcher onBeforeLocaleChange={beforeChange} />);
    const trigger = screen.getByRole("button", { expanded: false });
    fireEvent.click(trigger);
    const korean = screen.getByRole("menuitemradio", { name: "한국어" });

    rerender(<LocaleSwitcher disabled onBeforeLocaleChange={beforeChange} />);
    expect(trigger).toBeDisabled();
    expect(korean).toBeDisabled();
    fireEvent.click(korean);
    expect(beforeChange).not.toHaveBeenCalled();
    expect(routerMock.replace).not.toHaveBeenCalled();

    rerender(<LocaleSwitcher onBeforeLocaleChange={beforeChange} />);
    expect(trigger).toBeEnabled();
    expect(korean).toBeEnabled();
    fireEvent.click(korean);
    expect(beforeChange).toHaveBeenCalledTimes(1);
    expect(routerMock.replace).toHaveBeenCalledTimes(1);
  });

  it("does not navigate when the pre-change guard returns false", () => {
    const beforeChange = vi.fn(() => false);
    renderWithIntl(<LocaleSwitcher onBeforeLocaleChange={beforeChange} />);
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "한국어" }));
    expect(beforeChange).toHaveBeenCalledTimes(1);
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
    expect(screen.getByRole("button", { expanded: false })).toHaveClass("hover:text-primary");
    expect(screen.getByRole("button", { expanded: false })).not.toHaveClass(
      "hover:text-primary-strong",
    );
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

  it("opens the default menu upward when placed at the top", () => {
    renderWithIntl(<LocaleSwitcher labelStyle="name" menuPlacement="top" />, { locale: "ko" });

    fireEvent.click(screen.getByRole("button", { expanded: false }));

    expect(screen.getByRole("menu")).toHaveClass("bottom-[calc(100%+10px)]");
    expect(screen.getByRole("menu")).not.toHaveClass("top-[calc(100%+10px)]");
    expect(screen.getAllByRole("menuitemradio")).toHaveLength(5);
  });

  it("aligns the menu to the trigger's right edge by default", () => {
    renderWithIntl(<LocaleSwitcher />, { locale: "en" });

    fireEvent.click(screen.getByRole("button", { expanded: false }));

    expect(screen.getByRole("menu")).toHaveClass("right-0");
    expect(screen.getByRole("menu")).not.toHaveClass("left-0");
  });

  it("aligns the menu to the trigger's left edge when requested", () => {
    renderWithIntl(<LocaleSwitcher menuAlign="start" menuPlacement="top" />, { locale: "en" });

    fireEvent.click(screen.getByRole("button", { expanded: false }));

    expect(screen.getByRole("menu")).toHaveClass("left-0");
    expect(screen.getByRole("menu")).not.toHaveClass("right-0");
  });
});
