import { act, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTouristActivities } from "@/lib/api/activities";
import { getBuddyProfile, getBuddyReviews } from "@/lib/api/reviews";
import { getMyProfile } from "@/lib/api/users";
import { userKeys } from "@/lib/query/users";
import { useRouter } from "next/navigation";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { createKrwDisplayPrice } from "@/test/fixtures/display-price";
import type { ActivityDisplayPrice } from "@/types/display-currency";
import { HostProfileDialog } from "./HostProfileDialog";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => router,
  usePathname: () => "/en/activities/42",
}));

vi.mock("@/lib/api/activities", () => ({
  getTouristActivities: vi.fn(),
}));

vi.mock("@/lib/api/reviews", () => ({
  getBuddyProfile: vi.fn(),
  getBuddyReviews: vi.fn(),
}));

vi.mock("@/lib/api/users", () => ({ getMyProfile: vi.fn() }));

const mockedGetMyProfile = vi.mocked(getMyProfile);
const profile = {
  userId: 23,
  email: "tourist@example.com",
  name: "Tourist",
  displayName: "Tourist",
  userType: "TOURIST" as const,
  profileImageKey: null,
  profileImageUrl: null,
  nationalityCode: "US",
  birthDate: "1990-01-01",
  contactMethod: "WHATSAPP" as const,
  contactCountryCode: null,
  contactIdentifier: "tourist@example.com",
};

const mockedGetTouristActivities = vi.mocked(getTouristActivities);
const mockedGetBuddyProfile = vi.mocked(getBuddyProfile);
const mockedGetBuddyReviews = vi.mocked(getBuddyReviews);

function createActivity(
  activityId: number,
  buddyId = 17,
  displayPrice: ActivityDisplayPrice = createKrwDisplayPrice(45000),
) {
  return {
    activityId,
    buddyId,
    title: `Activity ${activityId}`,
    description: "A local experience.",
    totalDurationMinutes: 0,
    thumbnailImageUrl: "/images/activities/hanok-hero.jpg",
    buddyName: "Seoul Buddy",
    buddyProfileImageUrl: null,
    meetingPointName: "Anguk Station",
    meetingPlaceId: "place-1",
    price: 45000,
    currency: "KRW",
    displayPrice,
  };
}

describe("HostProfileDialog", () => {
  beforeEach(() => {
    router.push.mockClear();
    mockedGetMyProfile.mockReset();
    mockedGetMyProfile.mockResolvedValue({ status: "success", profile });
    mockedGetTouristActivities.mockResolvedValue({ status: "success", activities: [] });
    mockedGetBuddyProfile.mockResolvedValue({
      status: "success",
      buddy: {
        buddyId: 17,
        buddyName: "Seoul Buddy",
        buddyProfileImageUrl: null,
        averageRating: null,
        reviewCount: 0,
        activeActivityCount: 0,
      },
    });
    mockedGetBuddyReviews.mockResolvedValue({
      status: "success",
      reviews: {
        averageRating: null,
        totalCount: 0,
        reviews: [],
        page: 0,
        size: 12,
        hasNext: false,
      },
    });
  });

  it("shows the guest profile sections with a disabled chat action in preview mode", async () => {
    renderWithQueryClient(
      <HostProfileDialog
        host={{ id: 17, name: "Seoul Buddy", bio: "Local HanBuddy host", avatarUrl: null }}
        hostIntroduction="I know this neighborhood well."
        currentActivityId="preview"
        showHostedActivities
        canContact={false}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText("Other experiences from this buddy")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Message Seoul Buddy" })).toBeDisabled();
    expect(screen.getByText("I know this neighborhood well.")).toBeInTheDocument();
    expect(mockedGetTouristActivities).toHaveBeenCalledWith("EN", "USD");
  });

  it("hides chat for guests without redirecting or hiding the public profile", async () => {
    mockedGetMyProfile.mockResolvedValue({ status: "unauthenticated" });
    const { queryClient } = renderWithQueryClient(
      <HostProfileDialog
        host={{ id: 17, name: "Seoul Buddy", bio: "Local host", avatarUrl: null }}
        hostIntroduction="Public introduction"
        currentActivityId="42"
        onClose={vi.fn()}
      />,
    );
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(mockedGetMyProfile).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /Message/ })).not.toBeInTheDocument();
    expect(screen.getByText("Public introduction")).toBeInTheDocument();
    expect(screen.getByText("Other experiences from this buddy")).toBeInTheDocument();
    expect(useRouter().push).not.toHaveBeenCalled();
  });

  it("does not show chat until authentication has been confirmed", async () => {
    let resolveProfile!: (result: Awaited<ReturnType<typeof getMyProfile>>) => void;
    mockedGetMyProfile.mockReturnValue(
      new Promise((resolve) => {
        resolveProfile = resolve;
      }),
    );
    renderWithQueryClient(
      <HostProfileDialog
        host={{ id: 17, name: "Seoul Buddy", bio: "Local host", avatarUrl: null }}
        currentActivityId="42"
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /Message/ })).not.toBeInTheDocument();
    resolveProfile({ status: "success", profile });
    expect(await screen.findByRole("button", { name: "Message Seoul Buddy" })).toBeEnabled();
  });

  it("does not trust a cached profile when the session has expired", async () => {
    mockedGetMyProfile.mockResolvedValue({ status: "unauthenticated" });
    const { createQueryClient } = await import("@/lib/query/client");
    const queryClient = createQueryClient();
    queryClient.setQueryData(userKeys.me(), profile);
    renderWithQueryClient(
      <HostProfileDialog
        host={{ id: 17, name: "Seoul Buddy", bio: "Local host", avatarUrl: null }}
        currentActivityId="42"
        onClose={vi.fn()}
      />,
      { queryClient },
    );
    expect(screen.queryByRole("button", { name: /Message/ })).not.toBeInTheDocument();
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(screen.queryByRole("button", { name: /Message/ })).not.toBeInTheDocument();
  });

  it.each(["success", "unauthenticated"] as const)(
    "hides chat during a session recheck that resolves as %s",
    async (status) => {
      let resolveRecheck!: (result: Awaited<ReturnType<typeof getMyProfile>>) => void;
      const pendingRecheck = new Promise<Awaited<ReturnType<typeof getMyProfile>>>((resolve) => {
        resolveRecheck = resolve;
      });
      mockedGetMyProfile
        .mockResolvedValueOnce({ status: "success", profile })
        .mockReturnValueOnce(pendingRecheck);
      const { queryClient } = renderWithQueryClient(
        <HostProfileDialog
          host={{ id: 17, name: "Seoul Buddy", bio: "Local host", avatarUrl: null }}
          hostIntroduction="Public introduction"
          currentActivityId="42"
          onClose={vi.fn()}
        />,
      );
      expect(await screen.findByRole("button", { name: "Message Seoul Buddy" })).toBeEnabled();

      act(() => {
        void queryClient.invalidateQueries({ queryKey: userKeys.me() });
      });
      await waitFor(() => expect(mockedGetMyProfile).toHaveBeenCalledTimes(2));
      expect(queryClient.getQueryState(userKeys.me())?.fetchStatus).toBe("fetching");
      await waitFor(() =>
        expect(screen.queryByRole("button", { name: /Message/ })).not.toBeInTheDocument(),
      );
      expect(screen.getByText("Public introduction")).toBeInTheDocument();

      await act(async () => {
        resolveRecheck(status === "success" ? { status, profile } : { status });
        await pendingRecheck;
      });
      await waitFor(() => expect(queryClient.isFetching()).toBe(0));
      if (status === "success") {
        expect(await screen.findByRole("button", { name: "Message Seoul Buddy" })).toBeEnabled();
      } else {
        expect(screen.queryByRole("button", { name: /Message/ })).not.toBeInTheDocument();
      }
      expect(router.push).not.toHaveBeenCalled();
    },
  );

  it("does not repeat the activity currently being previewed", async () => {
    mockedGetTouristActivities.mockResolvedValue({
      status: "success",
      activities: [
        createActivity(42),
        createActivity(43, 17, {
          price: 32.5,
          discountedPrice: null,
          currency: "USD",
          exchangeRateDate: "2026-08-31",
          estimated: true,
        }),
        createActivity(44, 99),
      ],
    });

    renderWithQueryClient(
      <HostProfileDialog
        host={{ id: 17, name: "Seoul Buddy", bio: "Local HanBuddy host", avatarUrl: null }}
        currentActivityId="42"
        showHostedActivities
        canContact={false}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText("Activity 43")).toBeInTheDocument();
    expect(screen.queryByText("Activity 42")).not.toBeInTheDocument();
    expect(screen.queryByText("Activity 44")).not.toBeInTheDocument();
    const hostedActivityLink = screen.getByRole("link", { name: /Activity 43/ });
    expect(within(hostedActivityLink).getByText("₩45,000 per person")).toBeInTheDocument();
    expect(within(hostedActivityLink).getByText("≈ $32.50")).toHaveAttribute(
      "title",
      "Estimated using exchange rates from 2026-08-31",
    );
  });
});
