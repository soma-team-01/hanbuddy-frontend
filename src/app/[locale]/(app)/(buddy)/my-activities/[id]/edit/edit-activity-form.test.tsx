import { screen } from "@testing-library/react";
import { usePathname, useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMyActivity } from "@/lib/api/buddy";
import { ApiClientError } from "@/lib/api/errors";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import type { MyActivityDetailResponse } from "@/types/buddy";
import { EditActivityForm } from "./edit-activity-form";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock("@/lib/api/buddy", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/buddy")>()),
  getMyActivity: vi.fn(),
}));

vi.mock("@/lib/api/useMyProfile", () => ({
  useMyProfile: () => ({
    status: "success",
    profile: { name: "Jihoon Kim", profileImageUrl: null },
  }),
}));

const mockedUsePathname = vi.mocked(usePathname);
const mockedUseRouter = vi.mocked(useRouter);
const mockedGetMyActivity = vi.mocked(getMyActivity);

function futureSeoulDateKey(offsetDays: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
    new Date(Date.now() + offsetDays * 86_400_000),
  );
}

const activityDetail: MyActivityDetailResponse = {
  activityId: 42,
  title: "Seoul market walk",
  description: "Meet local vendors and taste a neighborhood breakfast together.",
  thumbnailImageUrl: "https://cdn.example.test/activities/cover.webp",
  status: "ACTIVE",
  hostIntroduction: "I have guided friends through this market for years.",
  includedItems: ["Equipment rental"],
  restrictionNotes: [],
  maxCapacity: 4,
  price: 50000,
  currency: "KRW",
  discountPercent: null,
  discountEndDate: null,
  discountedPrice: null,
  meetingPointName: "Gwangjang Market Gate 2",
  meetingPlaceId: "ChIJ-gwangjang",
  images: [
    { imageUrl: "https://cdn.example.test/activities/cover.webp", imageOrder: 0 },
    { imageUrl: "https://cdn.example.test/activities/two.webp", imageOrder: 1 },
    { imageUrl: "https://cdn.example.test/activities/three.webp", imageOrder: 2 },
  ],
  schedules: [
    {
      scheduleId: 7,
      startAt: `${futureSeoulDateKey(7)}T10:00:00+09:00`,
      bookedCount: 0,
      status: "OPEN",
    },
  ],
  itineraries: [
    {
      itineraryId: 9,
      title: "Meet market vendors",
      description: "Taste three breakfast dishes with local vendors.",
      durationMinutes: 60,
      imageUrl: "https://cdn.example.test/activities/itinerary.webp",
      itemOrder: 0,
    },
  ],
};

describe("EditActivityForm", () => {
  beforeEach(() => {
    mockedGetMyActivity.mockReset();
    mockedUsePathname.mockReturnValue("/my-activities/42/edit");
    mockedUseRouter.mockReturnValue({
      push: vi.fn(),
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>);
  });

  it("shows a loading state while the activity is being fetched", () => {
    mockedGetMyActivity.mockReturnValue(new Promise(() => {}));

    renderWithQueryClient(<EditActivityForm activityId="42" />);

    expect(screen.getByText("Loading your experience…")).toBeInTheDocument();
  });

  it("opens the wizard in review mode prefilled with the activity", async () => {
    mockedGetMyActivity.mockResolvedValue({ status: "success", activity: activityDetail });

    renderWithQueryClient(<EditActivityForm activityId="42" />);

    expect(
      await screen.findByRole("heading", { name: "Preview your experience" }),
    ).toBeInTheDocument();
    expect(mockedGetMyActivity).toHaveBeenCalledWith("42");
    expect(screen.getByRole("heading", { name: "Seoul market walk" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });

  it("shows an error with a way back when the activity cannot be loaded", async () => {
    mockedGetMyActivity.mockResolvedValue({
      status: "error",
      error: new ApiClientError({
        code: "ACTIVITY404",
        status: 404,
        details: null,
        backendMessage: "raw server detail",
      }),
    });

    renderWithQueryClient(<EditActivityForm activityId="42" />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("raw server detail")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to activity" })).toHaveAttribute(
      "href",
      "/en/my-activities/42",
    );
  });
});
