import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTouristActivities } from "@/lib/api/activities";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { RecommendedExperiences } from "./RecommendedExperiences";
vi.mock("next/navigation", async (original) => ({
  ...(await original<typeof import("next/navigation")>()),
  usePathname: () => "/en",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/api/activities", () => ({
  getTouristActivities: vi.fn(),
}));

const mockedGetTouristActivities = vi.mocked(getTouristActivities);

function createActivity(activityId: number) {
  return {
    activityId,
    buddyId: 7,
    title: `HanBuddy activity ${activityId}`,
    description: "A personal Korean experience.",
    totalDurationMinutes: 0,
    thumbnailImageUrl: "/images/activities/hanok-hero.jpg",
    buddyName: "HanBuddy buddy",
    buddyProfileImageUrl: null,
    meetingPointName: "Anguk Station",
    meetingPlaceId: "place-1",
    price: 45000,
    currency: "KRW",
    displayPrice: {
      price: 45000,
      discountedPrice: null,
      currency: "KRW" as const,
      exchangeRateDate: null,
      estimated: false,
    },
  };
}

describe("RecommendedExperiences", () => {
  it("filters recommendations and preserves the date on detail and explore links", async () => {
    mockedGetTouristActivities.mockResolvedValue({
      status: "success",
      activities: [createActivity(1)],
    });
    renderWithQueryClient(<RecommendedExperiences date="2026-10-10" />);
    expect(await screen.findByText("HanBuddy activity 1")).toBeInTheDocument();
    expect(mockedGetTouristActivities).toHaveBeenCalledWith("EN", "USD", "2026-10-10");
    expect(screen.getByRole("link", { name: /HanBuddy activity 1/ })).toHaveAttribute(
      "href",
      "/en/activities/1?date=2026-10-10",
    );
    expect(screen.getByRole("link", { name: /View all experiences/ })).toHaveAttribute(
      "href",
      "/en/explore?date=2026-10-10",
    );
  });
  beforeEach(() => {
    mockedGetTouristActivities.mockReset();
  });

  it("renders up to four activities from the tourist activity list", async () => {
    mockedGetTouristActivities.mockResolvedValue({
      status: "success",
      activities: [1, 2, 3, 4].map(createActivity),
    });

    renderWithQueryClient(<RecommendedExperiences />);

    expect(await screen.findByText("HanBuddy activity 1")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(4);
    expect(screen.getByRole("link", { name: /HanBuddy activity 1/ })).toHaveAttribute(
      "href",
      "/en/activities/1",
    );
    expect(screen.getByText("HanBuddy activity 4")).toBeInTheDocument();
    expect(mockedGetTouristActivities).toHaveBeenCalledWith("EN", "USD");
  });

  it("scrolls cards horizontally with snapping up to tablet and uses a grid from lg up", async () => {
    mockedGetTouristActivities.mockResolvedValue({
      status: "success",
      activities: [1, 2, 3, 4].map(createActivity),
    });

    renderWithQueryClient(<RecommendedExperiences />);
    await screen.findByText("HanBuddy activity 1");

    const track = screen.getByTestId("recommended-track");
    expect(track).toHaveClass("snap-x", "overflow-x-auto", "lg:grid", "lg:grid-cols-4");
    const card = screen.getByRole("link", { name: /HanBuddy activity 1/ });
    // Airbnb처럼 모바일 한 화면에 두 장 남짓이 보이도록 좁은 타일을 쓴다
    expect(card).toHaveClass("snap-start", "shrink-0", "w-[44vw]", "md:w-[30vw]", "lg:w-auto");
    expect(card.querySelector("article")).toHaveAttribute("data-variant", "tile");
    // 44px 터치 타깃
    expect(screen.getByRole("link", { name: /View all experiences/ })).toHaveClass("min-h-11");
  });

  it("keeps the recommendation section visible when no activities are available", async () => {
    mockedGetTouristActivities.mockResolvedValue({ status: "success", activities: [] });

    renderWithQueryClient(<RecommendedExperiences />);

    expect(await screen.findByText("No experiences available yet.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recommended experiences" })).toBeInTheDocument();
    expect(
      screen.getByText("Local buddies are preparing something special. Check back soon!"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("recommended-empty-icon")).toBeInTheDocument();
  });

  it("shows an illustrated retry state when recommendations fail to load", async () => {
    mockedGetTouristActivities
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ status: "success", activities: [createActivity(1)] });

    renderWithQueryClient(<RecommendedExperiences />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't load experiences right now.",
    );
    expect(screen.getByTestId("recommended-error-icon")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("HanBuddy activity 1")).toBeInTheDocument();
  });
});
