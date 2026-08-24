import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getActivityWeather, getTouristActivities, getTouristActivity } from "@/lib/api/activities";
import { getActivityReviews, getBuddyProfile, getBuddyReviews } from "@/lib/api/reviews";
import { ApiClientError } from "@/lib/api/errors";
import { fetchGooglePlaceDetails, getGoogleMapsApiKey } from "@/lib/google/places";
import { createQueryClient } from "@/lib/query/client";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { IntlTestProvider } from "@/test/render-with-intl";
import { ActivityDetailContent } from "./activity-detail-content";

const routerMock = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => routerMock,
}));

vi.mock("@/lib/api/activities", () => ({
  getActivityWeather: vi.fn(),
  getTouristActivity: vi.fn(),
  getTouristActivities: vi.fn(),
}));

vi.mock("@/lib/api/reviews", () => ({
  getActivityReviews: vi.fn(),
  getBuddyProfile: vi.fn(),
  getBuddyReviews: vi.fn(),
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
const mockedGetActivityWeather = vi.mocked(getActivityWeather);
const mockedGetTouristActivities = vi.mocked(getTouristActivities);
const mockedGetActivityReviews = vi.mocked(getActivityReviews);
const mockedGetBuddyProfile = vi.mocked(getBuddyProfile);
const mockedGetBuddyReviews = vi.mocked(getBuddyReviews);

const mockedFetchGooglePlaceDetails = vi.mocked(fetchGooglePlaceDetails);
const mockedGetGoogleMapsApiKey = vi.mocked(getGoogleMapsApiKey);

function emptyReviewPage() {
  return {
    status: "success" as const,
    reviews: {
      averageRating: null,
      totalCount: 0,
      reviews: [],
      page: 0,
      size: 6,
      hasNext: false,
    },
  };
}

/** Asia/Seoul 기준 offsetDays 뒤의 날짜 키 — 캘린더가 현재 달 이전을 잘라내므로 항상 미래를 쓴다 */
function seoulDateKey(offsetDays: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
    new Date(Date.now() + offsetDays * 86_400_000),
  );
}

const futureDateKey = seoulDateKey(7);
const futureStartAt = `${futureDateKey}T10:00:00+09:00`;

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

function buildActivityDetail() {
  return {
    activityId: 42,
    buddyId: 7,
    title: "Bukchon Hidden Gems",
    description: "Walk through quiet alleys with a local buddy.",
    thumbnailImageUrl: "/images/activities/hanok-hero.jpg",
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
        startAt: futureStartAt,
        remainingCapacity: 4,
        status: "OPEN" as const,
      },
      {
        activityScheduleId: 102,
        startAt: `${futureDateKey}T14:00:00+09:00`,
        remainingCapacity: 2,
        status: "OPEN" as const,
      },
    ],
  };
}

function mockActivityDetail() {
  mockedGetTouristActivity.mockResolvedValue({
    status: "success",
    activity: { ...buildActivityDetail(), includedItems: [], restrictionNotes: [], schedules: [] },
  });
}

describe("ActivityDetailContent", () => {
  beforeEach(() => {
    routerMock.back.mockReset();
    routerMock.push.mockReset();
    mockedGetTouristActivity.mockReset();
    mockedGetActivityWeather.mockReset();
    mockedGetActivityWeather.mockResolvedValue({
      status: "success",
      weather: {
        available: false,
        unavailableReason: "LOCATION_UNAVAILABLE",
        provider: "KMA",
        timeZone: "Asia/Seoul",
        issuedAt: null,
        baseDate: futureDateKey,
        forecasts: [],
      },
    });
    mockedGetTouristActivities.mockReset();
    mockedGetTouristActivities.mockResolvedValue({ status: "success", activities: [] });
    mockedFetchGooglePlaceDetails.mockReset();
    mockedGetGoogleMapsApiKey.mockReset();
    mockedGetGoogleMapsApiKey.mockReturnValue("test-google-key");
    mockedGetActivityReviews.mockReset();
    mockedGetActivityReviews.mockResolvedValue(emptyReviewPage());
    mockedGetBuddyReviews.mockReset();
    mockedGetBuddyReviews.mockResolvedValue(emptyReviewPage());
    mockedGetBuddyProfile.mockReset();
    mockedGetBuddyProfile.mockResolvedValue({
      status: "success",
      buddy: {
        buddyId: 7,
        buddyName: "Jihoon Kim",
        buddyProfileImageUrl: null,
        averageRating: 4.9,
        reviewCount: 12,
        activeActivityCount: 2,
      },
    });
  });

  it("renders activity detail with the fixed booking bar", async () => {
    mockedFetchGooglePlaceDetails.mockResolvedValue({
      formattedAddress: "123 Anguk-ro, Jongno-gu, Seoul",
    });
    mockedGetTouristActivity.mockResolvedValue({
      status: "success",
      activity: buildActivityDetail(),
    });

    renderWithQueryClient(<ActivityDetailContent activityId="42" />);

    expect(await screen.findByRole("heading", { name: "Bukchon Hidden Gems" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Bukchon Hidden Gems" })).toHaveAttribute(
      "loading",
      "eager",
    );
    expect(screen.getByTestId("booking-bottom-bar")).toBeInTheDocument();
    expect(screen.getByText("₩45,000 per person")).toBeInTheDocument();
    // 하단 바: 가격 | 날짜 선택 박스(placeholder) | Book now(선택 전 비활성)
    expect(screen.getByTestId("date-select-box")).toHaveTextContent("Select a date");
    expect(screen.getByRole("button", { name: "Book now" })).toBeDisabled();
    expect(screen.queryByRole("link", { name: "Book now" })).not.toBeInTheDocument();
    expect(screen.getByText("Host: Jihoon Kim")).toBeInTheDocument();
    expect(screen.getByText("Local guide")).toBeInTheDocument();
    expect(await screen.findAllByText("123 Anguk-ro, Jongno-gu, Seoul")).toHaveLength(2);
    expect(mockedFetchGooglePlaceDetails).toHaveBeenCalledWith("ChIJ-bukchon", "test-google-key", {
      locale: "en",
    });
    expect(screen.getByTitle("Map of Anguk Station Exit 2")).toHaveAttribute(
      "src",
      "https://www.google.com/maps/embed/v1/place?key=test-google-key&q=place_id%3AChIJ-bukchon&language=en&region=KR",
    );
  });

  it("selects a calendar time slot and points Book now at that schedule", async () => {
    mockedFetchGooglePlaceDetails.mockResolvedValue({
      formattedAddress: "123 Anguk-ro, Jongno-gu, Seoul",
    });
    mockedGetTouristActivity.mockResolvedValue({
      status: "success",
      activity: buildActivityDetail(),
    });

    renderWithQueryClient(<ActivityDetailContent activityId="42" />);

    fireEvent.click(await screen.findByTestId("date-select-box"));

    const dialog = await screen.findByRole("dialog");
    expect(screen.getByRole("heading", { name: "Availability" })).toBeInTheDocument();
    expect(screen.getByText("All times are in Korea Standard Time (KST).")).toBeInTheDocument();

    // 가능 날짜는 미리 선택되어 시간대가 바로 보인다
    expect(screen.getByText("Available times")).toBeInTheDocument();
    const slot = within(dialog).getByRole("button", { name: /2:00 PM/ });
    expect(slot).toHaveTextContent("2 spots left");
    fireEvent.click(slot);

    // 선택하면 다이얼로그가 닫히고 날짜 박스와 Book now 링크가 그 일정으로 바뀐다
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByTestId("date-select-box")).toHaveTextContent("2:00 PM");
    expect(screen.getByRole("link", { name: "Book now" })).toHaveAttribute(
      "href",
      "/en/activities/42/book?scheduleId=102",
    );
  });

  it("shows only the forecast icon matching each schedule start time", async () => {
    mockedFetchGooglePlaceDetails.mockResolvedValue({
      formattedAddress: "123 Anguk-ro, Jongno-gu, Seoul",
    });
    mockedGetTouristActivity.mockResolvedValue({
      status: "success",
      activity: buildActivityDetail(),
    });
    mockedGetActivityWeather.mockResolvedValue({
      status: "success",
      weather: {
        available: true,
        unavailableReason: null,
        provider: "KMA",
        timeZone: "Asia/Seoul",
        issuedAt: "2026-08-24T14:00:00+09:00",
        baseDate: futureDateKey,
        forecasts: [
          {
            forecastAt: `${futureDateKey}T14:00:00+09:00`,
            temperatureCelsius: 29,
            condition: "PARTLY_CLOUDY",
            precipitationProbability: 20,
          },
        ],
      },
    });

    renderWithQueryClient(<ActivityDetailContent activityId="42" />);
    fireEvent.click(await screen.findByTestId("date-select-box"));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getAllByLabelText("Partly cloudy").length).toBeGreaterThan(0);
    expect(within(dialog).queryByText("29°")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Rain 20%")).not.toBeInTheDocument();
    expect(within(dialog).getByText("Weather data from KMA")).toBeInTheDocument();
    expect(mockedGetActivityWeather).toHaveBeenCalledTimes(1);
    expect(mockedGetActivityWeather).toHaveBeenCalledWith("42");
  });

  it("keeps booking available when the weather request fails", async () => {
    mockedFetchGooglePlaceDetails.mockResolvedValue({ formattedAddress: "Anguk Station" });
    mockedGetTouristActivity.mockResolvedValue({
      status: "success",
      activity: buildActivityDetail(),
    });
    mockedGetActivityWeather.mockResolvedValue({
      status: "error",
      error: new ApiClientError({
        code: null,
        status: 502,
        details: null,
        backendMessage: "weather unavailable",
      }),
    });

    renderWithQueryClient(<ActivityDetailContent activityId="42" />);

    fireEvent.click(await screen.findByTestId("date-select-box"));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByText("Weather data from KMA")).not.toBeInTheDocument();
    expect(screen.getByText("Available times")).toBeInTheDocument();
  });

  it("shows start and end times in the calendar when a duration is provided", async () => {
    mockedFetchGooglePlaceDetails.mockResolvedValue({
      formattedAddress: "123 Anguk-ro, Jongno-gu, Seoul",
    });
    mockedGetTouristActivity.mockResolvedValue({
      status: "success",
      activity: { ...buildActivityDetail(), totalDurationHours: 2.25 },
    });

    renderWithQueryClient(<ActivityDetailContent activityId="42" />);

    fireEvent.click(await screen.findByTestId("date-select-box"));

    const dialog = await screen.findByRole("dialog");
    // 소요시간 135분: 10:00 AM 시작 → 12:15 PM 종료
    expect(within(dialog).getByRole("button", { name: /10:00 AM ~ 12:15 PM/ })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /2:00 PM ~ 4:15 PM/ })).toBeInTheDocument();
  });

  it("localizes the calendar flow in Korean", async () => {
    mockedFetchGooglePlaceDetails.mockResolvedValue({
      formattedAddress: "123 Anguk-ro, Jongno-gu, Seoul",
    });
    mockedGetTouristActivity.mockResolvedValue({
      status: "success",
      activity: buildActivityDetail(),
    });

    renderWithQueryClient(<ActivityDetailContent activityId="42" />, { locale: "ko" });

    expect(await screen.findByRole("heading", { name: "Bukchon Hidden Gems" })).toBeInTheDocument();
    expect(screen.getByText("호스트: Jihoon Kim")).toBeInTheDocument();
    expect(screen.getByText("Local guide")).toBeInTheDocument();
    expect(screen.getByText("Comfortable shoes recommended")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "포함 사항" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "신청 전 확인사항" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "만나는 장소" })).toBeInTheDocument();
    expect(screen.getByText("1인당 ₩45,000")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "지금 예약하기" })).toBeDisabled();
    const dateBox = screen.getByTestId("date-select-box");
    expect(dateBox).toHaveTextContent("날짜를 선택하세요");

    fireEvent.click(dateBox);

    expect(await screen.findByRole("heading", { name: "예약 가능 일정" })).toBeInTheDocument();
    expect(screen.getByText("모든 시간은 한국 표준시(KST) 기준입니다.")).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    const slot = within(dialog).getByRole("button", { name: /오전 10:00/ });
    expect(slot).toHaveTextContent("4자리 남음");
    fireEvent.click(slot);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByTestId("date-select-box")).toHaveTextContent("오전 10:00");
    expect(screen.getByRole("link", { name: "지금 예약하기" })).toHaveAttribute(
      "href",
      "/ko/activities/42/book?scheduleId=101",
    );
    expect(mockedFetchGooglePlaceDetails).toHaveBeenCalledWith("ChIJ-bukchon", "test-google-key", {
      locale: "ko",
    });
  });

  it("renders the itinerary timeline and host introduction when provided", async () => {
    mockedFetchGooglePlaceDetails.mockResolvedValue({
      formattedAddress: "123 Anguk-ro, Jongno-gu, Seoul",
    });
    mockedGetTouristActivity.mockResolvedValue({
      status: "success",
      activity: {
        ...buildActivityDetail(),
        totalDurationHours: 2.5,
        hostIntroduction: "I have guided Bukchon walks for seven years and love quiet alleys.",
        restrictionNotes: [],
        schedules: [],
        itineraries: [
          {
            itineraryId: 2,
            title: "Hanok tea break",
            description: "Rest with warm tea in a hanok courtyard.",
            durationMinutes: 40,
            imageUrl: "/images/activities/tea.jpg",
            itemOrder: 1,
          },
          {
            itineraryId: 1,
            title: "Meet at Anguk",
            description: "Short briefing before we start walking.",
            durationMinutes: 20,
            imageUrl: "/images/activities/anguk.jpg",
            itemOrder: 0,
          },
        ],
      },
    });

    renderWithQueryClient(<ActivityDetailContent activityId="42" />);

    expect(await screen.findByRole("heading", { name: "Bukchon Hidden Gems" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What you'll do" })).toBeInTheDocument();
    const itineraryTitles = [
      screen.getByRole("heading", { name: "Meet at Anguk" }),
      screen.getByRole("heading", { name: "Hanok tea break" }),
    ];
    expect(
      itineraryTitles[0].compareDocumentPosition(itineraryTitles[1]) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText("Step 1 · 20 min")).toBeInTheDocument();
    expect(screen.getByText("Step 2 · 40 min")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Meet your buddy" })).toBeInTheDocument();
    expect(
      screen.getByText("I have guided Bukchon walks for seven years and love quiet alleys."),
    ).toBeInTheDocument();
    expect(screen.getByText("2.5 hours")).toBeInTheDocument();
    // 일정이 없으면 칩 대신 안내 문구가 뜨고 Book now가 비활성화된다
    expect(screen.getByText("No dates available yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Book now" })).toBeDisabled();
  });

  it("returns to the previous page instead of a fixed explore link", async () => {
    mockedFetchGooglePlaceDetails.mockResolvedValue({
      formattedAddress: "123 Anguk-ro, Jongno-gu, Seoul",
    });
    mockedGetTouristActivity.mockResolvedValue({
      status: "success",
      activity: buildActivityDetail(),
    });

    // 앱 안에서 이동해 온 상황을 만든다
    window.history.pushState({}, "", "/en/activities/42");

    renderWithQueryClient(<ActivityDetailContent activityId="42" />);

    fireEvent.click(await screen.findByRole("button", { name: "Go back" }));

    expect(routerMock.back).toHaveBeenCalledTimes(1);
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("opens the host profile with the buddy's other experiences", async () => {
    mockedFetchGooglePlaceDetails.mockResolvedValue({
      formattedAddress: "123 Anguk-ro, Jongno-gu, Seoul",
    });
    mockedGetTouristActivity.mockResolvedValue({
      status: "success",
      activity: {
        ...buildActivityDetail(),
        hostIntroduction: "I have guided Bukchon walks for seven years.",
      },
    });
    mockedGetTouristActivities.mockResolvedValue({
      status: "success",
      activities: [
        {
          activityId: 42,
          buddyId: 7,
          title: "Bukchon Hidden Gems",
          description: "Current activity is excluded.",
          thumbnailImageUrl: "/images/activities/hanok-hero.jpg",
          buddyName: "Jihoon Kim",
          buddyProfileImageUrl: null,
          meetingPointName: "Anguk Station Exit 2",
          meetingPlaceId: "ChIJ-bukchon",
          price: 45000,
          currency: "KRW",
        },
        {
          activityId: 77,
          buddyId: 7,
          title: "Seoul Night Market Walk",
          description: "Another experience by the same buddy.",
          thumbnailImageUrl: "/images/activities/market.jpg",
          buddyName: "Jihoon Kim",
          buddyProfileImageUrl: null,
          meetingPointName: "Gwangjang Market",
          meetingPlaceId: "ChIJ-gwangjang",
          price: 30000,
          currency: "KRW",
        },
        {
          activityId: 88,
          buddyId: 9,
          title: "Other buddy experience",
          description: "Hosted by a different buddy with the same public name.",
          thumbnailImageUrl: "/images/activities/other.jpg",
          buddyName: "Jihoon Kim",
          buddyProfileImageUrl: null,
          meetingPointName: "Hongdae",
          meetingPlaceId: "ChIJ-hongdae",
          price: 20000,
          currency: "KRW",
        },
      ],
    });

    renderWithQueryClient(<ActivityDetailContent activityId="42" />);

    fireEvent.click(await screen.findByRole("button", { name: "View Jihoon Kim's profile" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Jihoon Kim" })).toBeInTheDocument();
    expect(
      within(dialog).getByText("I have guided Bukchon walks for seven years."),
    ).toBeInTheDocument();
    // 같은 buddyId의 다른 체험만 노출한다 — 공개 닉네임이 같은 동명이인은 제외된다
    const hostedLink = await within(dialog).findByRole("link", {
      name: /Seoul Night Market Walk/,
    });
    expect(hostedLink).toHaveAttribute("href", "/en/activities/77");
    expect(within(dialog).queryByText("Other buddy experience")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Current activity is excluded.")).not.toBeInTheDocument();
    // 버디 프로필 API가 내려준 평점·운영 중인 체험 수를 함께 보여준다
    expect(
      await within(dialog).findByRole("img", { name: "Rated 4.9 out of 5 from 12 reviews" }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("2 live experiences")).toBeInTheDocument();
    expect(mockedGetBuddyProfile).toHaveBeenCalledWith(7);
    expect(mockedGetBuddyReviews).toHaveBeenCalledWith(7, 0, 12, null);
  });

  it("lists the buddy's reviews across activities in the host profile", async () => {
    mockedFetchGooglePlaceDetails.mockResolvedValue({
      formattedAddress: "123 Anguk-ro, Jongno-gu, Seoul",
    });
    mockedGetTouristActivity.mockResolvedValue({
      status: "success",
      activity: buildActivityDetail(),
    });
    mockedGetBuddyReviews.mockResolvedValue({
      status: "success",
      reviews: {
        averageRating: 4.9,
        totalCount: 1,
        reviews: [
          {
            reviewId: 5,
            applicationId: 15,
            activityId: 77,
            activityTitle: "Seoul Night Market Walk",
            reviewerName: "Nelli",
            reviewerProfileImageUrl: null,
            rating: 5,
            content: "Jihoon knows every alley.",
            createdAt: "2026-08-01T13:00:00+09:00",
          },
        ],
        page: 0,
        size: 6,
        hasNext: false,
      },
    });

    renderWithQueryClient(<ActivityDetailContent activityId="42" />);

    fireEvent.click(await screen.findByRole("button", { name: "View Jihoon Kim's profile" }));

    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("Jihoon knows every alley.")).toBeInTheDocument();
    // 여러 활동의 후기가 섞이므로 어떤 활동의 후기인지 함께 보여준다
    expect(within(dialog).getByText("Seoul Night Market Walk")).toBeInTheDocument();
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
