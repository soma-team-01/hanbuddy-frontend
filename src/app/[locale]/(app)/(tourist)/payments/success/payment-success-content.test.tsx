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
  startAt: "2026-07-18T16:30:00Z",
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
    expect(screen.getByText("Jul 19, 2026, 1:30 AM")).toBeInTheDocument();
    expect(screen.getByText("Total application amount: ₩90,000")).toBeInTheDocument();
    expect(screen.getByText("Paid with PayPal: $68.97")).toBeInTheDocument();
    expect(screen.getByText("PayPal payments are processed in USD.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View My Applications" })).toHaveAttribute(
      "href",
      "/en/applications",
    );
    expect(screen.getByRole("link", { name: "Explore More Activities" })).toHaveAttribute(
      "href",
      "/en/explore",
    );
  });

  it("renders the localized unavailable label for an invalid timestamp", async () => {
    mockedGetMyApplications.mockResolvedValue({
      status: "success",
      applications: [{ ...confirmedApplication, startAt: "2026-07-20T10:00" }],
    });

    renderWithQueryClient(<PaymentSuccessContent applicationId="11" />, { locale: "ko" });

    expect(await screen.findByText("시간 정보를 확인할 수 없습니다.")).toBeInTheDocument();
  });

  it("offers a recovery action when the payment cannot be found", async () => {
    mockedGetMyApplications.mockResolvedValue({ status: "success", applications: [] });

    renderWithQueryClient(<PaymentSuccessContent applicationId="11" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't find this payment confirmation.",
    );
    expect(screen.getByRole("link", { name: "View My Applications" })).toHaveAttribute(
      "href",
      "/en/applications",
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

  it("localizes the complete Korean payment confirmation and preserves activity content", async () => {
    mockedGetMyApplications.mockResolvedValue({
      status: "success",
      applications: [confirmedApplication],
    });

    renderWithQueryClient(<PaymentSuccessContent applicationId="11" />, { locale: "ko" });

    expect(await screen.findByRole("heading", { name: "결제 완료" })).toBeInTheDocument();
    expect(screen.getByText("신청이 확정되었습니다.")).toBeInTheDocument();
    expect(screen.getByText("내 액티비티")).toBeInTheDocument();
    expect(screen.getByText("Bukchon Hidden Gems")).toBeInTheDocument();
    expect(screen.getByText("2026. 7. 19. 오전 1:30")).toBeInTheDocument();
    expect(screen.getByText("신청 총액: ₩90,000")).toBeInTheDocument();
    expect(screen.getByText("PayPal로 결제: US$68.97")).toBeInTheDocument();
    expect(screen.getByText("PayPal 결제는 USD로 처리됩니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "내 신청 보기" })).toHaveAttribute(
      "href",
      "/ko/applications",
    );
    expect(screen.getByRole("link", { name: "액티비티 더 둘러보기" })).toHaveAttribute(
      "href",
      "/ko/explore",
    );
  });

  it("localizes Korean loading and recovery copy", async () => {
    mockedGetMyApplications.mockReturnValue(new Promise(() => undefined));

    const view = renderWithQueryClient(<PaymentSuccessContent applicationId="11" />, {
      locale: "ko",
    });

    expect(screen.getByText("결제 정보를 불러오는 중...")).toBeInTheDocument();

    view.unmount();
    mockedGetMyApplications.mockResolvedValue({ status: "success", applications: [] });
    renderWithQueryClient(<PaymentSuccessContent applicationId="11" />, { locale: "ko" });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "결제 확인 정보를 찾을 수 없습니다.",
    );
    expect(screen.getByRole("link", { name: "내 신청 보기" })).toHaveAttribute(
      "href",
      "/ko/applications",
    );
  });
});
