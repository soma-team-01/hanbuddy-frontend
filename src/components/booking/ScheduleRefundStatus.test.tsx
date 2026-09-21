import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import {
  ApplicationScheduleRefundStatus,
  ScheduleRefundStatus,
  ScheduleRefundAmount,
  useApplicationScheduleRefundQuery,
} from "./ScheduleRefundStatus";
import type { ScheduleCancellationTaskStatus } from "@/types/schedule-cancellation";
import { getApplicationScheduleCancellation } from "@/lib/api/schedule-cancellation";
import { createApiClientError } from "@/lib/api/errors";
import { createQueryClient } from "@/lib/query/client";

vi.mock("@/lib/api/schedule-cancellation", () => ({ getApplicationScheduleCancellation: vi.fn() }));
vi.mock("next/navigation", async (original) => ({
  ...(await original<typeof import("next/navigation")>()),
  useRouter: () => ({ replace: vi.fn() }),
}));

function RefundStatusQuery() {
  const query = useApplicationScheduleRefundQuery("1");
  return <ApplicationScheduleRefundStatus query={query} />;
}

describe("schedule refund states", () => {
  it("allows a manual review-status refresh without any write request", async () => {
    vi.mocked(getApplicationScheduleCancellation)
      .mockReset()
      .mockResolvedValue({
        status: "success",
        cancellation: {
          applicationId: 1,
          refundStatus: "REVIEW_REQUIRED",
          reviewReason: "INTERNAL_REVIEW",
          additionalRefundAmount: null,
          currency: null,
        },
      });
    renderWithQueryClient(<RefundStatusQuery />, { locale: "ko" });
    fireEvent.click(await screen.findByRole("button", { name: "상태 다시 확인" }));
    await waitFor(() => expect(getApplicationScheduleCancellation).toHaveBeenCalledTimes(2));
    expect(screen.queryByText(/INTERNAL_REVIEW/)).not.toBeInTheDocument();
  });

  it("refreshes the application instead of inventing a cancellation on SCHEDULE400_NOT_CANCELLED", async () => {
    vi.mocked(getApplicationScheduleCancellation)
      .mockReset()
      .mockResolvedValue({
        status: "error",
        error: createApiClientError(400, {
          isSuccess: false,
          code: "SCHEDULE400_NOT_CANCELLED",
          message: "No task",
        }),
      });
    const queryClient = createQueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    renderWithQueryClient(<RefundStatusQuery />, {
      locale: "ko",
      queryClient,
    });
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["applications", "me"] }),
    );
    expect(screen.queryByText("환불 완료")).not.toBeInTheDocument();
  });
  it.each<[ScheduleCancellationTaskStatus, string]>([
    ["QUEUED", "환불 처리 중"],
    ["DISPATCHED", "환불 처리 중"],
    ["REVIEW_REQUIRED", "환불 확인 중 · 완료까지 시간이 걸릴 수 있습니다."],
    ["COMPLETED", "환불 완료"],
    ["NO_PAYMENT", "취소 완료 · 확인된 결제 없음"],
    ["EXCLUDED", "기존 취소·환불 정책 유지"],
  ])("renders %s without exposing internal review codes", (refundStatus, label) => {
    renderWithQueryClient(
      <ScheduleRefundStatus
        task={{
          applicationId: 1,
          refundStatus,
          reviewReason: "INTERNAL_SECRET_REVIEW_CODE",
          additionalRefundAmount: null,
          currency: null,
        }}
      />,
      { locale: "ko" },
    );
    expect(screen.getByRole("status")).toHaveTextContent(label);
    expect(screen.queryByText(/INTERNAL_SECRET/)).not.toBeInTheDocument();
    expect(screen.queryByText(/현재 환불 건/)).not.toBeInTheDocument();
  });
  it("keeps the amount out of the status summary", () => {
    renderWithQueryClient(
      <ScheduleRefundStatus
        task={{
          applicationId: 1,
          refundStatus: "COMPLETED",
          reviewReason: null,
          additionalRefundAmount: 12.34,
          currency: "USD",
        }}
      />,
      { locale: "ko" },
    );
    expect(screen.getByText("환불 완료")).toBeInTheDocument();
    expect(screen.queryByText(/12.34/)).not.toBeInTheDocument();
  });
  it.each([null, 0, 12.34])(
    "displays only a known refund amount (%s) with its provider currency",
    (amount) => {
      renderWithQueryClient(
        <ScheduleRefundAmount
          task={{
            applicationId: 1,
            refundStatus: "COMPLETED",
            reviewReason: null,
            additionalRefundAmount: amount,
            currency: "USD",
          }}
        />,
        { locale: "ko" },
      );
      if (amount === null) expect(screen.queryByText("환불 금액")).not.toBeInTheDocument();
      else {
        expect(screen.getByText("환불 금액").parentElement).toHaveTextContent(amount.toFixed(2));
        expect(screen.getByText("환불 금액").parentElement).not.toHaveTextContent("₩");
      }
    },
  );
  it.each(["NO_PAYMENT", "EXCLUDED"] as const)("does not show an amount for %s", (refundStatus) => {
    renderWithQueryClient(
      <ScheduleRefundAmount
        task={{
          applicationId: 1,
          refundStatus,
          reviewReason: null,
          additionalRefundAmount: 100,
          currency: "KRW",
        }}
      />,
    );
    expect(screen.queryByText("Refund amount")).not.toBeInTheDocument();
  });
});
