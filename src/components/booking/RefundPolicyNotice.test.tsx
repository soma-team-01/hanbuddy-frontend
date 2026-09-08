import { within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/routing";
import en from "@/messages/en.json";
import ja from "@/messages/ja.json";
import ko from "@/messages/ko.json";
import zhHans from "@/messages/zh-Hans.json";
import zhHant from "@/messages/zh-Hant.json";
import { renderWithIntl } from "@/test/render-with-intl";
import { RefundPolicyNotice } from "./RefundPolicyNotice";

const messages = { en, ja, ko, "zh-Hans": zhHans, "zh-Hant": zhHant };
const freeCancellationConditions = {
  en: ["Within 30 min of payment confirmation", "before activity starts"],
  ko: ["결제 확정 후 30분 이내", "활동 시작 전"],
  ja: ["決済確定後30分以内", "活動開始前"],
  "zh-Hans": ["付款确认后30分钟内", "活动开始前"],
  "zh-Hant": ["付款確認後30分鐘內", "活動開始前"],
};

describe("RefundPolicyNotice", () => {
  it.each(LOCALES)("shows free cancellation and exceptions in %s", (locale) => {
    const { container } = renderWithIntl(<RefundPolicyNotice />, {
      locale,
      messages: messages[locale],
    });
    expect(container.querySelectorAll("dl > div")).toHaveLength(5);
    expect(container.querySelector("#refund-policy-exceptions")).toHaveTextContent(/\S/);
    const summary = container.querySelector("dl")!;
    const freeCancellationRow = summary.querySelector("div")!;
    const conditions = within(freeCancellationRow).getByRole("term");
    for (const condition of freeCancellationConditions[locale]) {
      expect(conditions).toHaveTextContent(condition);
    }
    const refundValues = summary.querySelectorAll("dd");
    expect(refundValues[0].textContent).toBe(refundValues[1].textContent);
  });
});
