import { fireEvent, screen, waitFor, within } from "@testing-library/react";
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

function openLanguageDropdown(dropdownName = "Language") {
  const trigger = screen.getByRole("button", { name: new RegExp(dropdownName) });
  fireEvent.click(trigger);
  return { dropdown: screen.getByRole("listbox", { name: dropdownName }), trigger };
}

function renderOpenPendingDropdown() {
  const view = renderWithIntl(<LanguagePreference />);
  openLanguageDropdown();
  transition.isPending = true;
  view.rerender(<LanguagePreference />);

  return {
    dropdown: screen.getByRole("listbox", { name: "Language" }),
    trigger: screen.getByRole("button", { name: /Language/ }),
  };
}

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

    const trigger = screen.getByRole("button", { name: new RegExp(label) });
    expect(trigger).toBeEnabled();
    expect(within(trigger).getByText(value)).toBeInTheDocument();
  });

  it("opens a compact named listbox with both language options", () => {
    renderWithIntl(<LanguagePreference />);

    const { dropdown, trigger } = openLanguageDropdown();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(within(dropdown).getAllByRole("option")).toHaveLength(2);
    expect(within(dropdown).getByRole("option", { name: "English" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(within(dropdown).getByRole("option", { name: "한국어" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it.each([
    ["en", "Language", "English"],
    ["ko", "언어", "한국어"],
  ] as const)("focuses the selected option when the %s dropdown opens", (locale, title, option) => {
    renderWithIntl(<LanguagePreference />, { locale });

    const { dropdown } = openLanguageDropdown(title);

    expect(within(dropdown).getByRole("option", { name: option })).toHaveFocus();
  });

  it.each([
    ["ArrowDown", "en", "Language", "English", "한국어", "ko"],
    ["ArrowRight", "en", "Language", "English", "한국어", "ko"],
    ["ArrowUp", "ko", "언어", "한국어", "English", "en"],
    ["ArrowLeft", "ko", "언어", "한국어", "English", "en"],
  ] as const)(
    "uses roving focus and selects with %s in the %s locale",
    (key, locale, title, selectedLabel, nextLabel, nextLocale) => {
      renderWithIntl(<LanguagePreference />, { locale });

      const { dropdown } = openLanguageDropdown(title);
      const selectedOption = within(dropdown).getByRole("option", { name: selectedLabel });
      const nextOption = within(dropdown).getByRole("option", { name: nextLabel });

      expect(selectedOption).toHaveAttribute("tabindex", "0");
      expect(nextOption).toHaveAttribute("tabindex", "-1");

      fireEvent.keyDown(selectedOption, { key });

      expect(navigation.replace).toHaveBeenCalledWith("/my-page", { locale: nextLocale });
      expect(navigation.replace).toHaveBeenCalledTimes(1);
    },
  );

  it("preserves the pathname, query, and hash when switching to Korean", () => {
    navigation.query = "from=dashboard";
    window.history.replaceState(null, "", "/en/my-page?from=dashboard#settings");
    renderWithIntl(<LanguagePreference />);

    const { dropdown } = openLanguageDropdown();
    fireEvent.click(within(dropdown).getByRole("option", { name: "한국어" }));

    expect(navigation.replace).toHaveBeenCalledWith("/my-page?from=dashboard#settings", {
      locale: "ko",
    });
    expect(navigation.replace).toHaveBeenCalledTimes(1);
  });

  it("closes without navigation when the current language is selected", async () => {
    renderWithIntl(<LanguagePreference />);

    const { dropdown, trigger } = openLanguageDropdown();
    fireEvent.click(within(dropdown).getByRole("option", { name: "English" }));

    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    expect(navigation.replace).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it.each([
    ["Escape", (dropdown: HTMLElement) => fireEvent.keyDown(dropdown, { key: "Escape" })],
    [
      "a repeated trigger click",
      (_: HTMLElement, trigger: HTMLElement) => fireEvent.click(trigger),
    ],
  ])("restores focus to the trigger after closing with %s", async (_, dismiss) => {
    renderWithIntl(<LanguagePreference />);

    const { dropdown, trigger } = openLanguageDropdown();
    dismiss(dropdown, trigger);

    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("disables both options and prevents duplicate navigation while a transition is pending", () => {
    transition.isPending = true;
    renderWithIntl(<LanguagePreference />);

    const { dropdown } = openLanguageDropdown();
    const english = within(dropdown).getByRole("option", { name: "English" });
    const korean = within(dropdown).getByRole("option", { name: "한국어" });

    expect(english).toBeDisabled();
    expect(korean).toBeDisabled();
    fireEvent.click(korean);
    fireEvent.click(korean);
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("allows Escape dismissal and restores focus while a transition is pending", async () => {
    const { dropdown, trigger } = renderOpenPendingDropdown();

    fireEvent.keyDown(dropdown, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});
