import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import type { Application } from "@/types/application";
import { ApplicationList } from "./application-list";

vi.mock("@paypal/react-paypal-js/sdk-v6", () => {
  interface MockButtonProps {
    createOrder: () => Promise<{ orderId: string }>;
    onApprove: (data: { orderId: string }) => Promise<void> | void;
    onError?: (error: unknown) => void;
    disabled?: boolean;
  }
  function MockPaymentButton({
    label,
    createOrder,
    onApprove,
    onError,
    disabled,
  }: MockButtonProps & { label: string }) {
    return (
      <button
        type="button"
        onClick={async () => {
          try {
            const { orderId } = await createOrder();
            await onApprove({ orderId });
          } catch (error) {
            onError?.(error);
          }
        }}
        disabled={disabled}
      >
        {label}
      </button>
    );
  }
  return {
    PayPalProvider: ({ children }: { children: React.ReactNode }) => children,
    PayPalOneTimePaymentButton: (props: MockButtonProps) => (
      <MockPaymentButton label="PayPal" {...props} />
    ),
    PayPalGuestPaymentButton: (props: MockButtonProps) => (
      <MockPaymentButton label="Debit or Credit Card" {...props} />
    ),
  };
});

const applications: Application[] = [
  {
    id: "1",
    status: "pending_payment",
    dateLabel: "Jul 20, 2026",
    hostName: "Jihoon Kim",
    hostAvatarUrl: null,
    activityTitle: "Bukchon Hidden Gems",
    breakdown: {
      unitPrice: 45000,
      guests: 2,
      serviceFee: 0,
    },
    paymentAmount: 68.97,
    paymentCurrency: "USD",
  },
  {
    id: "2",
    status: "completed",
    dateLabel: "Jul 10, 2026",
    hostName: "Minji Lee",
    hostAvatarUrl: null,
    activityTitle: "Traditional Tea Tasting",
  },
];

function renderList(overrides: Partial<React.ComponentProps<typeof ApplicationList>> = {}) {
  return renderWithIntl(
    <ApplicationList
      applications={applications}
      onCancelApplication={vi.fn()}
      onContinuePayment={vi
        .fn()
        .mockResolvedValue({ orderId: "ORDER123", paymentAmount: 68.97, paymentCurrency: "USD" })}
      onCapturePayment={vi.fn()}
      isPaymentPending={false}
      {...overrides}
    />,
  );
}

describe("ApplicationList", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_PAYPAL_CLIENT_ID", "test-client-id");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("shows the KRW total and PayPal charge before a payment method is selected", () => {
    const onContinuePayment = vi
      .fn()
      .mockResolvedValue({ orderId: "ORDER123", paymentAmount: 68.97, paymentCurrency: "USD" });
    const onCapturePayment = vi.fn();

    renderList({ onContinuePayment, onCapturePayment });

    expect(screen.getByText("$68.97")).toBeInTheDocument();
    expect(screen.getByText("₩90,000")).toBeInTheDocument();
    expect(onContinuePayment).not.toHaveBeenCalled();
    expect(onCapturePayment).not.toHaveBeenCalled();
  });

  it("shows the PayPal charge instead of a service fee after payment", () => {
    renderList({
      applications: [
        {
          ...applications[0],
          id: "3",
          status: "confirmed",
        },
      ],
    });

    expect(screen.getByText("$68.97")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Price Breakdown" }));

    expect(screen.getByText("Paid with PayPal")).toBeInTheDocument();
    expect(screen.getAllByText("$68.97")).toHaveLength(2);
    expect(screen.queryByText("Service fee")).not.toBeInTheDocument();
  });

  it("pays a pending application through the PayPal button", async () => {
    const onContinuePayment = vi
      .fn()
      .mockResolvedValue({ orderId: "ORDER123", paymentAmount: 68.97, paymentCurrency: "USD" });
    const onCapturePayment = vi.fn().mockResolvedValue(undefined);
    renderList({ onContinuePayment, onCapturePayment });

    expect(screen.getByText("$68.97")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "PayPal" }));

    await waitFor(() => {
      expect(onCapturePayment).toHaveBeenCalledWith("1", "ORDER123");
    });
    expect(onContinuePayment).toHaveBeenCalledWith("1");
  });

  it("pays a pending application as a guest with a card", async () => {
    const onContinuePayment = vi
      .fn()
      .mockResolvedValue({ orderId: "ORDER123", paymentAmount: 68.97, paymentCurrency: "USD" });
    const onCapturePayment = vi.fn().mockResolvedValue(undefined);
    renderList({ onContinuePayment, onCapturePayment });

    fireEvent.click(screen.getByRole("button", { name: "Debit or Credit Card" }));

    await waitFor(() => {
      expect(onCapturePayment).toHaveBeenCalledWith("1", "ORDER123");
    });
    expect(onContinuePayment).toHaveBeenCalledWith("1");
  });

  it("shows the payment error when the capture fails", async () => {
    const onCapturePayment = vi.fn().mockRejectedValue(new Error("결제를 완료하지 못했습니다."));
    renderList({ onCapturePayment });

    fireEvent.click(screen.getByRole("button", { name: "PayPal" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("결제를 완료하지 못했습니다.");
  });

  it("disables the payment action when PayPal is not configured", () => {
    vi.stubEnv("NEXT_PUBLIC_PAYPAL_CLIENT_ID", "");

    renderList();

    expect(screen.getByRole("button", { name: "Payment unavailable" })).toBeDisabled();
  });

  it("disables payment methods while a payment request is pending", () => {
    renderList({ isPaymentPending: true });

    expect(screen.getByRole("button", { name: "PayPal" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Debit or Credit Card" })).toBeDisabled();
  });

  it("keeps the review action disabled until its flow is available", () => {
    renderList();

    fireEvent.click(screen.getByRole("tab", { name: "Past" }));

    expect(screen.getByRole("button", { name: "Leave Review · Coming soon" })).toBeDisabled();
  });
});
