import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { ReferralDashboard } from "./referral-dashboard";
import {
  getReferralActivities,
  getAdminReferralActivity,
  getReferralApplicants,
  getReferralInvitations,
  issueReferralInvitation,
  revokeReferralInvitation,
} from "@/lib/api/referral";
import { getAdminBuddies, getAdminBuddy, getAdminUser } from "@/lib/api/admin";
import type { AdminBuddyDetail, AdminBuddySummary, AdminUserDetail } from "@/types/admin";
import type { ReferralInvitation, ReferralApplicant } from "@/types/referral";
vi.mock("@/lib/api/admin", () => ({
  getAdminBuddies: vi.fn(),
  getAdminBuddy: vi.fn(),
  getAdminUser: vi.fn(),
}));
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
  vi.mocked(getAdminUser).mockImplementation(async (id) => ({
    status: "success",
    user: { displayName: `운영자${id}` } as AdminUserDetail,
  }));
  vi.mocked(getAdminBuddy).mockImplementation(async (id) => ({
    status: "success",
    buddy: { user: { email: `partner${id}@example.com` } } as AdminBuddyDetail,
  }));
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
  it("searches activities by owner across all pages and resets the search", async () => {
    vi.mocked(getReferralActivities).mockImplementation(async (page = 0) => ({
      status: "success",
      data: {
        content: [
          {
            partnerUserId: page ? 8 : 7,
            partnerName: page ? "목공 버디" : "도자기 버디",
            activity: {
              ...activity,
              activityId: page ? 43 : 42,
              title: page ? "나무 공방" : "도자기 공방",
            },
          },
        ],
        page,
        size: 20,
        totalElements: 21,
        totalPages: 2,
        hasNext: page === 0,
      },
    }));
    vi.mocked(getAdminBuddies).mockResolvedValue({
      status: "success",
      buddies: {
        content: [{ buddyId: 8 } as AdminBuddySummary],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
        hasNext: false,
      },
    });
    renderWithQueryClient(<ReferralDashboard />, { locale: "ko" });
    await screen.findByRole("heading", { name: "도자기 공방" });
    fireEvent.change(screen.getByLabelText("활동 등록자 검색"), {
      target: { value: "studio@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "활동 검색" }));
    await screen.findByRole("heading", { name: "나무 공방" });
    expect(screen.queryByRole("heading", { name: "도자기 공방" })).not.toBeInTheDocument();
    expect(getAdminBuddies).toHaveBeenCalledTimes(3);
    fireEvent.click(screen.getByRole("button", { name: "초기화" }));
    await screen.findByRole("heading", { name: "도자기 공방" });
  });
  it("only loads and shows the selected partner's history, and hides it on a new search", async () => {
    let revoked = false;
    vi.mocked(getAdminBuddies).mockResolvedValue({
      status: "success",
      buddies: {
        content: [7, 8].map(
          (buddyId) =>
            ({
              buddyId,
              displayName: "공방",
              name: "이서연",
              email: "s***@example.com",
            }) as AdminBuddySummary,
        ),
        page: 0,
        size: 20,
        totalElements: 2,
        totalPages: 1,
        hasNext: false,
      },
    });
    vi.mocked(getReferralInvitations).mockImplementation(async (page = 0) => ({
      status: "success",
      data: {
        content: [
          {
            invitationId: page ? 72 : 81,
            buddyId: page ? 7 : 8,
            code: null,
            createdAt: "2026-10-02T05:43:00Z",
            issuedBy: 3,
            expiresAt: page ? "2099-01-01T00:00:00Z" : "2098-01-01T00:00:00Z",
            revokedAt: revoked && page ? "2026-10-02T00:00:00Z" : null,
          } as ReferralInvitation,
        ],
        page,
        size: 20,
        totalElements: 21,
        totalPages: 2,
        hasNext: page === 0,
      },
    }));
    renderWithQueryClient(<ReferralDashboard />, { locale: "ko" });
    fireEvent.click(screen.getByRole("button", { name: "등록 링크 만들기" }));
    expect(screen.queryByText("등록 링크 발급 내역")).not.toBeInTheDocument();
    expect(getReferralInvitations).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("업체 검색"), { target: { value: "공방" } });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    await screen.findByText("partner7@example.com");
    await screen.findByText("partner8@example.com");
    expect(getReferralInvitations).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("radio", { name: /partner7@/ }));
    await screen.findByText(/만료.*2099/);
    expect(screen.getByText(/발급 일시.*2026/)).toHaveClass("text-sm", "font-semibold", "text-ink");
    expect(screen.getByText(/만료.*2099/)).toHaveClass("text-xs");
    await screen.findByText("발급자 운영자3");
    expect(getAdminUser).toHaveBeenCalledWith(3);
    expect(screen.queryByText(/만료.*2098/)).not.toBeInTheDocument();
    expect(screen.queryByText(/초대 #|업체 계정 #/)).not.toBeInTheDocument();
    expect(screen.getByText("사용 가능")).toHaveClass("text-success");
    expect(screen.getByRole("button", { name: "회수" })).toHaveClass("min-h-8");
    vi.mocked(revokeReferralInvitation).mockImplementation(async () => {
      revoked = true;
      return { status: "success", data: { invitationId: 72 } as ReferralInvitation };
    });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "회수" }));
    expect(await screen.findByText("회수됨")).toHaveClass("text-danger");
    expect(screen.queryByRole("button", { name: "회수" })).not.toBeInTheDocument();
    confirm.mockRestore();
    fireEvent.click(screen.getByRole("radio", { name: /partner8@/ }));
    expect(screen.queryByText(/만료.*2099/)).not.toBeInTheDocument();
    await screen.findByText(/만료.*2098/);
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    expect(screen.queryByText("등록 링크 발급 내역")).not.toBeInTheDocument();
    expect(screen.queryByText(/만료.*2098/)).not.toBeInTheDocument();
  });
  it("requires an identifiable email and allows retrying a failed email lookup", async () => {
    vi.mocked(getAdminBuddies).mockResolvedValue({
      status: "success",
      buddies: {
        content: [
          {
            buddyId: 7,
            displayName: "공방",
            name: "이서연",
            email: "s***@example.com",
          } as AdminBuddySummary,
        ],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
        hasNext: false,
      },
    });
    vi.mocked(getAdminBuddy).mockRejectedValueOnce(new Error("Unavailable"));
    const { queryClient } = renderWithQueryClient(<ReferralDashboard />, { locale: "ko" });
    fireEvent.click(screen.getByRole("button", { name: "등록 링크 만들기" }));
    fireEvent.change(screen.getByLabelText("업체 검색"), { target: { value: "공방" } });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    await screen.findByText("이메일을 불러오지 못했습니다.");
    expect(screen.getByRole("radio")).toBeDisabled();
    expect(screen.queryByText("s***@example.com")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "이메일 다시 불러오기" }));
    await screen.findByText("partner7@example.com");
    expect(screen.getByRole("radio")).toBeEnabled();
    expect(queryClient.getQueryData(["referral", "buddy-email", 7])).toBe("partner7@example.com");
    fireEvent.click(screen.getByRole("button", { name: "등록 링크 닫기" }));
    await waitFor(() =>
      expect(queryClient.getQueryData(["referral", "buddy-email", 7])).toBeUndefined(),
    );
  });
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
    await screen.findByText("partner7@example.com");
    await screen.findByText("partner8@example.com");
    expect(screen.queryByText("s***@example.com")).not.toBeInTheDocument();
    expect(getAdminBuddy).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getAllByRole("radio")[0]);
    fireEvent.change(screen.getByLabelText("유효 기간"), { target: { value: "30" } });
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
    expect(issueReferralInvitation).toHaveBeenCalledExactlyOnceWith(7, 30);
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
    expect(screen.queryByRole("heading", { name: "제휴 활동" })).not.toBeInTheDocument();
    const trigger = screen.getByRole("button", { name: "등록 링크 만들기" });
    expect(screen.queryByText("활동을 선택해 신청 현황을 확인하세요.")).not.toBeInTheDocument();
    expect(trigger.parentElement).toContainElement(
      screen.getByRole("heading", { name: /등록 활동/ }),
    );
    expect(trigger).toHaveClass("min-h-9");
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "등록 링크 관리" })).toBeInTheDocument();
    expect(screen.queryByLabelText("검색 조건")).not.toBeInTheDocument();
    expect(screen.getByLabelText("업체 검색")).toHaveClass("focus-border-only");
    fireEvent(screen.getByRole("dialog"), new Event("cancel"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it("scopes totals and filtered applicants to the selected activity", async () => {
    vi.mocked(getReferralApplicants).mockImplementation(async (_admin, params) => {
      const completed = params.get("status") === "COMPLETED";
      const content =
        params.get("status") === "CANCELLED"
          ? []
          : (Array.from({ length: completed ? 2 : 4 }, (_, index) => ({
              applicationId: completed ? index + 5 : index + 1,
              activityId: 42,
              applicantName: `신청자 ${index}`,
              startAt: "2026-10-10T14:00:00+09:00",
              createdAt: "2026-10-02T10:00:00+09:00",
              consentedAt: "2026-10-02T10:00:00+09:00",
              status: completed ? "COMPLETED" : "CONFIRMED",
              guestCount: index === 0 ? (completed ? 3 : 2) : 1,
            })) as ReferralApplicant[]);
      return {
        status: "success",
        data: {
          content,
          totalElements: params.get("status") === "CANCELLED" ? 3 : content.length,
          page: 0,
          size: 100,
          totalPages: 1,
          hasNext: false,
        },
      };
    });
    renderWithQueryClient(<ReferralDashboard initialActivityId={42} />, { locale: "ko" });
    expect(await screen.findByRole("heading", { name: "서울 공방 방문" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "제휴 활동" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "등록 링크 만들기" })).not.toBeInTheDocument();
    const retainedCounter = await screen.findByText("신청 건수 (취소 제외)");
    await waitFor(() => expect(retainedCounter.parentElement).toHaveTextContent("6건"));
    expect(retainedCounter.parentElement?.querySelector("dd")).toHaveClass("text-ink");
    const guests = screen.getByText("신청 인원 (취소 제외)");
    expect(guests.parentElement).toHaveTextContent("9명");
    expect(guests.parentElement?.querySelector("dd")).toHaveClass("text-primary");
    expect(screen.queryByText("활동 소개")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "활동 보기" })).toHaveAttribute(
      "href",
      "/admin/referrals/42",
    );
    expect(await screen.findByText("서울 공방")).toBeInTheDocument();
    await waitFor(() => expect(getReferralApplicants).toHaveBeenCalled());
    expect(
      vi
        .mocked(getReferralApplicants)
        .mock.calls.every(([, params]) => params.get("activityId") === "42"),
    ).toBe(true);
    expect(screen.queryByLabelText("활동")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("일정")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /신청 기간 선택/ })).toBeInTheDocument();
    expect(
      within(screen.getByRole("group", { name: "신청 상태" }))
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["전체", "취소 제외", "취소"]);
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    fireEvent.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() =>
      expect(
        vi
          .mocked(getReferralApplicants)
          .mock.calls.some(
            ([, params]) =>
              !params.has("scheduleId") &&
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
