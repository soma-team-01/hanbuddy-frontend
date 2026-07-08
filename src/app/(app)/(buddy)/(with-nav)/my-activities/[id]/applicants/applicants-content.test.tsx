import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getBuddyActivityApplications, getMyActivity } from "@/lib/api/buddy";
import { ApplicantsContent } from "./applicants-content";

const routerMock = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/lib/api/buddy", () => ({
  getBuddyActivityApplications: vi.fn(),
  getMyActivity: vi.fn(),
}));

const mockedGetBuddyActivityApplications = vi.mocked(getBuddyActivityApplications);
const mockedGetMyActivity = vi.mocked(getMyActivity);

describe("ApplicantsContent", () => {
  it("renders applicants loaded from the API for the selected date", async () => {
    mockedGetBuddyActivityApplications.mockResolvedValue({
      status: "success",
      applications: {
        activityId: 42,
        activityTitle: "Traditional Tea Tasting",
        activityDate: "2026-07-20",
        applicantCount: 1,
        statusCounts: { CONFIRMED: 1 },
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
            status: "CONFIRMED",
            specialRequest: "No pork",
            appliedAt: "2026-07-07T10:00:00Z",
          },
        ],
      },
    });

    render(<ApplicantsContent activityId="42" initialDate="2026-07-20" />);

    expect(await screen.findByText("Traditional Tea Tasting")).toBeInTheDocument();
    expect(screen.getByText("Applicant Status • 1 confirmed")).toBeInTheDocument();
    expect(screen.getByText("Sophie Martin")).toBeInTheDocument();
    expect(screen.getByText("France")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp +33 612345678")).toBeInTheDocument();
    expect(screen.getByText("No pork")).toBeInTheDocument();
    expect(mockedGetBuddyActivityApplications).toHaveBeenCalledWith(42, "2026-07-20");
    expect(mockedGetMyActivity).not.toHaveBeenCalled();
  });

  it("falls back to the first activity schedule when no date query is provided", async () => {
    mockedGetMyActivity.mockResolvedValue({
      status: "success",
      activity: {
        activityId: 42,
        title: "Traditional Tea Tasting",
        description: "Learn Korean tea etiquette.",
        thumbnailImageUrl: null,
        status: "ACTIVE",
        includedItems: [],
        restrictionNotes: [],
        maxCapacity: 4,
        price: 50000,
        currency: "KRW",
        meetingPointName: "Anguk Station",
        meetingPointAddress: "Jongno-gu, Seoul",
        meetingPlaceId: "place-1",
        images: [],
        schedules: [
          {
            scheduleId: 99,
            activityDate: "2026-07-20",
            startTime: "10:00",
            bookedCount: 0,
            status: "OPEN",
          },
        ],
      },
    });
    mockedGetBuddyActivityApplications.mockResolvedValue({
      status: "success",
      applications: {
        activityId: 42,
        activityTitle: "Traditional Tea Tasting",
        activityDate: "2026-07-20",
        applicantCount: 0,
        statusCounts: {},
        applicants: [],
      },
    });

    render(<ApplicantsContent activityId="42" />);

    expect(await screen.findByText("No applicants for this date yet.")).toBeInTheDocument();
    expect(mockedGetMyActivity).toHaveBeenCalledWith(42);
    expect(mockedGetBuddyActivityApplications).toHaveBeenCalledWith(42, "2026-07-20");
  });
});
