import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/render-with-intl";
import type { ApplicationResponse } from "@/types/application";
import { ApplicationConfirmation } from "./ApplicationConfirmation";
import { PayPalAuthorizationNotice } from "@/components/payment/PayPalAuthorizationNotice";
import en from "@/messages/en.json";
import ko from "@/messages/ko.json";
import ja from "@/messages/ja.json";
import zhHans from "@/messages/zh-Hans.json";
import zhHant from "@/messages/zh-Hant.json";
import type { Locale } from "@/i18n/routing";

const messages = { en, ko, ja, "zh-Hans": zhHans, "zh-Hant": zhHant };
const shortCopy = {
  en: "You’ll be charged after your buddy approves. We’ll email you the decision.",
  ko: "실제 결제는 버디 승인 후 진행되며, 승인 여부는 이메일로 안내됩니다.",
  ja: "実際の決済はバディの承認後に行われ、承認結果はメールでお知らせします。",
  "zh-Hans": "实际付款将在向导批准后进行，审批结果将通过邮件通知。",
  "zh-Hant": "實際付款將在嚮導批准後進行，審核結果將透過電子郵件通知。",
};
const releasedCopy = {
  en: "You haven’t been charged.",
  ko: "실제 결제는 이루어지지 않았습니다.",
  ja: "実際の請求は発生していません。",
  "zh-Hans": "未实际扣款。",
  "zh-Hant": "未實際扣款。",
};

const application = {
  applicationId: 11,
  activityTitle: "Seoul studio visit",
  buddyName: "Buddy",
  thumbnailImageUrl: null,
  startAt: "2026-10-09T08:00:00+09:00",
  guestCount: 1,
  totalPrice: 40000,
  currency: "KRW",
  specialRequest: "Please meet us outside.",
} as ApplicationResponse;

describe("ApplicationConfirmation layout", () => {
  const authorizedApplication = {
    ...application,
    status: "PENDING_APPROVAL",
    paymentStatus: "AUTHORIZED",
    paypalAuthorization: {
      state: "AUTHORIZED",
      authorizedAt: null,
      expiresAt: null,
      releasedAt: null,
    },
  } as ApplicationResponse;

  it.each(Object.keys(messages) as Locale[])("keeps the list notice concise in %s", (locale) => {
    renderWithIntl(<PayPalAuthorizationNotice application={authorizedApplication} />, {
      locale,
      messages: messages[locale],
    });
    expect(screen.getByRole("status")).toHaveTextContent(shortCopy[locale]);
  });

  it.each(Object.keys(messages) as Locale[])(
    "uses the same concise approval and email notice on the receipt in %s",
    (locale) => {
      renderWithIntl(
        <ApplicationConfirmation
          application={{ ...authorizedApplication, approvalExpiresAt: "2099-10-18T17:35:00+09:00" }}
        />,
        { locale, messages: messages[locale] },
      );
      expect(screen.getByText(shortCopy[locale])).toBeInTheDocument();
    },
  );

  it.each(Object.keys(messages) as Locale[])(
    "explains that a released authorization was not charged in %s",
    (locale) => {
      renderWithIntl(
        <PayPalAuthorizationNotice
          application={{
            paypalAuthorization: {
              state: "VOIDED",
              authorizedAt: null,
              expiresAt: null,
              releasedAt: null,
            },
          }}
        />,
        { locale, messages: messages[locale] },
      );
      expect(screen.getByRole("status")).toHaveTextContent(releasedCopy[locale]);
    },
  );
  it("shows receipt and a hold, never payment complete for authorized PayPal", () => {
    renderWithIntl(
      <ApplicationConfirmation
        application={{
          ...application,
          status: "PENDING_APPROVAL",
          paymentStatus: "AUTHORIZED",
          paypalAuthorization: {
            state: "AUTHORIZED",
            authorizedAt: null,
            expiresAt: null,
            releasedAt: null,
          },
        }}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Request received · Awaiting buddy approval",
    );
    expect(screen.getByText("Authorization amount")).toBeInTheDocument();
    expect(screen.queryByText(/Payment complete/i)).not.toBeInTheDocument();
  });
  it.each([undefined, 0, 5000])(
    "keeps completion links inline for service price %s",
    (referralServicePrice) => {
      renderWithIntl(
        <ApplicationConfirmation
          application={application}
          referralServicePrice={referralServicePrice}
        />,
      );
      const result = screen.getByTestId(
        referralServicePrice === undefined ? "payment-result" : "referral-result",
      );
      expect(screen.queryByTestId("bottom-action-bar")).not.toBeInTheDocument();
      const actions = within(result).getByTestId("confirmation-actions");
      expect(within(actions).getByRole("link", { name: "View My Applications" })).toHaveAttribute(
        "href",
        "/en/applications",
      );
      expect(
        within(actions).getByRole("link", { name: "Explore More Activities" }),
      ).toHaveAttribute("href", "/en/explore");
      expect(actions).toHaveClass("mt-5", "lg:mt-6");
      expect(result).toHaveClass("max-md:p-3.5", "md:p-10");
      expect(within(result).getByRole("heading", { level: 1 })).toHaveClass(
        "max-md:text-base",
        "md:text-3xl",
      );
      expect(screen.getByText("Oct 9, 2026, 8:00 AM")).toHaveClass("max-md:whitespace-nowrap");
      expect(screen.getByText("1 participant")).toHaveClass("max-md:whitespace-nowrap");
      expect(screen.getByText(application.specialRequest!)).toBeInTheDocument();
    },
  );
});
