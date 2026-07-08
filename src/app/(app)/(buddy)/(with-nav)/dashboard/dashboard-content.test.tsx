import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getBuddyApplications, getBuddyScheduleDates } from "@/lib/api/buddy";
import { DashboardContent } from "./dashboard-content";

const routerMock = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/lib/api/buddy", () => ({
  getBuddyApplications: vi.fn(),
  getBuddyScheduleDates: vi.fn(),
}));

const mockedGetBuddyApplications = vi.mocked(getBuddyApplications);
const mockedGetBuddyScheduleDates = vi.mocked(getBuddyScheduleDates);

describe("DashboardContent", () => {
  it("renders upcoming activities and applicants loaded from the API", async () => {
    mockedGetBuddyScheduleDates.mockResolvedValue({
      status: "success",
      dates: [{ date: "2026-07-20" }],
    });
    mockedGetBuddyApplications.mockResolvedValue({
      status: "success",
      activities: [
        {
          activityId: 42,
          activityTitle: "Traditional Tea Tasting",
          thumbnailImageUrl:
            "https://hanbuddy-bucket-526958954481-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/activities/tea.webp",
          applicantCount: 1,
          applicants: [
            {
              applicationId: 11,
              applicantUserId: 3,
              applicantName: "Sophie Martin",
              applicantProfileImageUrl: null,
              applicantNationalityCode: "FR",
              guestCount: 2,
              applicantContactMethod: "WHATSAPP",
              applicantContactCountryCode: "+33",
              applicantContactIdentifier: "612345678",
            },
          ],
        },
      ],
    });

    render(<DashboardContent />);

    expect(await screen.findByText("Traditional Tea Tasting")).toBeInTheDocument();
    expect(screen.getByText("1 Applicant")).toBeInTheDocument();
    expect(screen.getByText("Sophie Martin")).toBeInTheDocument();
    expect(screen.getByText("France")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp +33 612345678")).toBeInTheDocument();
    expect(mockedGetBuddyApplications).toHaveBeenCalledWith("2026-07-20");
  });

  it("keeps date selection available when applicant loading fails", async () => {
    mockedGetBuddyScheduleDates.mockResolvedValue({
      status: "success",
      dates: [{ date: "2026-07-20" }],
    });
    mockedGetBuddyApplications.mockResolvedValue({
      status: "error",
      message: "신청자 목록을 불러오지 못했습니다.",
    });

    render(<DashboardContent />);

    expect(await screen.findByText("신청자 목록을 불러오지 못했습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { pressed: true })).toBeInTheDocument();
  });
});
