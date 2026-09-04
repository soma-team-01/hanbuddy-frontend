import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminBuddies, getBuddyApplicationsForAdmin } from "@/lib/api/admin";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { AdminBuddiesDashboard } from "./buddies-dashboard";

vi.mock("@/lib/api/admin", () => ({
  getAdminBuddies: vi.fn(),
  getBuddyApplicationsForAdmin: vi.fn(),
}));

const mockedGetAdminBuddies = vi.mocked(getAdminBuddies);
const mockedGetApplications = vi.mocked(getBuddyApplicationsForAdmin);
const routerMock = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/admin/buddies",
  useRouter: () => routerMock,
}));

const EMPTY_PAGE = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  page: 0,
  size: 20,
  hasNext: false,
};

describe("AdminBuddiesDashboard", () => {
  beforeEach(() => {
    mockedGetAdminBuddies.mockReset();
    mockedGetAdminBuddies.mockResolvedValue({ status: "success", buddies: EMPTY_PAGE });
    mockedGetApplications.mockReset();
    mockedGetApplications.mockResolvedValue({ status: "success", applications: [] });
  });

  it("uses the same search conditions as tourist management", async () => {
    renderWithQueryClient(<AdminBuddiesDashboard />);

    expect(await screen.findByLabelText("로그인 이메일")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "버디 목록" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "승인 관리 0" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.queryByText("새로운 버디 신청이 없습니다.")).not.toBeInTheDocument();
    expect(screen.queryByText("Member management")).not.toBeInTheDocument();
    expect(screen.queryByText("Buddy approval")).not.toBeInTheDocument();
    expect(screen.getByLabelText("닉네임")).toBeInTheDocument();
    expect(screen.getByLabelText("계정 상태")).toBeInTheDocument();
    expect(screen.queryByLabelText("버디 ID")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Google 계정 이름")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("국적 코드")).not.toBeInTheDocument();
  });

  it("shows the pending count on the approval tab and switches panels", async () => {
    mockedGetApplications.mockResolvedValue({
      status: "success",
      applications: [
        {
          userId: 41,
          email: "first@example.com",
          name: "첫 번째 신청자",
          nationalityCode: "KR",
          accountStatus: "PENDING_APPROVAL",
          appliedAt: "2026-09-04T10:00:00+09:00",
        },
        {
          userId: 42,
          email: "second@example.com",
          name: "두 번째 신청자",
          nationalityCode: "US",
          accountStatus: "PENDING_APPROVAL",
          appliedAt: "2026-09-04T10:00:00+09:00",
        },
      ],
    });

    renderWithQueryClient(<AdminBuddiesDashboard />);

    const approvalTab = await screen.findByRole("tab", { name: "승인 관리 2" });
    fireEvent.click(approvalTab);

    expect(approvalTab).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByText("첫 번째 신청자")).toBeInTheDocument();
    expect(screen.queryByLabelText("로그인 이메일")).not.toBeInTheDocument();
  });

  it("searches buddies by email, nickname, and account status", async () => {
    renderWithQueryClient(<AdminBuddiesDashboard />);
    await screen.findByText("조건에 맞는 버디가 없습니다.");
    mockedGetAdminBuddies.mockClear();

    fireEvent.change(screen.getByLabelText("로그인 이메일"), {
      target: { value: "buddy@gmail.com" },
    });
    fireEvent.change(screen.getByLabelText("닉네임"), { target: { value: "서울버디" } });
    fireEvent.change(screen.getByLabelText("계정 상태"), { target: { value: "ACTIVE" } });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));

    await waitFor(() =>
      expect(mockedGetAdminBuddies).toHaveBeenCalledWith({
        email: "buddy@gmail.com",
        displayName: "서울버디",
        accountStatus: "ACTIVE",
        page: 0,
        size: 20,
      }),
    );
  });

  it("requests the next 20 buddies with pagination arrows", async () => {
    mockedGetAdminBuddies.mockResolvedValue({
      status: "success",
      buddies: {
        ...EMPTY_PAGE,
        content: [
          {
            buddyId: 1,
            email: "buddy@example.com",
            name: "김버디",
            displayName: "서울버디",
            accountStatus: "ACTIVE",
            nationalityCode: "KR",
            commissionPolicy: "STANDARD_20",
            createdAt: "2026-08-06T10:00:00+09:00",
          },
        ],
        totalElements: 21,
        totalPages: 2,
        hasNext: true,
      },
    });

    renderWithQueryClient(<AdminBuddiesDashboard />);
    await screen.findByText("서울버디");
    expect(screen.queryByText("국적")).not.toBeInTheDocument();
    expect(screen.queryByText("KR")).not.toBeInTheDocument();
    mockedGetAdminBuddies.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "다음 페이지" }));

    await waitFor(() => expect(mockedGetAdminBuddies).toHaveBeenCalledWith({ page: 1, size: 20 }));
  });
});
