import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { usePathname, useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMyActivity } from "@/lib/api/buddy";
import { ApiClientError } from "@/lib/api/errors";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { buddyKeys } from "@/lib/query/buddy";
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
  activityType: "STANDARD",
  title: "Seoul market walk",
  description: "Meet local vendors and taste a neighborhood breakfast together.",
  totalDurationMinutes: 60,
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

  it.each([undefined, null, "UNKNOWN"])(
    "does not silently edit an unrecognized activity type (%s) as a standard activity",
    async (activityType) => {
      mockedGetMyActivity.mockResolvedValue({
        status: "success",
        activity: { ...activityDetail, activityType } as MyActivityDetailResponse,
      });
      renderWithQueryClient(<EditActivityForm activityId="42" />);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "The server did not return the activity type.",
      );
      expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
      expect(
        screen.queryByRole("heading", { name: "Preview your experience" }),
      ).not.toBeInTheDocument();
    },
  );

  it.each([0, 5000])("uses the referral editor and minimum price for %s", async (price) => {
    mockedGetMyActivity.mockResolvedValue({
      status: "success",
      activity: { ...activityDetail, activityType: "REFERRAL", price },
    });
    renderWithQueryClient(<EditActivityForm activityId="42" />);
    await screen.findByRole("heading", { name: "Preview your experience" });
    expect(screen.getByText(price === 0 ? "Free" : "₩5,000~")).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("contentinfo")).getByRole("button", { name: "Back" }));
    for (let i = 0; i < 9; i++) {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    }
    expect(
      screen.getByRole("heading", { name: "Set the minimum service price" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Set your price per person")).not.toBeInTheDocument();
    expect(screen.queryByText("Add a discount")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue(price.toLocaleString("en-US"));
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

  it("refreshes occupancy and validation without overwriting edits or unmounting on refresh failure", async () => {
    mockedGetMyActivity.mockResolvedValue({ status: "success", activity: activityDetail });
    const { queryClient } = renderWithQueryClient(<EditActivityForm activityId="42" />);
    await screen.findByRole("heading", { name: "Preview your experience" });
    fireEvent.click(within(screen.getByRole("contentinfo")).getByRole("button", { name: "Back" }));
    for (let i = 0; i < 8; i++) {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Date-specific settings" }));
    const capacity = screen.getByRole("spinbutton");
    fireEvent.change(capacity, { target: { value: "8" } });
    const updated = {
      ...activityDetail,
      schedules: [{ ...activityDetail.schedules[0], bookedCount: 3, heldSeats: 2, maxCapacity: 4 }],
    };
    await act(async () => {
      queryClient.setQueryData(buddyKeys.activityDetail("42"), updated);
    });
    expect(await screen.findByText("Confirmed: 3")).toBeVisible();
    expect(screen.getByText("Awaiting payment: 2")).toBeVisible();
    expect(capacity).toHaveValue(8);
    expect(capacity).toHaveAttribute("min", "5");
    expect(screen.getByRole("button", { name: "Decrease maximum guests" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Increase maximum guests" }));
    expect(capacity).toHaveValue(5);
    fireEvent.change(capacity, { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(
      screen.getByText(
        "Capacity must be at least the total of confirmed participants and those awaiting payment.",
      ),
    ).toBeVisible();
    fireEvent.change(capacity, { target: { value: "8" } });
    mockedGetMyActivity.mockRejectedValue(new Error("temporary network failure"));
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: buddyKeys.activityDetail("42") });
    });
    await waitFor(() =>
      expect(queryClient.getQueryState(buddyKeys.activityDetail("42"))?.status).toBe("error"),
    );
    expect(screen.getByRole("spinbutton")).toHaveValue(8);
    expect(screen.getByText("Confirmed: 3")).toBeVisible();
  });
});
