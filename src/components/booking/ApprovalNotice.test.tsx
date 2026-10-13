import { fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { ApprovalNotice } from "./ApprovalNotice";
import type { Locale } from "@/i18n/routing";
import en from "@/messages/en.json";
import ko from "@/messages/ko.json";
import ja from "@/messages/ja.json";
import zhHans from "@/messages/zh-Hans.json";
import zhHant from "@/messages/zh-Hant.json";

const messages = { en, ko, ja, "zh-Hans": zhHans, "zh-Hant": zhHant };

it.each(Object.keys(messages) as Locale[])(
  "requires explicit approval acknowledgment in %s",
  (locale) => {
    const onAgreedChange = vi.fn();
    renderWithIntl(<ApprovalNotice agreed={false} onAgreedChange={onAgreedChange} />, {
      locale,
      messages: messages[locale],
    });
    const checkbox = screen.getByRole("checkbox", {
      name: messages[locale].Approval.beforePayment,
    });
    expect(checkbox).toBeRequired();
    expect(checkbox).not.toBeChecked();
    expect(checkbox.closest("label")).toHaveClass("text-ink");
    expect(checkbox.closest("label")).toHaveClass("items-start", "gap-2", "py-3");
    expect(checkbox.closest("label")).not.toHaveClass("px-1", "items-center");
    fireEvent.click(checkbox);
    expect(onAgreedChange).toHaveBeenCalledWith(true);
  },
);

it.each(Object.keys(messages) as Locale[])(
  "keeps referral approval separate from payment in %s",
  (locale) => {
    renderWithIntl(<ApprovalNotice referral agreed onAgreedChange={vi.fn()} />, {
      locale,
      messages: messages[locale],
    });
    expect(
      screen.getByRole("checkbox", { name: messages[locale].Approval.beforeReferral }),
    ).toBeChecked();
  },
);
