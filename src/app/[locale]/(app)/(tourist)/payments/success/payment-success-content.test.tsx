import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMyApplications } from "@/lib/api/applications";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import type { ApplicationResponse } from "@/types/application";
import { PaymentSuccessContent } from "./payment-success-content";

const routerMock = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => routerMock,
}));

vi.mock("@/lib/api/applications", () => ({
  getMyApplications: vi.fn(),
}));

const mockedGetMyApplications = vi.mocked(getMyApplications);

const confirmedApplication: ApplicationResponse = {
  applicationId: 11,
  activityId: 42,
  activityScheduleId: 101,
  activityTitle: "Bukchon Hidden Gems",
  thumbnailImageUrl: null,
  buddyName: "Jihoon Kim",
  guestCount: 2,
  specialRequest: null,
  startAt: "2026-07-20T10:00:00+09:00",
  price: 45000,
  totalPrice: 90000,
  currency: "KRW",
  paymentAmount: 68.97,
  paymentCurrency: "USD",
  status: "CONFIRMED",
  cancellationReason: null,
  cancellationDetail: null,
  cancelledAt: null,
  createdAt: "2026-07-07T10:00:00Z",
};

describe("PaymentSuccessContent", () => {
  beforeEach(() => {
    routerMock.replace.mockReset();
    routerMock.refresh.mockReset();
    mockedGetMyApplications.mockReset();
  });

  it("shows the essential payment confirmation details and next actions", async () => {
    mockedGetMyApplications.mockResolvedValue({
      status: "success",
      applications: [confirmedApplication],
    });

    renderWithQueryClient(<PaymentSuccessContent applicationId="11" />);

    expect(await screen.findByRole("heading", { name: "Payment complete" })).toBeInTheDocument();
    expect(screen.getByText("Your application is confirmed.")).toBeInTheDocument();
    expect(screen.getByText("Bukchon Hidden Gems")).toBeInTheDocument();
    expect(screen.getByText("2026-07-20 10:00")).toBeInTheDocument();
    expect(screen.getByText("₩90,000")).toBeInTheDocument();
    expect(screen.getByText("$68.97")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View My Applications" })).toHaveAttribute(
      "href",
      "/applications",
    );
    expect(screen.getByRole("link", { name: "Explore More Activities" })).toHaveAttribute(
      "href",
      "/explore",
    );
  });

  it("offers a recovery action when the payment cannot be found", async () => {
    mockedGetMyApplications.mockResolvedValue({ status: "success", applications: [] });

    renderWithQueryClient(<PaymentSuccessContent applicationId="11" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't find this payment confirmation.",
    );
    expect(screen.getByRole("link", { name: "View My Applications" })).toHaveAttribute(
      "href",
      "/applications",
    );
  });

  it("does not show a success confirmation for an unpaid application", async () => {
    mockedGetMyApplications.mockResolvedValue({
      status: "success",
      applications: [{ ...confirmedApplication, status: "PENDING_PAYMENT" }],
    });

    renderWithQueryClient(<PaymentSuccessContent applicationId="11" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This application has not been paid yet.",
    );
    expect(screen.queryByRole("heading", { name: "Payment complete" })).not.toBeInTheDocument();
  });
});
