import { fireEvent, render, screen } from "@testing-library/react";
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
