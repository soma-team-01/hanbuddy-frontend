import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PayPalPaymentButtons, PayPalPaymentProvider } from "./PayPalPaymentButton";

vi.mock("@paypal/react-paypal-js/sdk-v6", () => ({
  PayPalProvider: ({ children }: { children: React.ReactNode }) => children,
  PayPalOneTimePaymentButton: () => <button type="button">PayPal</button>,
  PayPalGuestPaymentButton: () => <button type="button">Debit or Credit Card</button>,
}));

function renderButtons() {
  return render(
    <PayPalPaymentProvider>
      <PayPalPaymentButtons
        createOrder={vi.fn().mockResolvedValue({ orderId: "ORDER123" })}
        onApprove={vi.fn()}
      />
    </PayPalPaymentProvider>,
  );
}

describe("PayPalPaymentButtons", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders a disabled fallback when the PayPal client id is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_PAYPAL_CLIENT_ID", "");

    renderButtons();

    expect(screen.getByRole("button", { name: "Payment unavailable" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "PayPal" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Debit or Credit Card" })).not.toBeInTheDocument();
  });

  it("renders the card and PayPal SDK buttons directly in that order", () => {
    vi.stubEnv("NEXT_PUBLIC_PAYPAL_CLIENT_ID", "test-client-id");

    renderButtons();

    expect(screen.queryByRole("group", { name: "Payment method" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Debit or Credit Card",
      "PayPal",
    ]);
  });
});
