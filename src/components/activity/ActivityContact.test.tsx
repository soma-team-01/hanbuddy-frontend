import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { CONTACT_DETAILS } from "@/lib/contact-details";
import en from "@/messages/en.json";
import ko from "@/messages/ko.json";
import ja from "@/messages/ja.json";
import zhHans from "@/messages/zh-Hans.json";
import zhHant from "@/messages/zh-Hant.json";
import { ActivityContact } from "./ActivityContact";

describe("ActivityContact", () => {
  afterEach(() => vi.useRealTimers());

  it("keeps an accessible icon-only button above the booking bar", () => {
    renderWithIntl(<ActivityContact />);
    const trigger = screen.getByRole("button", { name: en.ActivityContact.trigger });
    expect(trigger).toHaveClass("size-12", "rounded-full");
    expect(trigger).toHaveAttribute("aria-label", en.ActivityContact.trigger);
    expect(trigger).toHaveAttribute("title", en.ActivityContact.trigger);
    expect(trigger.textContent).toBe("");
    expect(trigger.parentElement).toHaveClass(
      "right-4",
      "bottom-[calc(var(--fixed-bar-height,0px)+1.5rem)]",
    );
  });

  it("introduces the contact button for three seconds without hiding the button", () => {
    vi.useFakeTimers();
    renderWithIntl(<ActivityContact />);
    const trigger = screen.getByRole("button", { name: en.ActivityContact.trigger });
    expect(screen.getByText(en.ActivityContact.teaser)).toBeInTheDocument();
    expect(screen.getByText(en.ActivityContact.teaser)).toHaveClass(
      "right-[calc(100%+0.75rem)]",
      "top-1/2",
      "origin-right",
      "border-primary/40",
      "after:border-primary/40",
      "bg-canvas-soft",
    );
    expect(trigger).toHaveAccessibleDescription(en.ActivityContact.teaser);
    act(() => vi.advanceTimersByTime(2999));
    expect(screen.getByText(en.ActivityContact.teaser)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText(en.ActivityContact.teaser)).not.toBeInTheDocument();
    expect(trigger).toBeInTheDocument();
    expect(trigger).not.toHaveAttribute("aria-describedby");
  });

  it("dismisses the introduction on opening and does not replay it on close or rerender", () => {
    vi.useFakeTimers();
    const view = renderWithIntl(<ActivityContact />);
    fireEvent.click(screen.getByRole("button", { name: en.ActivityContact.trigger }));
    expect(screen.queryByText(en.ActivityContact.teaser)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    view.rerender(<ActivityContact />);
    expect(screen.queryByText(en.ActivityContact.teaser)).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.queryByText(en.ActivityContact.teaser)).not.toBeInTheDocument();
  });

  it("clears the introduction timer when leaving the detail page", () => {
    vi.useFakeTimers();
    const view = renderWithIntl(<ActivityContact />);
    expect(vi.getTimerCount()).toBe(1);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each([
    ["en", en],
    ["ko", ko],
    ["ja", ja],
    ["zh-Hans", zhHans],
    ["zh-Hant", zhHant],
  ] as const)("offers official contact channels in %s only after opening", (locale, messages) => {
    renderWithIntl(<ActivityContact />, { locale, messages });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText(messages.ActivityContact.teaser)).toBeInTheDocument();
    const trigger = screen.getByRole("button", { name: messages.ActivityContact.trigger });
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: messages.ActivityContact.title });
    expect(dialog).toHaveTextContent(messages.ActivityContact.description);
    expect(within(dialog).getAllByRole("link")).toHaveLength(4);
    expect(within(dialog).getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
      "href",
      CONTACT_DETAILS.whatsappUrl,
    );
    expect(within(dialog).getByRole("link", { name: "KakaoTalk" })).toHaveAttribute(
      "href",
      CONTACT_DETAILS.kakaoUrl,
    );
    expect(within(dialog).getByRole("link", { name: "Instagram" })).toHaveAttribute(
      "href",
      CONTACT_DETAILS.instagramUrl,
    );
    expect(
      within(dialog).getByRole("link", { name: messages.AlternativePayment.email }),
    ).toHaveAttribute("href", `mailto:${CONTACT_DETAILS.email}`);
    for (const link of within(dialog).getAllByRole("link")) {
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
    expect(
      within(dialog).queryByRole("button", { name: messages.AlternativePayment.copy }),
    ).not.toBeInTheDocument();
  });

  it.each(["escape", "close", "backdrop"])("restores focus and scrolling after %s", (method) => {
    document.body.style.overflow = "auto";
    renderWithIntl(<ActivityContact />);
    const trigger = screen.getByRole("button", { name: en.ActivityContact.trigger });
    trigger.focus();
    fireEvent.click(trigger);
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByRole("button", { name: "Close dialog" })).toHaveFocus();
    if (method === "escape")
      fireEvent(
        screen.getByRole("dialog"),
        new Event("cancel", { bubbles: true, cancelable: true }),
      );
    else
      fireEvent.click(
        method === "close"
          ? screen.getByRole("button", { name: "Close dialog" })
          : screen.getByTestId("activity-contact-backdrop"),
      );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("auto");
    document.body.style.overflow = "";
  });
});
