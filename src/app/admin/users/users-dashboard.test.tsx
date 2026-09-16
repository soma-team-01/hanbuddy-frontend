import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminUsers } from "@/lib/api/admin";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { AdminUsersDashboard } from "./users-dashboard";

vi.mock("@/lib/api/admin", () => ({
  getAdminUsers: vi.fn(),
}));

const mockedGetAdminUsers = vi.mocked(getAdminUsers);
const routerMock = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/admin/users",
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

describe("AdminUsersDashboard", () => {
  it("resets pagination for ID-only searches and shows empty matches normally", async () => {
    mockedGetAdminUsers.mockImplementation(async (filters) => ({
      status: "success",
      users: { ...EMPTY_PAGE, page: filters?.page ?? 0, totalPages: 3 },
    }));
    renderWithQueryClient(<AdminUsersDashboard />);
    fireEvent.click(await screen.findByRole("button", { name: "다음 페이지" }));
    await waitFor(() =>
      expect(mockedGetAdminUsers).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 })),
    );
    fireEvent.change(screen.getByLabelText("회원 ID"), { target: { value: "999" } });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    await waitFor(() =>
      expect(mockedGetAdminUsers).toHaveBeenLastCalledWith({
        userId: 999,
        email: undefined,
        displayName: undefined,
        accountStatus: undefined,
        userType: "TOURIST",
        page: 0,
        size: 20,
      }),
    );
    expect(screen.getByText("조건에 맞는 회원이 없습니다.")).toBeInTheDocument();
  });
  it("searches an exact ID with other filters and resets it", async () => {
    renderWithQueryClient(<AdminUsersDashboard />);
    await screen.findByText("조건에 맞는 회원이 없습니다.");
    fireEvent.change(screen.getByLabelText("회원 ID"), { target: { value: "005" } });
    fireEvent.change(screen.getByLabelText("닉네임"), { target: { value: "여행" } });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    await waitFor(() =>
      expect(mockedGetAdminUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ userId: 5, displayName: "여행", userType: "TOURIST", page: 0 }),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "초기화" }));
    expect(screen.getByLabelText("회원 ID")).toHaveValue("");
    expect(screen.getByLabelText("닉네임")).toHaveValue("");
  });
  it.each(["-1", "0", "1.5", "abc", "1e3", "9007199254740992"])(
    "rejects invalid ID %s",
    async (value) => {
      renderWithQueryClient(<AdminUsersDashboard />);
      await screen.findByText("조건에 맞는 회원이 없습니다.");
      mockedGetAdminUsers.mockClear();
      fireEvent.change(screen.getByLabelText("회원 ID"), { target: { value } });
      fireEvent.click(screen.getByRole("button", { name: "검색" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("양의 정수");
      expect(mockedGetAdminUsers).not.toHaveBeenCalled();
    },
  );
  beforeEach(() => {
    mockedGetAdminUsers.mockReset();
    mockedGetAdminUsers.mockResolvedValue({ status: "success", users: EMPTY_PAGE });
    routerMock.replace.mockReset();
  });

  it("offers tourist-specific member filters", async () => {
    renderWithQueryClient(<AdminUsersDashboard />);

    expect(await screen.findByLabelText("로그인 이메일")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "관광객 관리" })).toBeInTheDocument();
    expect(screen.queryByText("Member management")).not.toBeInTheDocument();
    expect(
      screen.queryByText("관광객 계정을 찾고 예약·결제·리뷰 이력과 계정 상태를 확인합니다."),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("닉네임")).toBeInTheDocument();
    expect(screen.getByLabelText("계정 상태")).toBeInTheDocument();
    expect(screen.queryByLabelText("역할")).not.toBeInTheDocument();
    expect(screen.getByLabelText("회원 ID")).toBeInTheDocument();
    expect(screen.queryByLabelText("이름")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("국적 코드")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("가입 시작일")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("가입 종료일")).not.toBeInTheDocument();
  });

  it("always searches tourists by email, nickname, and account status", async () => {
    renderWithQueryClient(<AdminUsersDashboard />);
    await screen.findByText("조건에 맞는 회원이 없습니다.");
    mockedGetAdminUsers.mockClear();

    fireEvent.change(screen.getByLabelText("로그인 이메일"), {
      target: { value: "user@gmail.com" },
    });
    fireEvent.change(screen.getByLabelText("닉네임"), { target: { value: "버디" } });
    fireEvent.change(screen.getByLabelText("계정 상태"), { target: { value: "ACTIVE" } });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));

    await waitFor(() =>
      expect(mockedGetAdminUsers).toHaveBeenCalledWith({
        email: "user@gmail.com",
        displayName: "버디",
        userType: "TOURIST",
        accountStatus: "ACTIVE",
        page: 0,
        size: 20,
      }),
    );
  });

  it("does not show nationality in the tourist list", async () => {
    mockedGetAdminUsers.mockResolvedValue({
      status: "success",
      users: {
        ...EMPTY_PAGE,
        content: [
          {
            userId: 11,
            email: "member@example.com",
            name: "Google Name",
            displayName: "관광객",
            userType: "TOURIST",
            accountStatus: "ACTIVE",
            nationalityCode: "KR",
            createdAt: "2026-08-01T10:00:00+09:00",
          },
        ],
        totalElements: 1,
        totalPages: 1,
      },
    });

    renderWithQueryClient(<AdminUsersDashboard />);

    expect(await screen.findByText("관광객")).toBeInTheDocument();
    expect(screen.queryByText("국적")).not.toBeInTheDocument();
    expect(screen.queryByText("KR")).not.toBeInTheDocument();
  });
});
