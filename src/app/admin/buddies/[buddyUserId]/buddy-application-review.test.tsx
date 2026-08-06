import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  approveBuddyApplication,
  getBuddyApplicationForAdmin,
  rejectBuddyApplication,
} from "@/lib/api/admin";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { BuddyApplicationReview } from "./buddy-application-review";

const routerMock = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => routerMock,
}));

vi.mock("@/lib/api/admin", () => ({
  approveBuddyApplication: vi.fn(),
  getBuddyApplicationForAdmin: vi.fn(),
  rejectBuddyApplication: vi.fn(),
}));

const mockedApprove = vi.mocked(approveBuddyApplication);
const mockedGetApplication = vi.mocked(getBuddyApplicationForAdmin);
const mockedReject = vi.mocked(rejectBuddyApplication);

describe("BuddyApplicationReview", () => {
  beforeEach(() => {
    routerMock.push.mockReset();
    mockedApprove.mockReset();
    mockedGetApplication.mockReset();
    mockedReject.mockReset();
    mockedGetApplication.mockResolvedValue({
      status: "success",
      application: {
        userId: 42,
        email: "buddy@example.com",
        name: "김버디",
        profileImageUrl: null,
        nationalityCode: "KR",
        birthDate: "1995-01-02",
        contactMethod: "WHATSAPP",
        contactCountryCode: "+82",
        contactIdentifier: "buddy-id",
        accountStatus: "PENDING_APPROVAL",
        appliedAt: "2026-08-06T10:00:00+09:00",
        reviewedAt: null,
        reviewedByUserId: null,
        reviewedByName: null,
        rejectionReason: null,
      },
    });
  });

  it("renders the applicant profile and approval actions", async () => {
    renderWithQueryClient(<BuddyApplicationReview userId="42" />);

    expect(await screen.findByRole("heading", { name: "김버디" })).toBeInTheDocument();
    expect(screen.getByText("buddy@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "버디 승인" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "거절" })).toBeInTheDocument();
  });

  it("requires a reason before rejecting and returns to the list after success", async () => {
    mockedReject.mockResolvedValue({ status: "success", message: "거절되었습니다." });
    renderWithQueryClient(<BuddyApplicationReview userId="42" />);

    fireEvent.click(await screen.findByRole("button", { name: "거절" }));
    const submit = screen.getByRole("button", { name: "거절하기" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("거절 사유"), {
      target: { value: "프로필 확인이 필요합니다." },
    });
    fireEvent.click(submit);

    await waitFor(() =>
      expect(mockedReject).toHaveBeenCalledWith("42", {
        reason: "프로필 확인이 필요합니다.",
      }),
    );
    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith("/admin/buddies"));
  });
});
