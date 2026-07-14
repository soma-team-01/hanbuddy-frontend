import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Application } from "@/types/application";
import { ApplicationList } from "./application-list";

vi.mock("@paypal/react-paypal-js/sdk-v6", () => ({
  PayPalProvider: ({ children }: { children: React.ReactNode }) => children,
  PayPalOneTimePaymentButton: ({
    createOrder,
    onApprove,
    onError,
  }: {
    createOrder: () => Promise<{ orderId: string }>;
    onApprove: (data: { orderId: string }) => Promise<void> | void;
    onError?: (error: unknown) => void;
  }) => (
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
    >
      PayPal
    </button>
  ),
}));

const applications: Application[] = [
  {
    id: "1",
    status: "pending_payment",
    dateLabel: "Jul 20, 2026",
    hostName: "Jihoon Kim",
    hostAvatarUrl: null,
    activityTitle: "Bukchon Hidden Gems",
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
  return render(
    <ApplicationList
      applications={applications}
      onCancelApplication={vi.fn()}
      onContinuePayment={vi.fn().mockResolvedValue({ orderId: "ORDER123" })}
      onCapturePayment={vi.fn()}
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

  it("pays a pending application through the PayPal button", async () => {
    const onContinuePayment = vi.fn().mockResolvedValue({ orderId: "ORDER123" });
    const onCapturePayment = vi.fn().mockResolvedValue(undefined);
    renderList({ onContinuePayment, onCapturePayment });

    fireEvent.click(screen.getByRole("button", { name: "PayPal" }));

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

  it("keeps the review action disabled until its flow is available", () => {
    renderList();

    fireEvent.click(screen.getByRole("tab", { name: "Past" }));

    expect(screen.getByRole("button", { name: "Leave Review · Coming soon" })).toBeDisabled();
  });
});
