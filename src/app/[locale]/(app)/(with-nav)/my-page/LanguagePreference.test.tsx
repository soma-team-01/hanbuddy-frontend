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

function openLanguageSheet(sheetName = "Language") {
  const trigger = screen.getByRole("button", { name: new RegExp(sheetName) });
  fireEvent.click(trigger);
  return { dialog: screen.getByRole("dialog", { name: sheetName }), trigger };
}

function renderOpenPendingSheet() {
  const view = renderWithIntl(<LanguagePreference />);
  openLanguageSheet();
  transition.isPending = true;
  view.rerender(<LanguagePreference />);

  return {
    dialog: screen.getByRole("dialog", { name: "Language" }),
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

  it("opens a named dialog with a named radiogroup and both language options", () => {
    renderWithIntl(<LanguagePreference />);

    const { dialog } = openLanguageSheet();
    const languageOptions = within(dialog).getByRole("radiogroup", { name: "Language" });

    expect(within(languageOptions).getAllByRole("radio")).toHaveLength(2);
    expect(within(languageOptions).getByRole("radio", { name: "English" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(within(languageOptions).getByRole("radio", { name: "한국어" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it.each([
    ["en", "Language", "English"],
    ["ko", "언어", "한국어"],
  ] as const)("focuses the selected option when the %s sheet opens", (locale, title, option) => {
    renderWithIntl(<LanguagePreference />, { locale });

    const { dialog } = openLanguageSheet(title);

    expect(within(dialog).getByRole("radio", { name: option })).toHaveFocus();
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

      const { dialog } = openLanguageSheet(title);
      const selectedOption = within(dialog).getByRole("radio", { name: selectedLabel });
      const nextOption = within(dialog).getByRole("radio", { name: nextLabel });

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

    const { dialog } = openLanguageSheet();
    fireEvent.click(within(dialog).getByRole("radio", { name: "한국어" }));

    expect(navigation.replace).toHaveBeenCalledWith("/my-page?from=dashboard#settings", {
      locale: "ko",
    });
    expect(navigation.replace).toHaveBeenCalledTimes(1);
  });

  it("closes without navigation when the current language is selected", async () => {
    renderWithIntl(<LanguagePreference />);

    const { dialog, trigger } = openLanguageSheet();
    fireEvent.click(within(dialog).getByRole("radio", { name: "English" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(navigation.replace).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it.each([
    [
      "Escape",
      (dialog: HTMLElement) => fireEvent(dialog, new Event("cancel", { cancelable: true })),
    ],
    ["backdrop", (dialog: HTMLElement) => fireEvent.click(dialog)],
    [
      "close button",
      (dialog: HTMLElement) =>
        fireEvent.click(within(dialog).getByRole("button", { name: "Close dialog" })),
    ],
  ])("restores focus to the trigger after closing with %s", async (_, dismiss) => {
    renderWithIntl(<LanguagePreference />);

    const { dialog, trigger } = openLanguageSheet();
    dismiss(dialog);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("disables both options and prevents duplicate navigation while a transition is pending", () => {
    transition.isPending = true;
    renderWithIntl(<LanguagePreference />);

    const { dialog } = openLanguageSheet();
    const english = within(dialog).getByRole("radio", { name: "English" });
    const korean = within(dialog).getByRole("radio", { name: "한국어" });

    expect(english).toBeDisabled();
    expect(korean).toBeDisabled();
    fireEvent.click(korean);
    fireEvent.click(korean);
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it.each([
    [
      "Escape",
      (dialog: HTMLElement) => fireEvent(dialog, new Event("cancel", { cancelable: true })),
    ],
    ["backdrop", (dialog: HTMLElement) => fireEvent.click(dialog)],
    [
      "close button",
      (dialog: HTMLElement) => {
        const closeButton = within(dialog).getByRole("button", { name: "Close dialog" });
        expect(closeButton).toBeEnabled();
        fireEvent.click(closeButton);
      },
    ],
  ])("allows %s dismissal and restores focus while a transition is pending", async (_, dismiss) => {
    const { dialog, trigger } = renderOpenPendingSheet();

    dismiss(dialog);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});
