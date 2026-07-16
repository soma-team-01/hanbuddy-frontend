import { fireEvent, screen } from "@testing-library/react";
import { useEffect, useState, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/routing";
import { IntlTestProvider, renderWithIntl } from "@/test/render-with-intl";
import { PayPalPaymentButtons, PayPalPaymentProvider } from "./PayPalPaymentButton";

const { paypalProviderMountSpy, paypalProviderUnmountSpy, paypalProviderRenderSpy } = vi.hoisted(
  () => ({
    paypalProviderMountSpy: vi.fn(),
    paypalProviderUnmountSpy: vi.fn(),
    paypalProviderRenderSpy: vi.fn(),
  }),
);

vi.mock("@paypal/react-paypal-js/sdk-v6", () => ({
  PayPalProvider: ({ children, locale }: { children: ReactNode; locale?: string }) => {
    const [mountedLocale] = useState(locale);
    paypalProviderRenderSpy(locale);
    useEffect(() => {
      paypalProviderMountSpy(mountedLocale);
      return () => paypalProviderUnmountSpy(mountedLocale);
    }, [mountedLocale]);
    return children;
  },
  PayPalOneTimePaymentButton: () => <button type="button">PayPal</button>,
  PayPalGuestPaymentButton: () => <button type="button">Debit or Credit Card</button>,
}));

function paymentButtons() {
  return (
    <PayPalPaymentProvider>
      <PayPalPaymentButtons
        createOrder={vi.fn().mockResolvedValue({ orderId: "ORDER123" })}
        onApprove={vi.fn()}
      />
    </PayPalPaymentProvider>
  );
}

function renderButtons(locale: Locale = "en") {
  return renderWithIntl(paymentButtons(), { locale });
}

describe("PayPalPaymentButtons", () => {
  beforeEach(() => {
    paypalProviderMountSpy.mockClear();
    paypalProviderUnmountSpy.mockClear();
    paypalProviderRenderSpy.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ["en", "Payment unavailable"],
    ["ko", "결제를 이용할 수 없습니다."],
  ] satisfies Array<[Locale, string]>)(
    "renders the localized disabled fallback in %s when the PayPal client id is missing",
    (locale, unavailableLabel) => {
      vi.stubEnv("NEXT_PUBLIC_PAYPAL_CLIENT_ID", "");

      renderButtons(locale);

      expect(screen.getByRole("button", { name: unavailableLabel })).toBeDisabled();
      expect(screen.queryByRole("button", { name: "PayPal" })).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Debit or Credit Card" }),
      ).not.toBeInTheDocument();
    },
  );

  it("remounts the PayPal provider with the mapped locale when the app locale changes", () => {
    vi.stubEnv("NEXT_PUBLIC_PAYPAL_CLIENT_ID", "test-client-id");

    const { rerender } = renderWithIntl(
      <IntlTestProvider locale="en">{paymentButtons()}</IntlTestProvider>,
    );

    expect(paypalProviderRenderSpy).toHaveBeenLastCalledWith("en_US");
    expect(paypalProviderMountSpy).toHaveBeenCalledTimes(1);
    expect(paypalProviderMountSpy).toHaveBeenLastCalledWith("en_US");
    expect(paypalProviderUnmountSpy).not.toHaveBeenCalled();

    rerender(<IntlTestProvider locale="ko">{paymentButtons()}</IntlTestProvider>);

    expect(paypalProviderRenderSpy).toHaveBeenLastCalledWith("ko_KR");
    expect(paypalProviderUnmountSpy).toHaveBeenCalledTimes(1);
    expect(paypalProviderUnmountSpy).toHaveBeenLastCalledWith("en_US");
    expect(paypalProviderMountSpy).toHaveBeenCalledTimes(2);
    expect(paypalProviderMountSpy).toHaveBeenLastCalledWith("ko_KR");
  });

  it("renders the card and PayPal SDK buttons without a selector in that order", () => {
    vi.stubEnv("NEXT_PUBLIC_PAYPAL_CLIENT_ID", "test-client-id");

    renderButtons();

    expect(screen.queryByRole("group", { name: "Payment method" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Debit or Credit Card",
      "PayPal",
    ]);
  });

  it("lays out both payment buttons in one equal-width row", () => {
    vi.stubEnv("NEXT_PUBLIC_PAYPAL_CLIENT_ID", "test-client-id");

    renderButtons();

    const cardButton = screen.getByRole("button", { name: "Debit or Credit Card" });
    const paypalButton = screen.getByRole("button", { name: "PayPal" });
    const cardCell = cardButton.parentElement;
    const paypalCell = paypalButton.parentElement;

    expect(cardCell).not.toBe(paypalCell);
    expect(cardCell).toHaveClass("min-w-0", "flex-1", "[&>*]:w-full");
    expect(paypalCell).toHaveClass("min-w-0", "flex-1", "[&>*]:w-full");
    expect(cardCell?.parentElement).toBe(paypalCell?.parentElement);
    expect(cardCell?.parentElement).toHaveClass("flex-row");
  });

  it("expands the card checkout to the full payment width after the card button is clicked", () => {
    vi.stubEnv("NEXT_PUBLIC_PAYPAL_CLIENT_ID", "test-client-id");

    renderButtons();

    const cardButton = screen.getByRole("button", { name: "Debit or Credit Card" });
    const paypalButton = screen.getByRole("button", { name: "PayPal" });
    const cardCell = cardButton.parentElement;
    const paypalCell = paypalButton.parentElement;

    fireEvent.click(cardButton);

    expect(cardCell).toHaveClass("w-full");
    expect(cardCell).not.toHaveClass("flex-1");
    expect(paypalCell).toHaveClass("hidden");
  });
});
