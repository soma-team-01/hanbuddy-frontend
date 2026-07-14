import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PayPalPaymentButton, PayPalPaymentProvider } from "./PayPalPaymentButton";

vi.mock("@paypal/react-paypal-js/sdk-v6", () => ({
  PayPalProvider: ({ children }: { children: React.ReactNode }) => children,
  PayPalOneTimePaymentButton: () => <button type="button">PayPal</button>,
}));

function renderButton() {
  return render(
    <PayPalPaymentProvider>
      <PayPalPaymentButton
        createOrder={vi.fn().mockResolvedValue({ orderId: "ORDER123" })}
        onApprove={vi.fn()}
      />
    </PayPalPaymentProvider>,
  );
}

describe("PayPalPaymentButton", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders a disabled fallback when the PayPal client id is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_PAYPAL_CLIENT_ID", "");

    renderButton();

    expect(screen.getByRole("button", { name: "Payment unavailable" })).toBeDisabled();
  });

  it("renders the PayPal button when the client id is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_PAYPAL_CLIENT_ID", "test-client-id");

    renderButton();

    expect(screen.getByRole("button", { name: "PayPal" })).toBeInTheDocument();
  });
});
