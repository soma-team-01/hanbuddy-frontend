import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { LanguagePreference } from "./LanguagePreference";

const navigation = vi.hoisted(() => ({
  pathname: "/my-page",
  query: "",
  replace: vi.fn(),
}));

const transition = vi.hoisted(() => ({
  isPending: false,
  start: vi.fn((callback: () => void) => callback()),
}));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useTransition: () => [transition.isPending, transition.start] as const,
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: navigation.replace }),
}));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useSearchParams: () => new URLSearchParams(navigation.query),
}));

describe("LanguagePreference", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigation.pathname = "/my-page";
    navigation.query = "";
    transition.isPending = false;
    window.history.replaceState(null, "", "/en/my-page");
  });

  it.each([
    ["en", "Language", "English"],
    ["ko", "언어", "한국어"],
  ] as const)("shows the current language for %s", (locale, label, value) => {
    renderWithIntl(<LanguagePreference />, { locale });

    const select = screen.getByRole("combobox", { name: label });
    expect(select).toBeEnabled();
    expect(select).toHaveValue(locale);
    expect((screen.getByRole("option", { name: value }) as HTMLOptionElement).selected).toBe(true);
  });

  it("uses a native language selector with both options", () => {
    renderWithIntl(<LanguagePreference />);

    const select = screen.getByRole("combobox", { name: "Language" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(select.tagName).toBe("SELECT");
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect((screen.getByRole("option", { name: "English" }) as HTMLOptionElement).selected).toBe(
      true,
    );
    expect((screen.getByRole("option", { name: "한국어" }) as HTMLOptionElement).selected).toBe(
      false,
    );
  });

  it("preserves the pathname, query, and hash when switching to Korean", () => {
    navigation.query = "from=dashboard";
    window.history.replaceState(null, "", "/en/my-page?from=dashboard#settings");
    renderWithIntl(<LanguagePreference />);

    fireEvent.change(screen.getByRole("combobox", { name: "Language" }), {
      target: { value: "ko" },
    });

    expect(navigation.replace).toHaveBeenCalledWith("/my-page?from=dashboard#settings", {
      locale: "ko",
    });
    expect(navigation.replace).toHaveBeenCalledTimes(1);
  });

  it("does not navigate when the current language is selected", () => {
    renderWithIntl(<LanguagePreference />);

    fireEvent.change(screen.getByRole("combobox", { name: "Language" }), {
      target: { value: "en" },
    });

    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("disables the selector and prevents navigation while a transition is pending", () => {
    transition.isPending = true;
    renderWithIntl(<LanguagePreference />);

    const select = screen.getByRole("combobox", { name: "Language" });

    expect(select).toBeDisabled();
    fireEvent.change(select, { target: { value: "ko" } });
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});
