import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { ReferralDashboard } from "./referral-dashboard";
import {
  getReferralActivities,
  getAdminReferralActivity,
  getReferralApplicants,
  getReferralInvitations,
  issueReferralInvitation,
} from "@/lib/api/referral";
import { getAdminBuddies } from "@/lib/api/admin";
import type { AdminBuddySummary } from "@/types/admin";
import type { ReferralInvitation } from "@/types/referral";
vi.mock("@/lib/api/admin", () => ({ getAdminBuddies: vi.fn() }));
import type { MyActivityDetailResponse } from "@/types/buddy";
vi.mock("@/lib/api/referral", () => ({
  getReferralActivities: vi.fn(),
  getAdminReferralActivity: vi.fn(),
  getReferralApplicants: vi.fn(),
  getReferralInvitations: vi.fn(),
  issueReferralInvitation: vi.fn(),
  revokeReferralInvitation: vi.fn(),
}));
const activity = {
  activityId: 42,
  title: "서울 공방 방문",
  status: "ACTIVE",
  description: "공방 소개",
  meetingPointName: "서울",
  schedules: [
    { scheduleId: 12, startAt: "2026-10-10T14:00:00+09:00", maxCapacity: 5, status: "OPEN" },
  ],
} as MyActivityDetailResponse;
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getReferralActivities).mockResolvedValue({
    status: "success",
    data: {
      content: [{ partnerUserId: 7, partnerName: "서울 공방", activity }],
      totalElements: 21,
      totalPages: 2,
      page: 0,
      size: 20,
      hasNext: true,
    },
  });
  vi.mocked(getAdminReferralActivity).mockResolvedValue({ status: "success", data: activity });
  vi.mocked(getReferralApplicants).mockImplementation(async (_admin, params) => ({
    status: "success",
    data: {
      content: [],
      totalElements: params.get("size") === "1" ? (params.get("status") ? 3 : 9) : 0,
      totalPages: 0,
      page: 0,
      size: 20,
      hasNext: false,
    },
  }));
  vi.mocked(getReferralInvitations).mockResolvedValue({
    status: "success",
    data: { content: [], totalElements: 0, totalPages: 0, page: 0, size: 20, hasNext: false },
  });
});
describe("activity-first referral admin", () => {
  it("combines search results across pages and keeps the modal open during issuance", async () => {
    const buddy = {
      buddyId: 7,
      displayName: "공방",
      name: "이서연",
      email: "s***@example.com",
    } as AdminBuddySummary;
    vi.mocked(getAdminBuddies).mockImplementation(async (filters) => ({
      status: "success",
      buddies: {
        content: filters.page
          ? [buddy, { ...buddy, buddyId: 8, displayName: "다른 공방" }]
          : [buddy],
        page: filters.page ?? 0,
        size: 20,
        totalElements: 21,
        totalPages: 2,
        hasNext: Boolean(filters.name && !filters.page),
      },
    }));
    let finish!: (value: { status: "success"; data: ReferralInvitation }) => void;
    vi.mocked(issueReferralInvitation).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    renderWithQueryClient(<ReferralDashboard />, { locale: "ko" });
    fireEvent.click(screen.getByRole("button", { name: "등록 링크 만들기" }));
    fireEvent.change(screen.getByLabelText("업체 검색"), { target: { value: "공방" } });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    await screen.findByRole("radio");
    expect(screen.getAllByRole("radio")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "검색 결과 더 보기" }));
    await waitFor(() => expect(screen.getAllByRole("radio")).toHaveLength(2));
    expect(getAdminBuddies).toHaveBeenCalledTimes(4);
    fireEvent.click(screen.getAllByRole("radio")[0]);
    fireEvent.click(screen.getByRole("button", { name: "링크 발급" }));
    expect(screen.getByLabelText("업체 검색")).toBeDisabled();
    expect(screen.getByLabelText("유효 기간")).toBeDisabled();
    expect(
      screen.getAllByRole("radio").every((radio) => (radio as HTMLInputElement).disabled),
    ).toBe(true);
    fireEvent(screen.getByRole("dialog"), new Event("cancel"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await act(async () =>
      finish({
        status: "success",
        data: { invitationId: 1, buddyId: 7, code: "a".repeat(43) } as ReferralInvitation,
      }),
    );
    expect(
      ((await screen.findByLabelText("발급된 등록 링크")) as HTMLInputElement).value,
    ).toContain("#code=");
    expect(issueReferralInvitation).toHaveBeenCalledExactlyOnceWith(7, expect.any(String));
    fireEvent.click(screen.getByRole("button", { name: "등록 링크 닫기" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("starts with activity links, not all applications, and opens invitations in a dismissible modal", async () => {
    renderWithQueryClient(<ReferralDashboard />, { locale: "ko" });
    expect(await screen.findByRole("link", { name: /서울 공방 방문/ })).toHaveAttribute(
      "href",
      "/admin/referrals?activityId=42",
    );
    expect(getReferralApplicants).not.toHaveBeenCalled();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    const trigger = screen.getByRole("button", { name: "등록 링크 만들기" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "등록 링크 관리" })).toBeInTheDocument();
    expect(screen.queryByLabelText("검색 조건")).not.toBeInTheDocument();
    fireEvent(screen.getByRole("dialog"), new Event("cancel"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it("scopes totals and filtered applicants to the selected activity", async () => {
    renderWithQueryClient(<ReferralDashboard initialActivityId={42} />, { locale: "ko" });
    expect(await screen.findByRole("heading", { name: "서울 공방 방문" })).toBeInTheDocument();
    await screen.findByText("총 신청");
    await waitFor(() => expect(getReferralApplicants).toHaveBeenCalled());
    expect(
      vi
        .mocked(getReferralApplicants)
        .mock.calls.every(([, params]) => params.get("activityId") === "42"),
    ).toBe(true);
    expect(screen.queryByLabelText("활동")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("일정"), { target: { value: "12" } });
    fireEvent.change(screen.getByLabelText("신청 상태"), { target: { value: "CANCELLED" } });
    fireEvent.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() =>
      expect(
        vi
          .mocked(getReferralApplicants)
          .mock.calls.some(
            ([, params]) =>
              params.get("scheduleId") === "12" &&
              params.get("status") === "CANCELLED" &&
              params.get("activityId") === "42",
          ),
      ).toBe(true),
    );
    expect(screen.getByRole("link", { name: "활동 목록" })).toHaveAttribute(
      "href",
      "/admin/referrals",
    );
  });
});
