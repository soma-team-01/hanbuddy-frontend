import { act, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTouristActivities } from "@/lib/api/activities";
import { ApiClientError } from "@/lib/api/errors";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { ActivityFeed } from "./activity-feed";

vi.mock("@/lib/api/activities", () => ({
  getTouristActivities: vi.fn(),
}));

const mockedGetTouristActivities = vi.mocked(getTouristActivities);

const touristActivity = {
  activityId: 42,
  title: "Bukchon Hidden Gems",
  description: "Walk through quiet alleys with a local buddy.",
  thumbnailImageUrl: "/images/activities/hanok-hero.jpg",
  buddyName: "Jihoon Kim",
  buddyProfileImageUrl: null,
  meetingPlaceId: "ChIJtest-place-id",
  meetingPointName: "Anguk Station Exit 2",
  price: 45000,
  currency: "KRW",
} as const;

describe("ActivityFeed", () => {
  beforeEach(() => {
    mockedGetTouristActivities.mockReset();
  });

  it("renders a loading state while activities are pending", async () => {
    let resolveActivities!: (value: Awaited<ReturnType<typeof getTouristActivities>>) => void;
    mockedGetTouristActivities.mockReturnValue(
      new Promise((resolve) => {
        resolveActivities = resolve;
      }),
    );

    renderWithQueryClient(<ActivityFeed />);

    expect(screen.getByText("Loading activities...")).toBeInTheDocument();

    await act(async () => {
      resolveActivities({ status: "success", activities: [] });
    });
    await screen.findByText("No activities available yet.");
  });

  it("renders an empty state when no activities are returned", async () => {
    mockedGetTouristActivities.mockResolvedValue({ status: "success", activities: [] });

    renderWithQueryClient(<ActivityFeed />);

    expect(await screen.findByText("No activities available yet.")).toBeInTheDocument();
  });

  it("shows an error message when loading activities fails", async () => {
    mockedGetTouristActivities.mockRejectedValue(new Error("Something went wrong"));

    renderWithQueryClient(<ActivityFeed />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load activities.");
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("renders activities loaded from the API", async () => {
    mockedGetTouristActivities.mockResolvedValue({
      status: "success",
      activities: [touristActivity],
    });

    renderWithQueryClient(<ActivityFeed />);

    expect(await screen.findByText("Bukchon Hidden Gems")).toBeInTheDocument();
    expect(screen.getByText("Anguk Station Exit 2")).toBeInTheDocument();
    expect(screen.getByText("Jihoon Kim")).toBeInTheDocument();

    const activityLink = screen.getByRole("link", { name: /Bukchon Hidden Gems/ });
    expect(screen.getByTestId("activity-grid")).toHaveClass(
      "grid-cols-1",
      "md:grid-cols-2",
      "lg:grid-cols-3",
      "xl:grid-cols-4",
    );
    expect(screen.getByRole("img", { name: "Bukchon Hidden Gems" })).toHaveAttribute(
      "loading",
      "eager",
    );
    expect(activityLink).toHaveClass("motion-reveal", "motion-press");
    expect(activityLink).toHaveStyle({ animationDelay: "0ms" });
  });

  it("localizes Korean loading and empty states", async () => {
    let resolveActivities!: (value: Awaited<ReturnType<typeof getTouristActivities>>) => void;
    mockedGetTouristActivities.mockReturnValue(
      new Promise((resolve) => {
        resolveActivities = resolve;
      }),
    );

    renderWithQueryClient(<ActivityFeed />, { locale: "ko" });

    expect(screen.getByText("액티비티를 불러오는 중...")).toBeInTheDocument();

    await act(async () => {
      resolveActivities({ status: "success", activities: [] });
    });
    expect(await screen.findByText("아직 등록된 액티비티가 없습니다.")).toBeInTheDocument();
  });

  it("maps a BFF proxy error to localized safe Korean copy", async () => {
    mockedGetTouristActivities.mockRejectedValue(
      new ApiClientError({
        code: "AUTH_PROXY_ERROR",
        status: 502,
        details: null,
        backendMessage: "raw server detail",
      }),
    );

    renderWithQueryClient(<ActivityFeed />, { locale: "ko" });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "서비스를 일시적으로 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.",
    );
    expect(screen.queryByText("raw server detail")).not.toBeInTheDocument();
  });

  it("keeps user-authored activity content unchanged in Korean and uses locale navigation", async () => {
    mockedGetTouristActivities.mockResolvedValue({
      status: "success",
      activities: [touristActivity],
    });

    renderWithQueryClient(<ActivityFeed />, { locale: "ko" });

    expect(await screen.findByText("Bukchon Hidden Gems")).toBeInTheDocument();
    expect(screen.getByText("Anguk Station Exit 2")).toBeInTheDocument();
    expect(screen.getByText("Jihoon Kim")).toBeInTheDocument();
    expect(screen.getByText("₩45,000 / 1인")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Bukchon Hidden Gems/ })).toHaveAttribute(
      "href",
      "/ko/activities/42",
    );
  });
});
