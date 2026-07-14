import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  captureApplicationPayment,
  continueApplicationPayment,
  createApplication,
} from "@/lib/api/applications";
import { applicationKeys } from "@/lib/query/applications";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import type { Activity } from "@/types/activity";
import type { ApplicationResponse, PaymentReadyResponse } from "@/types/application";
import { BookingForm } from "./booking-form";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

vi.mock("@/lib/api/applications", () => ({
  createApplication: vi.fn(),
  continueApplicationPayment: vi.fn(),
  captureApplicationPayment: vi.fn(),
}));

vi.mock("@paypal/react-paypal-js/sdk-v6", () => {
  interface MockButtonProps {
    createOrder: () => Promise<{ orderId: string }>;
    onApprove: (data: { orderId: string }) => Promise<void> | void;
    onError?: (error: unknown) => void;
  }
  function MockPaymentButton({
    label,
    createOrder,
    onApprove,
    onError,
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

const mockedCreateApplication = vi.mocked(createApplication);
const mockedContinueApplicationPayment = vi.mocked(continueApplicationPayment);
const mockedCaptureApplicationPayment = vi.mocked(captureApplicationPayment);

const activity: Activity = {
  id: "42",
  title: "Bukchon Hidden Gems",
  description: "Walk through quiet alleys with a local buddy.",
  location: "Anguk Station Exit 2",
  district: "Bukchon",
  categoryLabel: "HanBuddy activity",
  imageUrl: "/images/activities/hanok-hero.jpg",
  heroImageUrl: "/images/activities/hanok-hero.jpg",
  rating: 5,
  reviewCount: 0,
  price: 45000,
  host: {
    name: "Jihoon Kim",
    bio: "Local HanBuddy host",
    avatarUrl: null,
  },
  included: [],
  restrictions: [],
  sessions: [
    {
      id: "101",
      dateLabel: "2026-07-20",
      timeLabel: "10:00",
      spotsLeft: 4,
    },
  ],
  meetingPoint: {
    name: "Anguk Station Exit 2",
    area: "Anguk-dong",
    mapImageUrl: "/images/map-bukchon.jpg",
  },
};

const pendingApplication: ApplicationResponse = {
  applicationId: 11,
  activityId: 42,
  activityScheduleId: 101,
  activityTitle: "Bukchon Hidden Gems",
  thumbnailImageUrl: "/images/activities/hanok-hero.jpg",
  buddyName: "Jihoon Kim",
  guestCount: 2,
  specialRequest: "Vegetarian snacks, please.",
  startAt: "2026-07-20T10:00:00+09:00",
  price: 45000,
  totalPrice: 90000,
  currency: "KRW",
  status: "PENDING_PAYMENT",
  cancellationReason: null,
  cancellationDetail: null,
  cancelledAt: null,
  createdAt: "2026-07-07T10:00:00Z",
};

const paymentReady: PaymentReadyResponse = {
  application: pendingApplication,
  paymentId: 7,
  paypalOrderId: "5O190127TN364715T",
  approvalUrl: "https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T",
  paymentStatus: "CREATED",
  orderExpiresAt: "2026-07-14T13:00:00+09:00",
};

describe("BookingForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_PAYPAL_CLIENT_ID", "test-client-id");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates an application and captures the PayPal payment from the confirm dialog", async () => {
    mockedCreateApplication.mockResolvedValue({ status: "success", payment: paymentReady });
    mockedCaptureApplicationPayment.mockResolvedValue({
      status: "success",
      application: { ...pendingApplication, status: "CONFIRMED" },
    });

    const { queryClient } = renderWithQueryClient(<BookingForm activity={activity} />);
    queryClient.setQueryData(applicationKeys.mine(), []);
    fireEvent.change(screen.getByPlaceholderText("Let your guide know..."), {
      target: { value: "Vegetarian snacks, please." },
    });
    fireEvent.click(screen.getByLabelText("I agree to the terms above."));
    fireEvent.click(screen.getByRole("button", { name: /Submit Application/ }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Bukchon Hidden Gems")).toBeInTheDocument();
    expect(within(dialog).getByText("2026-07-20 10:00")).toBeInTheDocument();
    expect(within(dialog).getByText("2 guests")).toBeInTheDocument();
    expect(within(dialog).getByText("₩99,000")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "PayPal" }));

    await waitFor(() => {
      expect(mockedCreateApplication).toHaveBeenCalledWith({
        activityScheduleId: 101,
        guestCount: 2,
        specialRequest: "Vegetarian snacks, please.",
      });
    });
    await waitFor(() => {
      expect(mockedCaptureApplicationPayment).toHaveBeenCalledWith(11, "5O190127TN364715T");
    });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/applications"));
    expect(queryClient.getQueryState(applicationKeys.mine())?.isInvalidated).toBe(true);
  });

  it("pays as a guest with a card through the same application flow", async () => {
    mockedCreateApplication.mockResolvedValue({ status: "success", payment: paymentReady });
    mockedCaptureApplicationPayment.mockResolvedValue({
      status: "success",
      application: { ...pendingApplication, status: "CONFIRMED" },
    });

    renderWithQueryClient(<BookingForm activity={activity} />);
    fireEvent.click(screen.getByLabelText("I agree to the terms above."));
    fireEvent.click(screen.getByRole("button", { name: /Submit Application/ }));

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Debit or Credit Card" }));

    await waitFor(() => {
      expect(mockedCaptureApplicationPayment).toHaveBeenCalledWith(11, "5O190127TN364715T");
    });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/applications"));
  });

  it("continues the existing payment when retrying after a capture failure", async () => {
    mockedCreateApplication.mockResolvedValue({ status: "success", payment: paymentReady });
    mockedCaptureApplicationPayment
      .mockResolvedValueOnce({ status: "error", message: "PayPal 결제 캡처에 실패했습니다." })
      .mockResolvedValueOnce({
        status: "success",
        application: { ...pendingApplication, status: "CONFIRMED" },
      });
    mockedContinueApplicationPayment.mockResolvedValue({
      status: "success",
      payment: { ...paymentReady, paypalOrderId: "NEW_ORDER_ID" },
    });

    renderWithQueryClient(<BookingForm activity={activity} />);
    fireEvent.click(screen.getByLabelText("I agree to the terms above."));
    fireEvent.click(screen.getByRole("button", { name: /Submit Application/ }));

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "PayPal" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "PayPal 결제 캡처에 실패했습니다.",
    );

    fireEvent.click(within(dialog).getByRole("button", { name: "PayPal" }));

    await waitFor(() => {
      expect(mockedContinueApplicationPayment).toHaveBeenCalledWith(11);
    });
    await waitFor(() => {
      expect(mockedCaptureApplicationPayment).toHaveBeenLastCalledWith(11, "NEW_ORDER_ID");
    });
    expect(mockedCreateApplication).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/applications"));
  });

  it("does not create an application when the confirmation is cancelled", () => {
    renderWithQueryClient(<BookingForm activity={activity} />);
    fireEvent.click(screen.getByLabelText("I agree to the terms above."));
    fireEvent.click(screen.getByRole("button", { name: /Submit Application/ }));

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(mockedCreateApplication).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
