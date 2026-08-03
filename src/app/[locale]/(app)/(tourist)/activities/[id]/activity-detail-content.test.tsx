import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTouristActivity } from "@/lib/api/activities";
import { ApiClientError } from "@/lib/api/errors";
import { fetchGooglePlaceDetails, getGoogleMapsApiKey } from "@/lib/google/places";
import { createQueryClient } from "@/lib/query/client";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { IntlTestProvider } from "@/test/render-with-intl";
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
    getGoogleMapsApiKey: vi.fn(() => "test-google-key"),
  };
});

const mockedGetTouristActivity = vi.mocked(getTouristActivity);
const mockedFetchGooglePlaceDetails = vi.mocked(fetchGooglePlaceDetails);
const mockedGetGoogleMapsApiKey = vi.mocked(getGoogleMapsApiKey);

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

function mockActivityDetail() {
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
}

describe("ActivityDetailContent", () => {
  beforeEach(() => {
    mockedGetTouristActivity.mockReset();
    mockedFetchGooglePlaceDetails.mockReset();
    mockedGetGoogleMapsApiKey.mockReset();
    mockedGetGoogleMapsApiKey.mockReturnValue("test-google-key");
  });

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
    expect(screen.getByRole("img", { name: "Bukchon Hidden Gems" })).toHaveAttribute(
      "loading",
      "eager",
    );
    expect(screen.getByTestId("activity-detail-layout")).toHaveClass(
      "lg:grid-cols-[minmax(0,1fr)_360px]",
    );
    expect(screen.getByTestId("booking-panel")).toHaveClass("lg:sticky", "lg:top-24");
    expect(screen.getByText("Host: Jihoon Kim")).toBeInTheDocument();
    expect(screen.getByText("Local guide")).toBeInTheDocument();
    expect(screen.getByText("4 spots left")).toBeInTheDocument();
    expect(screen.getByText("All times are in Korea Standard Time (KST).")).toBeInTheDocument();
    expect(await screen.findAllByText("123 Anguk-ro, Jongno-gu, Seoul")).toHaveLength(2);
    expect(mockedFetchGooglePlaceDetails).toHaveBeenCalledWith("ChIJ-bukchon", "test-google-key", {
      locale: "en",
    });
    expect(screen.getByTitle("Map of Anguk Station Exit 2")).toHaveAttribute(
      "src",
      "https://www.google.com/maps/embed/v1/place?key=test-google-key&q=place_id%3AChIJ-bukchon&language=en&region=KR",
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

    renderWithQueryClient(<ActivityDetailContent activityId="42" />, { locale: "ko" });

    expect(await screen.findByRole("heading", { name: "Bukchon Hidden Gems" })).toBeInTheDocument();
    expect(screen.getByText("Walk through quiet alleys with a local buddy.")).toBeInTheDocument();
    expect(screen.getByText("호스트: Jihoon Kim")).toBeInTheDocument();
    expect(screen.getByText("Local guide")).toBeInTheDocument();
    expect(screen.getByText("Comfortable shoes recommended")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "포함 사항" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "참여 제한" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "예약 가능 일정" })).toBeInTheDocument();
    expect(screen.getByText("4자리 남음")).toBeInTheDocument();
    expect(screen.getByText("2026. 7. 20.")).toBeInTheDocument();
    expect(screen.getByText("오전 10:00")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "만나는 장소" })).toBeInTheDocument();
    expect(await screen.findByText("모든 시간은 한국 표준시(KST) 기준입니다.")).toBeInTheDocument();
    expect(screen.getByText("1인당 ₩45,000")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "지금 예약하기" })).toHaveAttribute(
      "href",
      "/ko/activities/42/book",
    );
    expect(mockedFetchGooglePlaceDetails).toHaveBeenCalledWith("ChIJ-bukchon", "test-google-key", {
      locale: "ko",
    });
    expect(screen.getByTitle("Anguk Station Exit 2 지도")).toHaveAttribute(
      "src",
      "https://www.google.com/maps/embed/v1/place?key=test-google-key&q=place_id%3AChIJ-bukchon&language=ko&region=KR",
    );
  });

  it("localizes Korean loading and maps the activity-not-found code", async () => {
    let rejectActivity!: (error: Error) => void;
    mockedGetTouristActivity.mockReturnValue(
      new Promise((_, reject) => {
        rejectActivity = reject;
      }),
    );

    renderWithQueryClient(<ActivityDetailContent activityId="42" />, { locale: "ko" });

    expect(screen.getByText("액티비티를 불러오는 중...")).toBeInTheDocument();

    rejectActivity(
      new ApiClientError({
        code: "ACTIVITY404",
        status: 404,
        details: null,
        backendMessage: "raw server detail",
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("액티비티를 찾을 수 없습니다.");
    expect(screen.queryByText("raw server detail")).not.toBeInTheDocument();
  });

  it("hides the previous Google address while a locale replacement is pending", async () => {
    const englishRequest = createDeferred<{ formattedAddress: string }>();
    const koreanRequest = createDeferred<{ formattedAddress: string }>();
    mockedFetchGooglePlaceDetails.mockImplementation((_, __, options) =>
      options.locale === "en" ? englishRequest.promise : koreanRequest.promise,
    );
    mockActivityDetail();
    const queryClient = createQueryClient();
    const renderContent = (locale: "en" | "ko") => (
      <QueryClientProvider client={queryClient}>
        <IntlTestProvider locale={locale}>
          <ActivityDetailContent activityId="42" />
        </IntlTestProvider>
      </QueryClientProvider>
    );
    const { rerender } = render(renderContent("en"));

    await waitFor(() => expect(mockedFetchGooglePlaceDetails).toHaveBeenCalledTimes(1));
    await act(async () => {
      englishRequest.resolve({ formattedAddress: "Anguk Station, Seoul" });
      await englishRequest.promise;
    });
    expect(await screen.findAllByText("Anguk Station, Seoul")).toHaveLength(2);

    rerender(renderContent("ko"));

    await waitFor(() => expect(mockedFetchGooglePlaceDetails).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("Anguk Station, Seoul")).not.toBeInTheDocument();

    await act(async () => {
      koreanRequest.resolve({ formattedAddress: "서울 안국역" });
      await koreanRequest.promise;
    });
    expect(await screen.findAllByText("서울 안국역")).toHaveLength(2);
    expect(mockedFetchGooglePlaceDetails.mock.calls.map((call) => call[2].locale)).toEqual([
      "en",
      "ko",
    ]);
    expect(mockedGetTouristActivity).toHaveBeenCalledTimes(1);
  });

  it("ignores a late Google address response from the previous locale", async () => {
    const englishRequest = createDeferred<{ formattedAddress: string }>();
    const koreanRequest = createDeferred<{ formattedAddress: string }>();
    mockedFetchGooglePlaceDetails.mockImplementation((_, __, options) =>
      options.locale === "en" ? englishRequest.promise : koreanRequest.promise,
    );
    mockActivityDetail();
    const queryClient = createQueryClient();
    const renderContent = (locale: "en" | "ko") => (
      <QueryClientProvider client={queryClient}>
        <IntlTestProvider locale={locale}>
          <ActivityDetailContent activityId="42" />
        </IntlTestProvider>
      </QueryClientProvider>
    );
    const { rerender } = render(renderContent("en"));

    await waitFor(() => expect(mockedFetchGooglePlaceDetails).toHaveBeenCalledTimes(1));
    rerender(renderContent("ko"));
    await waitFor(() => expect(mockedFetchGooglePlaceDetails).toHaveBeenCalledTimes(2));

    await act(async () => {
      englishRequest.resolve({ formattedAddress: "Anguk Station, Seoul" });
      await englishRequest.promise;
    });
    expect(screen.queryByText("Anguk Station, Seoul")).not.toBeInTheDocument();

    await act(async () => {
      koreanRequest.resolve({ formattedAddress: "서울 안국역" });
      await koreanRequest.promise;
    });
    expect(await screen.findAllByText("서울 안국역")).toHaveLength(2);
  });

  it("hides a resolved Google address when the API key disappears", async () => {
    mockedFetchGooglePlaceDetails.mockResolvedValue({
      formattedAddress: "Anguk Station, Seoul",
    });
    mockActivityDetail();
    const queryClient = createQueryClient();
    const renderContent = () => (
      <QueryClientProvider client={queryClient}>
        <IntlTestProvider locale="en">
          <ActivityDetailContent activityId="42" />
        </IntlTestProvider>
      </QueryClientProvider>
    );
    const { rerender } = render(renderContent());

    expect(await screen.findAllByText("Anguk Station, Seoul")).toHaveLength(2);

    mockedGetGoogleMapsApiKey.mockReturnValue("");
    rerender(renderContent());

    expect(screen.queryByText("Anguk Station, Seoul")).not.toBeInTheDocument();
    expect(mockedFetchGooglePlaceDetails).toHaveBeenCalledTimes(1);
  });
});
