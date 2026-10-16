import { screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { PayPalAuthorizationNotice } from "./PayPalAuthorizationNotice";
import en from "@/messages/en.json";
import ko from "@/messages/ko.json";
import ja from "@/messages/ja.json";
import zhHans from "@/messages/zh-Hans.json";
import zhHant from "@/messages/zh-Hant.json";

const messages = { en, ko, ja, "zh-Hans": zhHans, "zh-Hant": zhHant };

it.each([
  ["ko", "PayPal 처리 결과를 확인 중입니다."],
  ["en", "We’re checking the PayPal result."],
  ["ja", "PayPalの処理結果を確認中です。"],
  ["zh-Hans", "正在确认PayPal处理结果。"],
  ["zh-Hant", "正在確認PayPal處理結果。"],
] as const)("shows concise authorization processing guidance in %s", (locale, message) => {
  renderWithIntl(
    <PayPalAuthorizationNotice
      application={{
        paypalAuthorization: {
          state: "REQUESTED",
          authorizedAt: null,
          expiresAt: null,
          releasedAt: null,
        },
      }}
    />,
    { locale, messages: messages[locale] },
  );
  expect(screen.getByRole("status")).toHaveTextContent(message);
  expect(screen.getByRole("status").textContent).toBe(message);
});

it.each(["AUTHORIZED", "VOIDED"] as const)(
  "uses compact mobile copy and retains desktop sizing for %s",
  (state) => {
    renderWithIntl(
      <PayPalAuthorizationNotice
        application={{
          paypalAuthorization: { state, authorizedAt: null, expiresAt: null, releasedAt: null },
        }}
      />,
    );
    expect(screen.getByRole("status")).toHaveClass(
      "text-sm",
      "leading-6",
      "max-md:text-xs",
      "max-md:leading-5",
    );
  },
);
