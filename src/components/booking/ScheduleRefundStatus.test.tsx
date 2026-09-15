import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { ScheduleRefundStatus } from "./ScheduleRefundStatus";
import type { ScheduleCancellationTaskStatus } from "@/types/schedule-cancellation";

describe("schedule refund states", () => {
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
  it("pairs the current refund with its provider currency, not a KRW conversion", () => {
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
    expect(screen.getByText(/현재 환불 건/)).toHaveTextContent(/12.34/);
    expect(screen.getByText(/현재 환불 건/)).not.toHaveTextContent("₩");
  });
});
