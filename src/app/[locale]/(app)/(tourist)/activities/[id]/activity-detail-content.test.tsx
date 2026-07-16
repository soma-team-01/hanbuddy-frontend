import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getTouristActivity } from "@/lib/api/activities";
import { fetchGooglePlaceDetails } from "@/lib/google/places";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { ActivityDetailContent } from "./activity-detail-content";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/lib/api/activities", () => ({
  getTouristActivity: vi.fn(),
}));

vi.mock("@/lib/google/places", async () => {
  const actual = await vi.importActual<typeof import("@/lib/google/places")>("@/lib/google/places");
  return {
    ...actual,
    fetchGooglePlaceDetails: vi.fn(),
    getGoogleMapsApiKey: () => "test-google-key",
  };
});

const mockedGetTouristActivity = vi.mocked(getTouristActivity);
const mockedFetchGooglePlaceDetails = vi.mocked(fetchGooglePlaceDetails);

describe("ActivityDetailContent", () => {
  it("renders activity detail loaded from the API", async () => {
    mockedFetchGooglePlaceDetails.mockResolvedValue({
      formattedAddress: "123 Anguk-ro, Jongno-gu, Seoul",
    });
    mockedGetTouristActivity.mockResolvedValue({
      status: "success",
      activity: {
        activityId: 42,
        title: "Bukchon Hidden Gems",
        description: "Walk through quiet alleys with a local buddy.",
        thumbnailImageUrl: "/images/activities/hanok-hero.jpg",
        buddyId: 7,
        buddyName: "Jihoon Kim",
        buddyProfileImageUrl: null,
        includedItems: ["Local guide"],
        restrictionNotes: ["Comfortable shoes recommended"],
        price: 45000,
        currency: "KRW",
        meetingPointName: "Anguk Station Exit 2",
        meetingPlaceId: "ChIJ-bukchon",
        images: [],
        schedules: [
          {
            activityScheduleId: 101,
            startAt: "2026-07-20T10:00:00+09:00",
            remainingCapacity: 4,
            status: "OPEN",
          },
        ],
      },
    });

    renderWithQueryClient(<ActivityDetailContent activityId="42" />);

    expect(await screen.findByRole("heading", { name: "Bukchon Hidden Gems" })).toBeInTheDocument();
    expect(screen.getByText("Host: Jihoon Kim")).toBeInTheDocument();
    expect(screen.getByText("Local guide")).toBeInTheDocument();
    expect(screen.getByText("4 spots left")).toBeInTheDocument();
    expect(screen.getByText("All times are in Korea Standard Time (KST).")).toBeInTheDocument();
    expect(await screen.findAllByText("123 Anguk-ro, Jongno-gu, Seoul")).toHaveLength(2);
    expect(mockedFetchGooglePlaceDetails).toHaveBeenCalledWith("ChIJ-bukchon", "test-google-key");
    expect(screen.getByTitle("Map of Anguk Station Exit 2")).toHaveAttribute(
      "src",
      "https://www.google.com/maps/embed/v1/place?key=test-google-key&q=place_id%3AChIJ-bukchon",
    );
  });

  it("shows the Korean Seoul time-zone notice", async () => {
    mockedFetchGooglePlaceDetails.mockResolvedValue({
      formattedAddress: "123 Anguk-ro, Jongno-gu, Seoul",
    });
    mockedGetTouristActivity.mockResolvedValue({
      status: "success",
      activity: {
        activityId: 42,
        title: "Bukchon Hidden Gems",
        description: "Walk through quiet alleys with a local buddy.",
        thumbnailImageUrl: "/images/activities/hanok-hero.jpg",
        buddyId: 7,
        buddyName: "Jihoon Kim",
        buddyProfileImageUrl: null,
        includedItems: [],
        restrictionNotes: [],
        price: 45000,
        currency: "KRW",
        meetingPointName: "Anguk Station Exit 2",
        meetingPlaceId: "ChIJ-bukchon",
        images: [],
        schedules: [],
      },
    });

    renderWithQueryClient(<ActivityDetailContent activityId="42" />, { locale: "ko" });

    expect(await screen.findByText("모든 시간은 한국 표준시(KST) 기준입니다.")).toBeInTheDocument();
  });
});
