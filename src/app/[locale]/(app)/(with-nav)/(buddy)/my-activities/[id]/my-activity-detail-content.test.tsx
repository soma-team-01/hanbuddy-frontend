import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMyActivity } from "@/lib/api/buddy";
import { ApiClientError } from "@/lib/api/errors";
import { useMyProfile } from "@/lib/api/useMyProfile";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import type { MyActivityDetailResponse } from "@/types/buddy";
import type { MyProfile } from "@/types/user";
import { MyActivityDetailContent } from "./my-activity-detail-content";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/lib/api/buddy", () => ({
  getMyActivity: vi.fn(),
}));

vi.mock("@/lib/api/useMyProfile", () => ({
  useMyProfile: vi.fn(),
}));

vi.mock("@/lib/google/places", async () => {
  const actual = await vi.importActual<typeof import("@/lib/google/places")>("@/lib/google/places");
  return {
    ...actual,
    fetchGooglePlaceDetails: vi.fn().mockResolvedValue({ formattedAddress: "Seoul" }),
    getGoogleMapsApiKey: vi.fn(() => "test-google-key"),
  };
});

const mockedGetMyActivity = vi.mocked(getMyActivity);
const mockedUseMyProfile = vi.mocked(useMyProfile);

function seoulDateKey(offsetDays: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
    new Date(Date.now() + offsetDays * 86_400_000),
  );
}

const futureStartAt = `${seoulDateKey(7)}T10:00:00+09:00`;

const activityDetail: MyActivityDetailResponse = {
  activityId: 42,
  title: "Traditional Tea Tasting",
  description: "Learn Korean tea etiquette with a local buddy.",
  thumbnailImageUrl: "https://static.hanbuddy.com/activities/tea.webp",
  status: "ACTIVE",
  hostIntroduction: "I have hosted tea ceremonies in Insadong for five years.",
  includedItems: ["Tea tasting", "Hanbok photos"],
  restrictionNotes: ["Not recommended for children under 5"],
  maxCapacity: 6,
  price: 45000,
  currency: "KRW",
  discountPercent: 20,
  discountEndDate: "2099-08-31",
  discountedPrice: 36000,
  meetingPointName: "Anguk Station Exit 2",
  meetingPlaceId: "ChIJ-bukchon",
  images: [
    { imageUrl: "https://static.hanbuddy.com/activities/tea-1.webp", imageOrder: 1 },
    { imageUrl: "https://static.hanbuddy.com/activities/tea-0.webp", imageOrder: 0 },
  ],
  schedules: [
    {
      scheduleId: 101,
      startAt: futureStartAt,
      bookedCount: 2,
      status: "OPEN",
    },
  ],
  itineraries: [
    {
      itineraryId: 11,
      title: "Meet at Anguk",
      description: "Short welcome and introductions.",
      durationMinutes: 15,
      imageUrl: "https://static.hanbuddy.com/activities/anguk.webp",
      itemOrder: 0,
    },
  ],
};

const profile = {
  name: "Jihoon Kim",
  profileImageUrl: null,
} as MyProfile;

describe("MyActivityDetailContent", () => {
  beforeEach(() => {
    mockedGetMyActivity.mockReset();
    mockedUseMyProfile.mockReset();
    mockedUseMyProfile.mockReturnValue({ status: "success", profile });
  });

  it("shows the guest-facing detail with a preview banner and manage actions", async () => {
    mockedGetMyActivity.mockResolvedValue({ status: "success", activity: activityDetail });

    renderWithQueryClient(<MyActivityDetailContent activityId="42" />);

    expect(
      await screen.findByRole("heading", { name: "Traditional Tea Tasting" }),
    ).toBeInTheDocument();
    expect(mockedGetMyActivity).toHaveBeenCalledWith("42");
    expect(screen.getByTestId("guest-preview-banner")).toBeInTheDocument();
    expect(screen.getByText("Guest preview")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This is exactly what guests see. Booking steps are disabled in this preview.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Edit activity/ })).toHaveAttribute(
      "href",
      "/en/my-activities/42/edit",
    );
    expect(screen.queryByRole("link", { name: /View applicants/ })).not.toBeInTheDocument();
    // 게스트 화면과 동일한 본문: 버디 프로필이 호스트로 노출된다
    expect(screen.getByText("Host: Jihoon Kim")).toBeInTheDocument();
    expect(
      screen.getByText("I have hosted tea ceremonies in Insadong for five years."),
    ).toBeInTheDocument();
    expect(screen.getByText("Tea tasting")).toBeInTheDocument();
    expect(screen.getByText("₩36,000 per person")).toBeInTheDocument();
    expect(screen.getByText("₩45,000")).toBeInTheDocument();
  });

  it("keeps Book now disabled while dates stay browsable in the preview", async () => {
    mockedGetMyActivity.mockResolvedValue({ status: "success", activity: activityDetail });

    renderWithQueryClient(<MyActivityDetailContent activityId="42" />);

    // Book now는 비활성 버튼이라 예약 단계로 이동할 수 없다
    expect(await screen.findByRole("button", { name: "Book now" })).toBeDisabled();
    expect(screen.queryByRole("link", { name: "Book now" })).not.toBeInTheDocument();

    // 캘린더 열람과 시간대 선택은 고객 화면과 동일하게 동작한다
    fireEvent.click(screen.getByTestId("date-select-box"));
    expect(await screen.findByRole("heading", { name: "Availability" })).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    const slot = within(dialog).getByRole("button", { name: /10:00 AM/ });
    expect(slot).toHaveTextContent("4 spots left");
    fireEvent.click(slot);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByTestId("date-select-box")).toHaveTextContent("10:00 AM");
    expect(screen.getByRole("button", { name: "Book now" })).toBeDisabled();
  });

  it("localizes the preview banner in Korean", async () => {
    mockedGetMyActivity.mockResolvedValue({ status: "success", activity: activityDetail });

    renderWithQueryClient(<MyActivityDetailContent activityId="42" />, { locale: "ko" });

    expect(
      await screen.findByRole("heading", { name: "Traditional Tea Tasting" }),
    ).toBeInTheDocument();
    expect(screen.getByText("고객 화면 미리보기")).toBeInTheDocument();
    expect(
      screen.getByText(
        "고객에게 보이는 활동 상세와 동일한 화면입니다. 미리보기에서는 예약 단계로 이동할 수 없습니다.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("게시 중")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /활동 수정/ })).toHaveAttribute(
      "href",
      "/ko/my-activities/42/edit",
    );
    expect(screen.getByText("1인당 ₩36,000")).toBeInTheDocument();
  });

  it("maps a not-owner error to a localized message", async () => {
    mockedGetMyActivity.mockResolvedValue({
      status: "error",
      error: new ApiClientError({
        code: "ACTIVITY403_OWNER",
        status: 403,
        details: null,
        backendMessage: "raw server detail",
      }),
    });

    renderWithQueryClient(<MyActivityDetailContent activityId="42" />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("raw server detail")).not.toBeInTheDocument();
  });
});
