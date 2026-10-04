import { fireEvent, screen } from "@testing-library/react";
import { renderWithQueryClient as render } from "@/test/render-with-query-client";
import { getReferralApplicationDates } from "@/lib/api/referral-reporting";
import { describe, expect, it, vi } from "vitest";
import { ReferralDateRange } from "./ReferralDateRange";
vi.mock("@/lib/api/referral-reporting", () => ({
  getReferralApplicationDates: vi.fn().mockResolvedValue(["2026-10-29"]),
}));

describe("ReferralDateRange", () => {
  it("selects an inclusive range across months without applying a partial selection", () => {
    const onChange = vi.fn();
    render(
      <ReferralDateRange
        activityId={42}
        from="2026-10-01"
        until="2026-10-05"
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /신청 기간 선택/ }));
    fireEvent.click(screen.getByRole("button", { name: "2026-10-29" }));
    expect(screen.getByRole("button", { name: "기간 적용" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "2026-11-03" }));
    fireEvent.click(screen.getByRole("button", { name: "기간 적용" }));
    expect(onChange).toHaveBeenCalledWith("2026-10-29", "2026-11-03");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("supports restarting with an earlier day, a single day, and clearing", () => {
    const onChange = vi.fn();
    render(
      <ReferralDateRange
        activityId={42}
        from="2026-10-01"
        until="2026-10-05"
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /신청 기간 선택/ }));
    for (const day of [20, 10, 10])
      fireEvent.click(screen.getByRole("button", { name: `2026-10-${day}` }));
    fireEvent.click(screen.getByRole("button", { name: "기간 적용" }));
    expect(onChange).toHaveBeenCalledWith("2026-10-10", "2026-10-10");
    fireEvent.click(screen.getByRole("button", { name: /신청 기간 선택/ }));
    fireEvent.click(screen.getByRole("button", { name: "전체 기간" }));
    expect(onChange).toHaveBeenLastCalledWith("", "");
  });
  it("discards draft selection on Escape and restores trigger focus", () => {
    const onChange = vi.fn();
    render(
      <ReferralDateRange
        activityId={42}
        from="2026-10-01"
        until="2026-10-05"
        onChange={onChange}
      />,
    );
    const trigger = screen.getByRole("button", { name: /신청 기간 선택/ });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "2026-10-20" }));
    fireEvent(screen.getByRole("dialog"), new Event("cancel"));
    expect(onChange).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });
  it("marks application days but permits unmarked dates and month navigation", async () => {
    render(
      <ReferralDateRange activityId={42} from="2026-10-01" until="2026-10-05" onChange={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /신청 기간 선택/ }));
    expect(await screen.findByTitle("신청 내역 있음")).toHaveAccessibleName("2026-10-29");
    expect(screen.getByRole("button", { name: "2026-10-28" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "다음 달" }));
    expect(getReferralApplicationDates).toHaveBeenCalledWith(
      42,
      "2026-11-01",
      "2026-12-31",
      expect.any(AbortSignal),
    );
  });
});
