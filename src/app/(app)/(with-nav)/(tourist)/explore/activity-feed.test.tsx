import { act, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTouristActivities } from "@/lib/api/activities";
import { UnauthenticatedQueryError } from "@/lib/query/result";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { ActivityFeed } from "./activity-feed";

const routerMock = vi.hoisted(() => ({ refresh: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/lib/api/activities", () => ({
  getTouristActivities: vi.fn(),
}));

const mockedGetTouristActivities = vi.mocked(getTouristActivities);

describe("ActivityFeed", () => {
  beforeEach(() => {
    routerMock.refresh.mockReset();
    routerMock.replace.mockReset();
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

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
  });

  it("redirects to login when the activities query is unauthenticated", async () => {
    mockedGetTouristActivities.mockRejectedValue(new UnauthenticatedQueryError());

    renderWithQueryClient(<ActivityFeed />);

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/login"));
  });

  it("renders activities loaded from the API", async () => {
    mockedGetTouristActivities.mockResolvedValue({
      status: "success",
      activities: [
        {
          activityId: 42,
          title: "Bukchon Hidden Gems",
          description: "Walk through quiet alleys with a local buddy.",
          thumbnailImageUrl: "/images/activities/hanok-hero.jpg",
          buddyName: "Jihoon Kim",
          buddyProfileImageUrl: null,
          meetingPointName: "Anguk Station Exit 2",
          price: 45000,
          currency: "KRW",
        },
      ],
    });

    renderWithQueryClient(<ActivityFeed />);

    expect(await screen.findByText("Bukchon Hidden Gems")).toBeInTheDocument();
    expect(screen.getByText("Anguk Station Exit 2")).toBeInTheDocument();
    expect(screen.getByText("Jihoon Kim")).toBeInTheDocument();

    const activityLink = screen.getByRole("link", { name: /Bukchon Hidden Gems/ });
    expect(activityLink).toHaveClass("motion-reveal", "motion-press");
    expect(activityLink).toHaveStyle({ animationDelay: "0ms" });
  });
});
