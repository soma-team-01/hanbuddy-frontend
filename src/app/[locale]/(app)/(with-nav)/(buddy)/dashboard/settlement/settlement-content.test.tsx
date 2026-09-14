import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { SettlementContent } from "./settlement-content";

describe("SettlementContent", () => {
  it("summarizes the expected payout and splits upcoming from paid", () => {
    renderWithIntl(<SettlementContent />, { locale: "en" });

    // 목업임을 화면에서 밝힌다
    expect(
      screen.getByText("Sample figures — payouts will connect to real data soon."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("₩1,284,000").length).toBeGreaterThan(0);
    expect(screen.getByText(/Based on 7 confirmed bookings/)).toBeInTheDocument();

    const upcoming = screen.getByRole("heading", { name: "Upcoming payouts" })
      .parentElement as HTMLElement;
    // 예정 3건 + 합계 줄
    expect(within(upcoming).getAllByRole("listitem")).toHaveLength(4);
    expect(within(upcoming).getByText("Total").nextElementSibling).toHaveTextContent("₩1,284,000");

    const paid = screen.getByRole("heading", { name: "Paid out" }).parentElement as HTMLElement;
    expect(within(paid).getAllByRole("listitem")).toHaveLength(2);
  });

  it("localizes the Korean payout breakdown", () => {
    renderWithIntl(<SettlementContent />, { locale: "ko" });

    expect(screen.getByText("이번 달 정산 예정 금액")).toBeInTheDocument();
    expect(screen.getByText(/확정 신청 7건 기준/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "지급 예정" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "지급 완료" })).toBeInTheDocument();
    expect(screen.getAllByText("예정").length).toBeGreaterThan(0);
  });
});
