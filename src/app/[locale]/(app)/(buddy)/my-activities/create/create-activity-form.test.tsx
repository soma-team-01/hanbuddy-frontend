import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMyActivity, previewActivityPrice } from "@/lib/api/buddy";
import { ApiClientError } from "@/lib/api/errors";
import { getMyProfile } from "@/lib/api/users";
import {
  fetchGooglePlaceDetails,
  type GooglePlaceDetails,
  type GooglePlacePrediction,
  searchGooglePlacePredictions,
} from "@/lib/google/places";
import { uploadActivityImages } from "@/lib/images/presigned";
import { buddyKeys } from "@/lib/query/buddy";
import { createQueryClient } from "@/lib/query/client";
import { UnauthenticatedQueryError } from "@/lib/query/result";
import { userKeys } from "@/lib/query/users";
import { createMockProfile } from "@/test/factories";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { IntlTestProvider } from "@/test/render-with-intl";
import {
  CreateActivityForm,
  type CreateActivityErrorKey,
  validateCreateActivityStep,
} from "./create-activity-form";

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => routerMock,
}));

vi.mock("@/lib/api/buddy", () => ({
  createMyActivity: vi.fn(),
  previewActivityPrice: vi.fn(),
}));

vi.mock("@/lib/api/users", () => ({
  getMyProfile: vi.fn(),
}));

vi.mock("@/lib/images/presigned", () => ({
  uploadActivityImages: vi.fn(),
}));

vi.mock("@/lib/google/places", async () => {
  const actual = await vi.importActual<typeof import("@/lib/google/places")>("@/lib/google/places");
  return {
    ...actual,
    fetchGooglePlaceDetails: vi.fn(),
    searchGooglePlacePredictions: vi.fn(),
  };
});

const mockedCreateMyActivity = vi.mocked(createMyActivity);
const mockedPreviewActivityPrice = vi.mocked(previewActivityPrice);
const mockedGetMyProfile = vi.mocked(getMyProfile);
const mockedUploadActivityImages = vi.mocked(uploadActivityImages);
const mockedFetchGooglePlaceDetails = vi.mocked(fetchGooglePlaceDetails);
const mockedSearchGooglePlacePredictions = vi.mocked(searchGooglePlacePredictions);
const createObjectUrlMock = vi.fn((file: Blob) =>
  file instanceof File ? `blob:${file.name}` : "blob:preview",
);
const revokeObjectUrlMock = vi.fn();
const profile = createMockProfile({ userType: "BUDDY" });
type CreateActivityValidationInput = Parameters<typeof validateCreateActivityStep>[0];

const CREATE_ACTIVITY_VALIDATION_CASES: Array<
  [CreateActivityErrorKey, Partial<CreateActivityValidationInput>]
> = [
  ["photosRequired", { step: 1, selectedPhotoCount: 0, title: "Tea", description: "Tea tasting" }],
  ["titleRequired", { step: 1, selectedPhotoCount: 1, title: " ", description: "Tea tasting" }],
  ["descriptionRequired", { step: 1, selectedPhotoCount: 1, title: "Tea", description: " " }],
  ["scheduleRequired", { step: 2, scheduleDateTimes: [""] }],
  ["capacityInvalid", { step: 2, maxCapacity: "0" }],
  ["priceInvalid", { step: 2, price: "50000.5" }],
  ["meetingPlaceRequired", { step: 3, meetingPlaceId: "" }],
  ["meetingPointNameRequired", { step: 3, meetingPointName: " " }],
  ["includedItemRequired", { step: 3, includedItems: [""] }],
];

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function confirmRegisterInDialog() {
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Register" }));
}

async function selectGooglePlace(label = "Search Google place") {
  fireEvent.change(screen.getByLabelText(label), {
    target: { value: "Anguk" },
  });
  fireEvent.click(await screen.findByRole("button", { name: /Anguk Station/ }));
}

function uploadActivityPhoto(
  file = new File([new Uint8Array([1])], "tea.webp", { type: "image/webp" }),
) {
  fireEvent.change(screen.getByLabelText("Activity photos"), {
    target: { files: [file] },
  });
  return file;
}

function fillStepOneFields(file?: File) {
  const selectedFile = uploadActivityPhoto(file);
  fireEvent.change(screen.getByLabelText("Activity Title"), {
    target: { value: "Traditional Tea Tasting" },
  });
  fireEvent.change(screen.getByLabelText("Description"), {
    target: { value: "Learn Korean tea etiquette." },
  });
  return selectedFile;
}

function fillStepTwoFields() {
  fireEvent.change(screen.getAllByLabelText("Available schedule")[0], {
    target: { value: "2026-07-20T10:00" },
  });
  fireEvent.change(screen.getByLabelText("Max Capacity"), {
    target: { value: "4" },
  });
  fireEvent.change(screen.getByLabelText("Price per person"), {
    target: { value: "50000" },
  });
}

async function fillStepThreeFields() {
  fireEvent.change(screen.getByLabelText("Included item"), {
    target: { value: "Tea" },
  });
  fireEvent.change(screen.getByLabelText("Meeting place name"), {
    target: { value: "Anguk Station" },
  });
  await selectGooglePlace();
}

function goToStepTwo(file?: File) {
  const selectedFile = fillStepOneFields(file);
  fireEvent.click(screen.getByRole("button", { name: "Next Step" }));
  expect(screen.getByRole("heading", { name: "Schedule & Pricing" })).toBeInTheDocument();
  return selectedFile;
}

function goToStepThree(file?: File) {
  const selectedFile = goToStepTwo(file);
  fillStepTwoFields();
  fireEvent.click(screen.getByRole("button", { name: "Next Step" }));
  expect(screen.getByRole("heading", { name: "Meeting Details" })).toBeInTheDocument();
  return selectedFile;
}

async function fillRequiredFields() {
  const file = goToStepThree();
  await fillStepThreeFields();
  return file;
}

function goToKoreanStepTwo() {
  const file = new File([new Uint8Array([1])], "tea.webp", { type: "image/webp" });
  fireEvent.change(screen.getByLabelText("액티비티 사진"), {
    target: { files: [file] },
  });
  fireEvent.change(screen.getByLabelText("액티비티 제목"), {
    target: { value: "Traditional Tea Tasting" },
  });
  fireEvent.change(screen.getByLabelText("설명"), {
    target: { value: "Learn Korean tea etiquette." },
  });
  fireEvent.click(screen.getByRole("button", { name: "다음 단계" }));
  return file;
}

function goToKoreanStepThree() {
  const file = goToKoreanStepTwo();
  fireEvent.change(screen.getAllByLabelText("가능한 일정")[0], {
    target: { value: "2026-07-20T10:00" },
  });
  fireEvent.change(screen.getByLabelText("최대 인원"), {
    target: { value: "4" },
  });
  fireEvent.change(screen.getByLabelText("1인당 가격"), {
    target: { value: "50000" },
  });
  fireEvent.click(screen.getByRole("button", { name: "다음 단계" }));
  return file;
}

describe("CreateActivityForm", () => {
  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrlMock,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrlMock,
    });
    createObjectUrlMock.mockClear();
    revokeObjectUrlMock.mockClear();
    routerMock.push.mockReset();
    routerMock.refresh.mockReset();
    routerMock.replace.mockReset();
    mockedCreateMyActivity.mockReset();
    mockedPreviewActivityPrice.mockReset();
    mockedGetMyProfile.mockReset();
    mockedGetMyProfile.mockResolvedValue({ status: "success", profile });
    mockedUploadActivityImages.mockReset();
    mockedFetchGooglePlaceDetails.mockReset();
    mockedSearchGooglePlacePredictions.mockReset();
    mockedSearchGooglePlacePredictions.mockResolvedValue([
      {
        placeId: "ChIJ-anguk",
        mainText: "Anguk Station",
        secondaryText: "Seoul, South Korea",
        text: "Anguk Station, Seoul, South Korea",
      },
    ]);
    mockedFetchGooglePlaceDetails.mockResolvedValue({
      formattedAddress: "Jongno-gu, Seoul, South Korea",
    });
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "test-google-key";
  });

  it("checks the authenticated session when the form opens", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(userKeys.me(), profile);
    renderWithQueryClient(<CreateActivityForm />, { queryClient });

    await waitFor(() => expect(mockedGetMyProfile).toHaveBeenCalledOnce());
  });

  it("puts the searchable Google place field before the guide meeting point name", () => {
    renderWithQueryClient(<CreateActivityForm />);

    goToStepThree();

    const googlePlaceSearch = screen.getByRole("textbox", { name: "Search Google place" });
    const meetingPlaceName = screen.getByRole("textbox", { name: "Meeting place name" });

    expect(
      googlePlaceSearch.compareDocumentPosition(meetingPlaceName) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("searches Google places from the first non-whitespace character", async () => {
    renderWithQueryClient(<CreateActivityForm />);

    goToStepThree();
    fireEvent.change(screen.getByRole("textbox", { name: "Search Google place" }), {
      target: { value: "A" },
    });

    await waitFor(() =>
      expect(mockedSearchGooglePlacePredictions).toHaveBeenCalledWith(
        "A",
        "test-google-key",
        expect.objectContaining({
          locale: "en",
          fetcher: expect.any(Function),
          sessionToken: expect.any(String),
        }),
      ),
    );
  });

  it("shows the selected Google place name in the search field and address below it", async () => {
    renderWithQueryClient(<CreateActivityForm />);

    goToStepThree();
    await selectGooglePlace();

    expect(screen.getByRole("textbox", { name: "Search Google place" })).toHaveValue(
      "Anguk Station",
    );
    expect(await screen.findByText("Jongno-gu, Seoul, South Korea")).toBeInTheDocument();
    expect(screen.queryByText("Anguk Station, Seoul, South Korea")).not.toBeInTheDocument();
  });

  it("uses the app locale for Google place search, details, and the map", async () => {
    renderWithQueryClient(<CreateActivityForm />, { locale: "ko" });

    goToKoreanStepThree();
    const searchInput = screen.getByRole("textbox", { name: "Google 장소 검색" });
    fireEvent.change(searchInput, { target: { value: "Anguk" } });

    await waitFor(() =>
      expect(mockedSearchGooglePlacePredictions).toHaveBeenCalledWith(
        "Anguk",
        "test-google-key",
        expect.objectContaining({
          locale: "ko",
          fetcher: expect.any(Function),
          sessionToken: expect.any(String),
        }),
      ),
    );

    fireEvent.click(await screen.findByRole("button", { name: /Anguk Station/ }));

    await waitFor(() =>
      expect(mockedFetchGooglePlaceDetails).toHaveBeenCalledWith(
        "ChIJ-anguk",
        "test-google-key",
        expect.objectContaining({
          locale: "ko",
          fetcher: expect.any(Function),
          sessionToken: expect.any(String),
        }),
      ),
    );
    expect(screen.getByTitle("만나는 장소 지도 미리보기")).toHaveAttribute(
      "src",
      "https://www.google.com/maps/embed/v1/place?key=test-google-key&q=place_id%3AChIJ-anguk&language=ko&region=KR",
    );
  });

  it("keeps the latest localized place details authoritative after a locale change", async () => {
    const englishDetails = createDeferred<GooglePlaceDetails>();
    const koreanDetails = createDeferred<GooglePlaceDetails>();
    mockedFetchGooglePlaceDetails.mockImplementation((_placeId, _apiKey, options) =>
      options.locale === "en" ? englishDetails.promise : koreanDetails.promise,
    );
    const queryClient = createQueryClient();
    const renderForm = (locale: "en" | "ko") => (
      <QueryClientProvider client={queryClient}>
        <IntlTestProvider locale={locale}>
          <CreateActivityForm />
        </IntlTestProvider>
      </QueryClientProvider>
    );
    const { rerender } = render(renderForm("en"));

    goToStepThree();
    fireEvent.change(screen.getByRole("textbox", { name: "Search Google place" }), {
      target: { value: "Anguk" },
    });
    fireEvent.click(await screen.findByRole("button", { name: /Anguk Station/ }));

    await waitFor(() => expect(mockedFetchGooglePlaceDetails).toHaveBeenCalledTimes(1));
    const autocompleteSessionToken =
      mockedSearchGooglePlacePredictions.mock.calls[0][2].sessionToken;
    expect(mockedFetchGooglePlaceDetails.mock.calls[0][2]).toEqual(
      expect.objectContaining({
        locale: "en",
        fetcher: expect.any(Function),
        sessionToken: autocompleteSessionToken,
      }),
    );

    rerender(renderForm("ko"));

    await waitFor(() => expect(mockedFetchGooglePlaceDetails).toHaveBeenCalledTimes(2));
    expect(mockedFetchGooglePlaceDetails.mock.calls[1][2]).toEqual({
      locale: "ko",
      fetcher: expect.any(Function),
    });
    expect(screen.queryByText("Seoul, South Korea")).not.toBeInTheDocument();

    await act(async () => {
      koreanDetails.resolve({ formattedAddress: "서울특별시 종로구 안국동" });
      await koreanDetails.promise;
    });

    expect(await screen.findByText("서울특별시 종로구 안국동")).toBeInTheDocument();
    expect(screen.getByTitle("만나는 장소 지도 미리보기")).toHaveAttribute(
      "src",
      "https://www.google.com/maps/embed/v1/place?key=test-google-key&q=place_id%3AChIJ-anguk&language=ko&region=KR",
    );

    await act(async () => {
      englishDetails.resolve({ formattedAddress: "Jongno-gu, Seoul, South Korea" });
      await englishDetails.promise;
    });

    expect(screen.queryByText("Jongno-gu, Seoul, South Korea")).not.toBeInTheDocument();
    expect(screen.getByText("서울특별시 종로구 안국동")).toBeInTheDocument();
    expect(screen.getByTitle("만나는 장소 지도 미리보기")).toHaveAttribute(
      "src",
      "https://www.google.com/maps/embed/v1/place?key=test-google-key&q=place_id%3AChIJ-anguk&language=ko&region=KR",
    );
  });

  it("discards autocomplete predictions from a previous locale", async () => {
    const englishPrediction: GooglePlacePrediction = {
      placeId: "ChIJ-english",
      mainText: "Anguk Station",
      secondaryText: "Jongno-gu, Seoul, South Korea",
      text: "Anguk Station, Jongno-gu, Seoul, South Korea",
    };
    const lateEnglishPredictions = createDeferred<GooglePlacePrediction[]>();
    mockedSearchGooglePlacePredictions.mockImplementation((query, _apiKey, options) => {
      if (options.locale === "en" && query === "Ang") {
        return Promise.resolve([englishPrediction]);
      }
      if (options.locale === "en") return lateEnglishPredictions.promise;
      return new Promise(() => {});
    });
    const queryClient = createQueryClient();
    const renderForm = (locale: "en" | "ko") => (
      <QueryClientProvider client={queryClient}>
        <IntlTestProvider locale={locale}>
          <CreateActivityForm />
        </IntlTestProvider>
      </QueryClientProvider>
    );
    const { rerender } = render(renderForm("en"));

    goToStepThree();
    fireEvent.change(screen.getByRole("textbox", { name: "Search Google place" }), {
      target: { value: "Ang" },
    });
    const oldEnglishPrediction = await screen.findByRole("button", {
      name: /Anguk Station.*Jongno-gu, Seoul, South Korea/,
    });

    rerender(renderForm("ko"));

    expect(
      screen.queryByRole("button", { name: /Anguk Station.*Jongno-gu, Seoul, South Korea/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(oldEnglishPrediction);
    expect(screen.queryByText("Jongno-gu, Seoul, South Korea")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Google 장소 검색" })).toHaveValue("Ang");
    expect(screen.queryByTitle("만나는 장소 지도 미리보기")).not.toBeInTheDocument();

    rerender(renderForm("en"));
    fireEvent.change(screen.getByRole("textbox", { name: "Search Google place" }), {
      target: { value: "Anguk" },
    });
    await waitFor(() =>
      expect(mockedSearchGooglePlacePredictions).toHaveBeenCalledWith(
        "Anguk",
        "test-google-key",
        expect.objectContaining({ locale: "en" }),
      ),
    );

    rerender(renderForm("ko"));
    await act(async () => {
      lateEnglishPredictions.resolve([englishPrediction]);
      await lateEnglishPredictions.promise;
    });

    expect(screen.queryByText("Jongno-gu, Seoul, South Korea")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Anguk Station/ })).not.toBeInTheDocument();
  });

  it("reuses one session token for autocomplete and terminates it after selection", async () => {
    const randomUUID = vi.spyOn(globalThis.crypto, "randomUUID");
    renderWithQueryClient(<CreateActivityForm />);

    goToStepThree();
    const searchInput = screen.getByRole("textbox", { name: "Search Google place" });
    fireEvent.change(searchInput, { target: { value: "Ang" } });
    await waitFor(() => expect(mockedSearchGooglePlacePredictions).toHaveBeenCalledTimes(1));
    fireEvent.change(searchInput, { target: { value: "Anguk" } });
    await waitFor(() => expect(mockedSearchGooglePlacePredictions).toHaveBeenCalledTimes(2));

    const firstSessionToken = mockedSearchGooglePlacePredictions.mock.calls[0][2].sessionToken;
    const secondSessionToken = mockedSearchGooglePlacePredictions.mock.calls[1][2].sessionToken;
    expect(firstSessionToken).toEqual(expect.any(String));
    expect(secondSessionToken).toBe(firstSessionToken);

    fireEvent.click(await screen.findByRole("button", { name: /Anguk Station/ }));

    await waitFor(() =>
      expect(mockedFetchGooglePlaceDetails).toHaveBeenCalledWith(
        "ChIJ-anguk",
        "test-google-key",
        expect.objectContaining({
          locale: "en",
          fetcher: expect.any(Function),
          sessionToken: firstSessionToken,
        }),
      ),
    );
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });

  it("starts a new session token after an autocomplete search is abandoned", async () => {
    renderWithQueryClient(<CreateActivityForm />);

    goToStepThree();
    const searchInput = screen.getByRole("textbox", { name: "Search Google place" });
    fireEvent.change(searchInput, { target: { value: "Ang" } });
    await waitFor(() => expect(mockedSearchGooglePlacePredictions).toHaveBeenCalledTimes(1));
    const abandonedSessionToken = mockedSearchGooglePlacePredictions.mock.calls[0][2].sessionToken;

    fireEvent.change(searchInput, { target: { value: "" } });
    fireEvent.change(searchInput, { target: { value: "Anguk" } });
    await waitFor(() => expect(mockedSearchGooglePlacePredictions).toHaveBeenCalledTimes(2));

    expect(mockedSearchGooglePlacePredictions.mock.calls[1][2].sessionToken).not.toBe(
      abandonedSessionToken,
    );
  });

  it("uses three registration steps and removes the draft action", () => {
    renderWithQueryClient(<CreateActivityForm />);

    expect(screen.getByTestId("create-activity-form")).toHaveClass("max-w-[800px]");
    expect(screen.getByTestId("create-activity-primary-fields")).toHaveClass("md:grid-cols-2");
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Activity Basics" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next Step" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save Draft" })).not.toBeInTheDocument();

    goToStepTwo();

    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous Step" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next Step" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save Draft" })).not.toBeInTheDocument();

    fillStepTwoFields();
    fireEvent.click(screen.getByRole("button", { name: "Next Step" }));

    expect(screen.getByText("Step 3 of 3")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Meeting Details" })).toBeInTheDocument();
    expect(screen.queryByText("Search Google place")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "1 included item" }).tagName).toBe("FIELDSET");
    expect(screen.getByRole("group", { name: "1 restriction" }).tagName).toBe("FIELDSET");
    expect(screen.getByRole("button", { name: "Previous Step" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Register Activity" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save Draft" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous Step" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous Step" }));

    expect(screen.getByRole("textbox", { name: "Activity Title" })).toHaveValue(
      "Traditional Tea Tasting",
    );
  });

  it.each([
    ["en", "All times are in Korea Standard Time (KST)."],
    ["ko", "모든 시간은 한국 표준시(KST) 기준입니다."],
  ] as const)("shows the Seoul time-zone notice in %s", (locale, notice) => {
    renderWithQueryClient(<CreateActivityForm />, { locale });

    if (locale === "ko") goToKoreanStepTwo();
    else goToStepTwo();

    expect(screen.getByText(notice)).toBeInTheDocument();
  });

  it("localizes every create activity field and control in Korean", async () => {
    renderWithQueryClient(<CreateActivityForm />, { locale: "ko" });

    expect(screen.getByText("3단계 중 1단계")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "액티비티 기본 정보" })).toBeInTheDocument();
    expect(screen.getByLabelText("액티비티 사진")).toBeInTheDocument();
    expect(screen.getByText("액티비티 사진 업로드")).toBeInTheDocument();
    expect(
      screen.getByText("PNG, JPG, WebP 파일을 최대 8장까지 올릴 수 있습니다."),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("예: 전통 다도 체험")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("참여자가 무엇을 하고 배우는지 설명해 주세요..."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "취소" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음 단계" })).toBeInTheDocument();

    goToKoreanStepTwo();

    expect(screen.getByText("3단계 중 2단계")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "일정 및 가격" })).toBeInTheDocument();
    expect(screen.getByText("예약 가능 일정")).toBeInTheDocument();
    expect(screen.getByText("모든 시간은 한국 표준시(KST) 기준입니다.")).toBeInTheDocument();
    expect(screen.getByLabelText("가능한 일정")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "일정 추가" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("예: 4명")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("예: 50000")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "일정 추가" }));
    expect(screen.getByRole("button", { name: "2번째 일정 삭제" })).toBeInTheDocument();

    fireEvent.change(screen.getAllByLabelText("가능한 일정")[0], {
      target: { value: "2026-07-20T10:00" },
    });
    fireEvent.change(screen.getByLabelText("최대 인원"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("1인당 가격"), { target: { value: "50000" } });
    fireEvent.click(screen.getByRole("button", { name: "다음 단계" }));

    expect(screen.getByText("3단계 중 3단계")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "만남 정보" })).toBeInTheDocument();
    expect(screen.getByText("만나는 장소")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("예: 안국역")).toBeInTheDocument();
    expect(screen.getByText("장소를 선택하면 지도가 표시됩니다.")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("예: 1번 출구 앞 메인 매표소")).toBeInTheDocument();
    expect(screen.getByText("포함 사항")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("예: 전통차 2종과 다과")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "포함 사항 추가" })).toBeInTheDocument();
    expect(screen.getByText("참여 제한")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("예: 거동이 불편한 분")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "참여 제한 추가" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "포함 사항 추가" }));
    fireEvent.click(screen.getByRole("button", { name: "참여 제한 추가" }));
    expect(screen.getByRole("button", { name: "2번째 포함 사항 삭제" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2번째 참여 제한 삭제" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이전 단계" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "액티비티 등록" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Google 장소 검색"), {
      target: { value: "Anguk" },
    });
    expect(screen.getByText("장소를 검색하는 중...")).toBeInTheDocument();
    expect(await screen.findByRole("list", { name: "Google 장소 검색 결과" })).toBeInTheDocument();
  });

  it("localizes Google fallback and payout preview copy in Korean", async () => {
    mockedPreviewActivityPrice.mockResolvedValue({
      status: "success",
      preview: {
        unitPriceKrw: 50000,
        currency: "KRW",
        commissionRate: 0.1,
        platformCommissionAmountKrw: 5000,
        estimatedGuidePayoutAmountKrw: 45000,
      },
    });
    renderWithQueryClient(<CreateActivityForm />, { locale: "ko" });
    goToKoreanStepTwo();

    const priceInput = screen.getByLabelText("1인당 가격");
    fireEvent.change(priceInput, { target: { value: "50000" } });
    fireEvent.blur(priceInput);

    expect(await screen.findByText("플랫폼 수수료 (10%)")).toBeInTheDocument();
    expect(screen.getByText("예상 정산액")).toBeInTheDocument();
    expect(screen.getByLabelText("예상 정산액: ₩45,000")).toBeInTheDocument();

    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    fireEvent.change(screen.getAllByLabelText("가능한 일정")[0], {
      target: { value: "2026-07-20T10:00" },
    });
    fireEvent.change(screen.getByLabelText("최대 인원"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "다음 단계" }));

    expect(
      screen.getByText("현재 Google 장소 검색을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요."),
    ).toBeInTheDocument();
  });

  it("presents stable create validation and dialog copy in Korean", async () => {
    renderWithQueryClient(<CreateActivityForm />, { locale: "ko" });

    fireEvent.click(screen.getByRole("button", { name: "다음 단계" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "액티비티 사진을 한 장 이상 선택해 주세요.",
    );

    const file = new File([new Uint8Array([1])], "tea.webp", { type: "image/webp" });
    fireEvent.change(screen.getByLabelText("액티비티 사진"), { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText("설명"), { target: { value: "설명" } });
    fireEvent.click(screen.getByRole("button", { name: "다음 단계" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("액티비티 제목을 입력해 주세요.");

    fireEvent.change(screen.getByLabelText("액티비티 제목"), { target: { value: "Tea" } });
    fireEvent.click(screen.getByRole("button", { name: "다음 단계" }));
    fireEvent.change(screen.getByLabelText("최대 인원"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("1인당 가격"), { target: { value: "50000" } });
    fireEvent.click(screen.getByRole("button", { name: "다음 단계" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("일정을 한 개 이상 추가해 주세요.");

    fireEvent.change(screen.getByLabelText("가능한 일정"), {
      target: { value: "2026-07-20T10:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "다음 단계" }));
    fireEvent.change(screen.getByLabelText("만나는 장소 이름"), {
      target: { value: "Anguk Station" },
    });
    fireEvent.change(screen.getByLabelText("포함 사항"), { target: { value: "Tea" } });
    fireEvent.click(screen.getByRole("button", { name: "액티비티 등록" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "검색 결과에서 Google 장소를 선택해 주세요.",
    );

    await selectGooglePlace("Google 장소 검색");
    fireEvent.click(screen.getByRole("button", { name: "액티비티 등록" }));
    expect(screen.getByRole("heading", { name: "이 액티비티를 등록할까요?" })).toBeInTheDocument();
    expect(screen.getByText("등록 후에는 액티비티를 수정할 수 없습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "등록" })).toBeInTheDocument();
  });

  it("localizes the discard dialog in Korean", () => {
    renderWithQueryClient(<CreateActivityForm />, { locale: "ko" });

    fireEvent.change(screen.getByLabelText("액티비티 제목"), { target: { value: "Tea" } });
    fireEvent.click(screen.getByRole("button", { name: "뒤로 가기" }));

    expect(
      screen.getByRole("heading", { name: "이 액티비티 작성을 취소할까요?" }),
    ).toBeInTheDocument();
    expect(screen.getByText("입력한 내용이 모두 사라집니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "작성 취소" })).toBeInTheDocument();
  });

  it("shows the server-calculated commission and payout after the price input loses focus", async () => {
    mockedPreviewActivityPrice.mockResolvedValue({
      status: "success",
      preview: {
        unitPriceKrw: 50000,
        currency: "KRW",
        commissionRate: 0.1,
        platformCommissionAmountKrw: 5000,
        estimatedGuidePayoutAmountKrw: 45000,
      },
    });
    renderWithQueryClient(<CreateActivityForm />);
    goToStepTwo();

    const priceInput = screen.getByLabelText("Price per person");
    fireEvent.change(priceInput, { target: { value: "50000" } });
    fireEvent.blur(priceInput);

    expect(await screen.findByText("Platform fee (10%)")).toBeInTheDocument();
    expect(mockedPreviewActivityPrice).toHaveBeenCalledWith({ price: 50000, currency: "KRW" });
    expect(screen.getByText("₩5,000")).toBeInTheDocument();
    expect(screen.getByText("Estimated payout")).toBeInTheDocument();
    expect(screen.getByText("₩45,000")).toBeInTheDocument();
  });

  it("shows the price preview API error without leaving the pricing step", async () => {
    mockedPreviewActivityPrice.mockResolvedValue({
      status: "error",
      error: new ApiClientError({
        code: "USER500_BUDDY_PROFILE",
        status: 500,
        details: null,
        backendMessage: "버디 프로필 정보를 찾을 수 없습니다.",
        fallbackMessage: "버디 프로필 설정이 올바르지 않습니다.",
      }),
    });
    renderWithQueryClient(<CreateActivityForm />);
    goToStepTwo();

    const priceInput = screen.getByLabelText("Price per person");
    fireEvent.change(priceInput, { target: { value: "50000" } });
    fireEvent.blur(priceInput);

    expect(await screen.findByRole("alert", { name: "Price preview error" })).toHaveTextContent(
      "Complete the required buddy profile settings before continuing.",
    );
    expect(screen.queryByText("버디 프로필 정보를 찾을 수 없습니다.")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Schedule & Pricing" })).toBeInTheDocument();
  });

  it("shows a localized schedule error when activity registration fails", async () => {
    mockedUploadActivityImages.mockResolvedValue([
      {
        uploadUrl: "https://bucket.s3.amazonaws.com/activities/tea.webp?signed",
        imageKey: "activities/2026/07/07/tea.webp",
        imageUrl: "https://static.hanbuddy.com/activities/tea.webp",
        expiresInSeconds: 300,
      },
    ]);
    mockedCreateMyActivity.mockResolvedValue({
      status: "error",
      error: new ApiClientError({
        code: "ACTIVITY_SCHEDULE400_START_AT",
        status: 400,
        details: null,
        backendMessage: "시작 시간은 현재 시간 이후여야 합니다.",
        fallbackMessage: "액티비티를 등록하지 못했습니다.",
      }),
    });
    renderWithQueryClient(<CreateActivityForm />);

    await fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Register Activity" }));
    confirmRegisterInDialog();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Activity schedules must start in the future.",
    );
    expect(screen.queryByText("시작 시간은 현재 시간 이후여야 합니다.")).not.toBeInTheDocument();
  });

  it("uploads activity images and creates a published activity", async () => {
    mockedUploadActivityImages.mockResolvedValue([
      {
        uploadUrl: "https://bucket.s3.amazonaws.com/activities/tea.webp?signed",
        imageKey: "activities/2026/07/07/tea.webp",
        imageUrl: "https://static.hanbuddy.com/activities/tea.webp",
        expiresInSeconds: 300,
      },
    ]);
    mockedCreateMyActivity.mockResolvedValue({
      status: "success",
      activity: {
        activityId: 42,
        title: "Traditional Tea Tasting",
        description: "Learn Korean tea etiquette.",
        thumbnailImageUrl: null,
        status: "ACTIVE",
        includedItems: ["Tea"],
        restrictionNotes: ["No caffeine sensitivity"],
        maxCapacity: 4,
        price: 50000,
        currency: "KRW",
        meetingPointName: "Anguk Station",
        meetingPlaceId: "ChIJ-anguk",
        images: [],
        schedules: [],
      },
    });

    const { queryClient } = renderWithQueryClient(<CreateActivityForm />);
    queryClient.setQueryData(buddyKeys.myActivities(), []);

    const file = await fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Restriction"), {
      target: { value: "No caffeine sensitivity" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Register Activity" }));
    confirmRegisterInDialog();

    await waitFor(() => expect(mockedUploadActivityImages).toHaveBeenCalledWith([file]));
    expect(mockedCreateMyActivity).toHaveBeenCalledWith({
      title: "Traditional Tea Tasting",
      description: "Learn Korean tea etiquette.",
      imageKeys: ["activities/2026/07/07/tea.webp"],
      includedItems: ["Tea"],
      restrictionNotes: ["No caffeine sensitivity"],
      maxCapacity: 4,
      price: 50000,
      currency: "KRW",
      meetingPointName: "Anguk Station",
      meetingPlaceId: "ChIJ-anguk",
      status: "ACTIVE",
      schedules: [{ startAt: "2026-07-20T10:00:00+09:00" }],
    });
    expect(routerMock.push).toHaveBeenCalledWith("/en/my-activities");
    expect(queryClient.getQueryState(buddyKeys.myActivities())?.isInvalidated).toBe(true);
  });

  it("previews selected activity photos and removes deleted photos before uploading", async () => {
    const marketFile = new File([new Uint8Array([2])], "market.webp", { type: "image/webp" });
    mockedUploadActivityImages.mockResolvedValue([
      {
        uploadUrl: "https://bucket.s3.amazonaws.com/activities/market.webp?signed",
        imageKey: "activities/2026/07/07/market.webp",
        imageUrl: "https://static.hanbuddy.com/activities/market.webp",
        expiresInSeconds: 300,
      },
    ]);
    mockedCreateMyActivity.mockResolvedValue({
      status: "success",
      activity: {
        activityId: 42,
        title: "Traditional Tea Tasting",
        description: "Learn Korean tea etiquette.",
        thumbnailImageUrl: null,
        status: "ACTIVE",
        includedItems: ["Tea"],
        restrictionNotes: [],
        maxCapacity: 4,
        price: 50000,
        currency: "KRW",
        meetingPointName: "Anguk Station",
        meetingPlaceId: "ChIJ-anguk",
        images: [],
        schedules: [],
      },
    });

    renderWithQueryClient(<CreateActivityForm />);

    const teaFile = new File([new Uint8Array([1])], "tea.webp", { type: "image/webp" });
    const fileInput = screen.getByLabelText("Activity photos");
    fireEvent.change(fileInput, { target: { files: [teaFile] } });
    fireEvent.change(fileInput, { target: { files: [marketFile] } });

    expect(screen.getByRole("img", { name: "tea.webp" })).toHaveAttribute("src", "blob:tea.webp");
    expect(screen.getByRole("img", { name: "market.webp" })).toHaveAttribute(
      "src",
      "blob:market.webp",
    );
    expect(screen.getByText("2 selected")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove photo tea.webp" }));

    expect(screen.queryByRole("img", { name: "tea.webp" })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "market.webp" })).toBeInTheDocument();
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    expect(revokeObjectUrlMock).toHaveBeenCalledWith("blob:tea.webp");

    fireEvent.change(screen.getByLabelText("Activity Title"), {
      target: { value: "Traditional Tea Tasting" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Learn Korean tea etiquette." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next Step" }));
    fillStepTwoFields();
    fireEvent.click(screen.getByRole("button", { name: "Next Step" }));
    await fillStepThreeFields();

    fireEvent.click(screen.getByRole("button", { name: "Register Activity" }));
    confirmRegisterInDialog();

    await waitFor(() => expect(mockedUploadActivityImages).toHaveBeenCalledWith([marketFile]));
  });

  it("blocks moving past the first step until at least one activity photo is selected", async () => {
    renderWithQueryClient(<CreateActivityForm />);

    fireEvent.change(screen.getByLabelText("Activity Title"), {
      target: { value: "Traditional Tea Tasting" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Learn Korean tea etiquette." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Next Step" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please select at least one activity photo.",
    );
    expect(screen.getByRole("heading", { name: "Activity Basics" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockedUploadActivityImages).not.toHaveBeenCalled();
    expect(mockedCreateMyActivity).not.toHaveBeenCalled();
  });

  it.each(CREATE_ACTIVITY_VALIDATION_CASES)(
    "returns the stable %s validation key",
    (expectedKey, overrides) => {
      const input: CreateActivityValidationInput = {
        step: 1,
        selectedPhotoCount: 1,
        title: "Tea",
        description: "Tea tasting",
        scheduleDateTimes: ["2026-07-20T10:00"],
        maxCapacity: "4",
        price: "50000",
        meetingPlaceId: "ChIJ-anguk",
        meetingPointName: "Anguk Station",
        includedItems: ["Tea"],
        ...overrides,
      };

      expect(validateCreateActivityStep(input)).toBe(expectedKey);
    },
  );

  it("maps image upload failures to localized copy without exposing the thrown error", async () => {
    mockedUploadActivityImages.mockRejectedValue(
      new ApiClientError({
        code: "IMAGE400_COUNT",
        status: 400,
        details: null,
        backendMessage: "이미지는 최대 8개까지 업로드할 수 있습니다.",
        fallbackMessage: "액티비티 사진을 업로드하지 못했습니다.",
      }),
    );
    renderWithQueryClient(<CreateActivityForm />, { locale: "ko" });

    goToKoreanStepThree();
    fireEvent.change(screen.getByLabelText("포함 사항"), { target: { value: "Tea" } });
    fireEvent.change(screen.getByLabelText("만나는 장소 이름"), {
      target: { value: "Anguk Station" },
    });
    await selectGooglePlace("Google 장소 검색");
    fireEvent.click(screen.getByRole("button", { name: "액티비티 등록" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "등록" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "업로드할 수 있는 이미지 개수를 초과했습니다.",
    );
    expect(
      screen.queryByText("이미지는 최대 8개까지 업로드할 수 있습니다."),
    ).not.toBeInTheDocument();
    expect(mockedCreateMyActivity).not.toHaveBeenCalled();
  });

  it("redirects to login and resets the upload state when image upload is unauthenticated", async () => {
    mockedUploadActivityImages.mockRejectedValue(new UnauthenticatedQueryError());
    renderWithQueryClient(<CreateActivityForm />);

    await fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Register Activity" }));
    confirmRegisterInDialog();

    await waitFor(() => {
      expect(routerMock.replace).toHaveBeenCalledWith("/en/login");
    });
    expect(routerMock.refresh).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Register Activity" })).toBeEnabled();
    expect(mockedCreateMyActivity).not.toHaveBeenCalled();
  });

  it("does not publish when the confirmation is cancelled", async () => {
    renderWithQueryClient(<CreateActivityForm />);

    await fillRequiredFields();

    fireEvent.click(screen.getByRole("button", { name: "Register Activity" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockedUploadActivityImages).not.toHaveBeenCalled();
    expect(mockedCreateMyActivity).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("leaves immediately when going back with an untouched form", () => {
    renderWithQueryClient(<CreateActivityForm />);

    fireEvent.click(screen.getByRole("button", { name: "Go back" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(routerMock.push).toHaveBeenCalledWith("/en/my-activities");
  });

  it("asks for confirmation before discarding entered input", () => {
    renderWithQueryClient(<CreateActivityForm />);

    fireEvent.change(screen.getByLabelText("Activity Title"), {
      target: { value: "Traditional Tea Tasting" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));

    expect(routerMock.push).not.toHaveBeenCalled();
    expect(screen.getByText("Your changes will be lost.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(routerMock.push).toHaveBeenCalledWith("/en/my-activities");
  });

  it("keeps the form when the discard confirmation is cancelled", () => {
    renderWithQueryClient(<CreateActivityForm />);

    fireEvent.change(screen.getByLabelText("Activity Title"), {
      target: { value: "Traditional Tea Tasting" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));

    expect(routerMock.push).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Activity Title")).toHaveValue("Traditional Tea Tasting");
  });

  it("ignores the back button while a submission is in progress", async () => {
    mockedUploadActivityImages.mockReturnValue(new Promise(() => {}));

    renderWithQueryClient(<CreateActivityForm />);

    await fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Register Activity" }));
    confirmRegisterInDialog();

    expect(screen.getByRole("button", { name: "Uploading photos..." })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("shows the registration state after images finish uploading", async () => {
    mockedUploadActivityImages.mockResolvedValue([
      {
        uploadUrl: "https://bucket.s3.amazonaws.com/activities/tea.webp?signed",
        imageKey: "activities/2026/07/07/tea.webp",
        imageUrl: "https://static.hanbuddy.com/activities/tea.webp",
        expiresInSeconds: 300,
      },
    ]);
    mockedCreateMyActivity.mockReturnValue(new Promise(() => {}));
    renderWithQueryClient(<CreateActivityForm />);

    await fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Register Activity" }));
    confirmRegisterInDialog();

    expect(await screen.findByRole("button", { name: "Registering..." })).toBeDisabled();
  });

  it("warns on page unload only while the form is dirty", () => {
    renderWithQueryClient(<CreateActivityForm />);

    const cleanEvent = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(cleanEvent);
    expect(cleanEvent.defaultPrevented).toBe(false);

    fireEvent.change(screen.getByLabelText("Activity Title"), {
      target: { value: "Traditional Tea Tasting" },
    });

    const dirtyEvent = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(dirtyEvent);
    expect(dirtyEvent.defaultPrevented).toBe(true);
  });

  it("builds schedules from datetime rows and skips empty rows", async () => {
    mockedUploadActivityImages.mockResolvedValue([
      {
        uploadUrl: "https://bucket.s3.amazonaws.com/activities/tea.webp?signed",
        imageKey: "activities/2026/07/07/tea.webp",
        imageUrl: "https://static.hanbuddy.com/activities/tea.webp",
        expiresInSeconds: 300,
      },
    ]);
    mockedCreateMyActivity.mockResolvedValue({
      status: "success",
      activity: {
        activityId: 42,
        title: "Traditional Tea Tasting",
        description: "Learn Korean tea etiquette.",
        thumbnailImageUrl: null,
        status: "ACTIVE",
        includedItems: ["Tea"],
        restrictionNotes: [],
        maxCapacity: 4,
        price: 50000,
        currency: "KRW",
        meetingPointName: "Anguk Station",
        meetingPlaceId: "ChIJ-anguk",
        images: [],
        schedules: [],
      },
    });

    renderWithQueryClient(<CreateActivityForm />);

    goToStepTwo();
    fireEvent.click(screen.getByRole("button", { name: "Add time slot" }));
    fireEvent.click(screen.getByRole("button", { name: "Add time slot" }));

    const scheduleInputs = screen.getAllByLabelText("Available schedule");
    fireEvent.change(scheduleInputs[0], { target: { value: "2026-07-20T10:00" } });
    fireEvent.change(scheduleInputs[2], { target: { value: "2026-07-22T14:00" } });
    fireEvent.change(screen.getByLabelText("Max Capacity"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Price per person"), {
      target: { value: "50000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next Step" }));
    await fillStepThreeFields();

    fireEvent.click(screen.getByRole("button", { name: "Register Activity" }));
    confirmRegisterInDialog();

    await waitFor(() =>
      expect(mockedCreateMyActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          schedules: [
            { startAt: "2026-07-20T10:00:00+09:00" },
            { startAt: "2026-07-22T14:00:00+09:00" },
          ],
        }),
      ),
    );
  });

  it("removes added list rows before submitting", async () => {
    mockedUploadActivityImages.mockResolvedValue([
      {
        uploadUrl: "https://bucket.s3.amazonaws.com/activities/tea.webp?signed",
        imageKey: "activities/2026/07/07/tea.webp",
        imageUrl: "https://static.hanbuddy.com/activities/tea.webp",
        expiresInSeconds: 300,
      },
    ]);
    mockedCreateMyActivity.mockResolvedValue({
      status: "success",
      activity: {
        activityId: 42,
        title: "Traditional Tea Tasting",
        description: "Learn Korean tea etiquette.",
        thumbnailImageUrl: null,
        status: "ACTIVE",
        includedItems: ["Tea"],
        restrictionNotes: [],
        maxCapacity: 4,
        price: 50000,
        currency: "KRW",
        meetingPointName: "Anguk Station",
        meetingPlaceId: "ChIJ-anguk",
        images: [],
        schedules: [],
      },
    });

    renderWithQueryClient(<CreateActivityForm />);

    goToStepTwo();
    fillStepTwoFields();
    fireEvent.click(screen.getByRole("button", { name: "Add time slot" }));
    fireEvent.change(screen.getAllByLabelText("Available schedule")[1], {
      target: { value: "2026-07-21T11:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Remove time slot 2" }));
    expect(screen.getAllByLabelText("Available schedule")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Next Step" }));
    await fillStepThreeFields();
    fireEvent.click(screen.getByRole("button", { name: "Add item" }));
    fireEvent.change(screen.getAllByLabelText("Included item")[1], {
      target: { value: "Extra snack" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add restriction" }));
    fireEvent.change(screen.getAllByLabelText("Restriction")[1], {
      target: { value: "No nut allergies" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove included item 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove restriction 2" }));

    expect(screen.getAllByLabelText("Included item")).toHaveLength(1);
    expect(screen.getAllByLabelText("Restriction")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Register Activity" }));
    confirmRegisterInDialog();

    await waitFor(() =>
      expect(mockedCreateMyActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          includedItems: ["Tea"],
          restrictionNotes: [],
          schedules: [{ startAt: "2026-07-20T10:00:00+09:00" }],
        }),
      ),
    );
  });

  it("shows hover background feedback on add row buttons", () => {
    renderWithQueryClient(<CreateActivityForm />);

    goToStepTwo();
    expect(screen.getByRole("button", { name: "Add time slot" })).toHaveClass(
      "hover:bg-primary-soft",
    );
    fillStepTwoFields();
    fireEvent.click(screen.getByRole("button", { name: "Next Step" }));

    expect(screen.getByRole("button", { name: "Add item" })).toHaveClass("hover:bg-primary-soft");
    expect(screen.getByRole("button", { name: "Add restriction" })).toHaveClass(
      "hover:bg-primary-soft",
    );
  });

  it("puts remove buttons inside rows from the second dynamic row onward", () => {
    renderWithQueryClient(<CreateActivityForm />);

    goToStepTwo();
    fireEvent.click(screen.getByRole("button", { name: "Add time slot" }));
    expect(screen.queryByRole("button", { name: "Remove time slot 1" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove time slot 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove time slot 2" })).toHaveClass(
      "absolute",
      "right-2",
    );
    expect(screen.getAllByLabelText("Available schedule")).toHaveLength(2);

    fillStepTwoFields();
    fireEvent.click(screen.getByRole("button", { name: "Next Step" }));
    fireEvent.click(screen.getByRole("button", { name: "Add item" }));
    fireEvent.click(screen.getByRole("button", { name: "Add restriction" }));

    expect(
      screen.queryByRole("button", { name: "Remove included item 1" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove included item 2" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove restriction 1" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove restriction 2" })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Remove included item 2" })).toHaveClass(
      "absolute",
      "right-2",
    );
    expect(screen.getByRole("button", { name: "Remove restriction 2" })).toHaveClass(
      "absolute",
      "right-2",
    );
  });
});
