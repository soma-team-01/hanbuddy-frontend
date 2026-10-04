import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { usePathname, useRouter } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { createMyActivity, getMyActivity, updateMyActivity } from "@/lib/api/buddy";
import { createReferralActivity, updateReferralActivity } from "@/lib/api/referral";
import { createApiClientError } from "@/lib/api/errors";
import { getSeoulDateTimeParts } from "@/lib/datetime";
import { buddyKeys } from "@/lib/query/buddy";
import type { MyActivityDetailResponse } from "@/types/buddy";
import {
  fetchGooglePlaceDetailsViaBff,
  searchGooglePlacePredictionsViaBff,
} from "@/lib/google/places";
import { uploadActivityImageSet } from "@/lib/images/presigned";
import { buildDraftFromMyActivityDetail, EMPTY_ACTIVITY_DRAFT } from "./activity-create-wizard";
import {
  clearActivityCreateDraft,
  loadActivityCreateDraft,
  saveActivityCreateDraft,
} from "./activity-create-draft-storage";
import { buildActivityUpsertRequest, CreateActivityForm } from "./create-activity-form";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock("@/lib/google/places", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/google/places")>()),
  getGoogleMapsApiKey: () => "test-google-key",
  buildGoogleMapsEmbedUrl: (placeId: string) =>
    placeId ? `https://maps.example.test/${placeId}` : "",
  searchGooglePlacePredictionsViaBff: vi.fn().mockResolvedValue([
    {
      placeId: "ChIJ-gwangjang",
      mainText: "Gwangjang Market",
      secondaryText: "Jongno-gu, Seoul",
      text: "Gwangjang Market, Jongno-gu, Seoul",
    },
  ]),
  fetchGooglePlaceDetailsViaBff: vi.fn().mockResolvedValue({
    formattedAddress: "88 Changgyeonggung-ro, Jongno-gu, Seoul",
    latitude: 37.5701,
    longitude: 126.9996,
  }),
  fetchGooglePlaceDetails: vi.fn().mockResolvedValue({
    formattedAddress: "88 Changgyeonggung-ro, Jongno-gu, Seoul",
    latitude: 37.5701,
    longitude: 126.9996,
  }),
}));

vi.mock("@/lib/images/presigned", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/images/presigned")>()),
  uploadActivityImageSet: vi.fn(),
}));

vi.mock("@/lib/api/buddy", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/buddy")>()),
  createMyActivity: vi.fn(),
  updateMyActivity: vi.fn(),
  getMyActivity: vi.fn(),
}));

vi.mock("@/lib/api/referral", () => ({
  createReferralActivity: vi.fn(),
  updateReferralActivity: vi.fn(),
}));

vi.mock("@/lib/api/useMyProfile", () => ({
  useMyProfile: () => ({
    status: "success",
    profile: {
      userId: 17,
      name: "Jihoon Kim",
      displayName: "Seoul Buddy",
      profileImageUrl: null,
    },
  }),
}));

vi.mock("./activity-create-draft-storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./activity-create-draft-storage")>()),
  clearActivityCreateDraft: vi.fn().mockResolvedValue(undefined),
  loadActivityCreateDraft: vi.fn().mockResolvedValue(null),
  saveActivityCreateDraft: vi.fn().mockResolvedValue(undefined),
}));

const mockedUsePathname = vi.mocked(usePathname);
const mockedUseRouter = vi.mocked(useRouter);
const mockedSearchGooglePlacePredictions = vi.mocked(searchGooglePlacePredictionsViaBff);
const mockedFetchGooglePlaceDetails = vi.mocked(fetchGooglePlaceDetailsViaBff);
const mockedUploadActivityImageSet = vi.mocked(uploadActivityImageSet);
const mockedCreateMyActivity = vi.mocked(createMyActivity);
const mockedUpdateMyActivity = vi.mocked(updateMyActivity);
const mockedClearActivityCreateDraft = vi.mocked(clearActivityCreateDraft);
const mockedLoadActivityCreateDraft = vi.mocked(loadActivityCreateDraft);
const mockedSaveActivityCreateDraft = vi.mocked(saveActivityCreateDraft);

const createObjectUrlMock = vi.fn((file: Blob) =>
  file instanceof File ? `blob:${file.name}` : "blob:preview",
);
const revokeObjectUrlMock = vi.fn();
const routerPush = vi.fn();
const routerReplace = vi.fn();

// UTC는 9월, 한국은 10월인 월 경계를 고정해 실행 날짜에 의존하지 않는다.
const CALENDAR_TEST_NOW = "2026-09-30T15:30:00Z";
// 화면과 같은 한국 날짜를 달력 연산용 UTC 자정으로 표현한다.
const calendarToday = new Date(`${getSeoulDateTimeParts(CALENDAR_TEST_NOW)!.date}T00:00:00Z`);
const calendarYear = calendarToday.getUTCFullYear();
const calendarMonth = calendarToday.getUTCMonth();
const scheduleDateA = new Date(Date.UTC(calendarYear, calendarMonth + 1, 15));
const scheduleDateB = new Date(Date.UTC(calendarYear, calendarMonth + 1, 22));
const pastProbeDate = new Date(Date.UTC(calendarYear, calendarMonth - 1, 15));
const dateKeyA = scheduleDateA.toISOString().slice(0, 10);

function calendarLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

const labelA = calendarLabel(scheduleDateA);
const labelB = calendarLabel(scheduleDateB);

function clickNext() {
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
}

function clickEditorNext() {
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Next" }));
}

async function fillStepsUntilSchedule(reorder = false) {
  fireEvent.change(screen.getByRole("textbox", { name: "About you" }), {
    target: { value: "I have guided friends through this market for years." },
  });
  clickNext();

  fireEvent.change(screen.getByRole("textbox", { name: "Experience name" }), {
    target: { value: "Seoul market walk" },
  });
  clickNext();

  fireEvent.change(screen.getByRole("textbox", { name: "Detailed description" }), {
    target: { value: "Meet local vendors and taste a neighborhood breakfast together." },
  });
  clickNext();

  const photos = Array.from(
    { length: 3 },
    (_, index) =>
      new File([new Uint8Array([index])], `market-${index}.webp`, { type: "image/webp" }),
  );
  fireEvent.change(screen.getByLabelText("Upload experience photos"), {
    target: { files: photos },
  });
  if (reorder) {
    const handle = screen.getByRole("button", { name: "Move photo 3" });
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
  }
  clickNext();

  fireEvent.click(screen.getByRole("button", { name: "Add an item" }));
  fireEvent.change(screen.getByLabelText("Upload a photo for activity 1"), {
    target: { files: [photos[0]] },
  });
  clickEditorNext();
  fireEvent.change(screen.getByRole("textbox", { name: "Activity title" }), {
    target: { value: "Meet market vendors" },
  });
  clickEditorNext();
  fireEvent.change(screen.getByRole("textbox", { name: "What guests will do" }), {
    target: { value: "Taste three breakfast dishes with local vendors." },
  });
  clickEditorNext();
  fireEvent.change(screen.getByRole("spinbutton", { name: "Duration in minutes" }), {
    target: { value: "60" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Done" }));
  clickNext();

  fireEvent.change(screen.getByRole("combobox", { name: "Search address" }), {
    target: { value: "Gwangjang" },
  });
  fireEvent.click(
    await screen.findByRole("button", { name: /Gwangjang Market.*Jongno-gu, Seoul/ }),
  );
  await waitFor(() => expect(mockedFetchGooglePlaceDetails).toHaveBeenCalled());
  fireEvent.change(screen.getByRole("textbox", { name: "Meeting place name" }), {
    target: { value: "Gwangjang Market Gate 2" },
  });
  clickNext();

  expect(screen.getByRole("heading", { name: "Set dates and start times" })).toBeInTheDocument();
}

async function completeAllStepsUntilReview(reorder = false) {
  await fillStepsUntilSchedule(reorder);

  fireEvent.click(screen.getByRole("button", { name: "Next month" }));
  fireEvent.click(screen.getByRole("button", { name: `Select ${labelA}` }));
  fireEvent.change(screen.getByLabelText("Hour (1–12)"), { target: { value: "10" } });
  fireEvent.change(screen.getByLabelText("Minute (0–59)"), { target: { value: "00" } });
  fireEvent.click(screen.getByRole("button", { name: "Add time" }));
  clickNext();

  clickNext();

  fireEvent.change(screen.getByRole("textbox", { name: "Price per person" }), {
    target: { value: "50000" },
  });
  clickNext();

  clickNext();

  fireEvent.click(screen.getByRole("button", { name: "Equipment rental" }));
  clickNext();

  fireEvent.click(screen.getByRole("checkbox", { name: /Nothing guests need to know/ }));
  clickNext();

  expect(screen.getByRole("heading", { name: "Preview your experience" })).toBeInTheDocument();
}

describe("CreateActivityForm", () => {
  it.each([false, true])(
    "navigates back from the mobile footer without losing input (referral=%s)",
    (referral) => {
      renderWithQueryClient(<CreateActivityForm referral={referral} />);
      const footer = screen.getByRole("contentinfo");
      expect(screen.getByRole("heading", { level: 1 })).toHaveClass("text-xl", "lg:text-3xl");
      expect(footer).toHaveClass("pt-2");
      const back = within(footer).getByRole("button", { name: "Back" });
      expect(back).toHaveClass("lg:hidden");
      expect(back).toBeDisabled();
      fireEvent.change(screen.getByRole("textbox", { name: "About you" }), {
        target: { value: "I have guided friends through this market for years." },
      });
      clickNext();
      fireEvent.change(screen.getByRole("textbox", { name: "Experience name" }), {
        target: { value: "Seoul market walk" },
      });
      fireEvent.click(back);
      expect(screen.getByRole("textbox", { name: "About you" })).toHaveValue(
        "I have guided friends through this market for years.",
      );
      expect(back).toBeDisabled();
      clickNext();
      expect(screen.getByRole("textbox", { name: "Experience name" })).toHaveValue(
        "Seoul market walk",
      );
    },
  );
  it.each(["create", "edit"] as const)(
    "shows Exit without a language selector in %s mode",
    (mode) => {
      renderWithQueryClient(
        <CreateActivityForm
          mode={mode}
          activityId={mode === "edit" ? "42" : undefined}
          initialDraft={
            mode === "edit" ? buildDraftFromMyActivityDetail(buildEditDetail()) : undefined
          }
        />,
      );
      expect(screen.getByRole("link", { name: "Exit" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Select language/ })).not.toBeInTheDocument();
    },
  );
  it("creates a referral with a starting price but no discounts or payment fields", async () => {
    vi.mocked(createReferralActivity).mockResolvedValue({
      status: "success",
      data: { activityId: 42 } as MyActivityDetailResponse,
    });
    renderWithQueryClient(<CreateActivityForm referral invitationCode={"a".repeat(43)} />);
    await fillStepsUntilSchedule();
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    fireEvent.click(screen.getByRole("button", { name: `Select ${labelA}` }));
    fireEvent.change(screen.getByLabelText("Hour (1–12)"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Minute (0–59)"), { target: { value: "00" } });
    fireEvent.click(screen.getByRole("button", { name: "Add time" }));
    clickNext();
    clickNext();
    expect(screen.queryByRole("textbox", { name: "Price per person" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Set the minimum service price" }),
    ).toBeInTheDocument();
    const minimumPrice = screen.getByRole("textbox", { name: "Minimum service price" });
    clickNext();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a whole amount from ₩0 to ₩9,999,999,999.",
    );
    fireEvent.change(minimumPrice, { target: { value: "5000" } });
    clickNext();
    fireEvent.click(screen.getByRole("button", { name: "Equipment rental" }));
    clickNext();
    fireEvent.click(screen.getByRole("checkbox", { name: /Nothing guests need to know/ }));
    clickNext();
    expect(screen.getByText("₩5,000~")).toBeInTheDocument();
    expect(screen.queryByText("Agreed with provider")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Register experience" }));
    await waitFor(() => expect(createReferralActivity).toHaveBeenCalledTimes(1));
    const [code, body] = vi.mocked(createReferralActivity).mock.calls[0];
    expect(code).toHaveLength(43);
    expect(body).toMatchObject({
      status: "ACTIVE",
      price: 5000,
      maxCapacity: 1,
      schedules: [{ startAt: `${dateKeyA}T10:00:00+09:00`, maxCapacity: 1 }],
    });
    for (const key of ["currency", "discountPercent", "discountEndDate", "activityType", "buddyId"])
      expect(body).not.toHaveProperty(key);
    expect(body.imageKeys).toHaveLength(3);
    expect(body.itineraries).toHaveLength(1);
    expect(mockedCreateMyActivity).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(mockedClearActivityCreateDraft).toHaveBeenCalledWith("referral:create"),
    );
  });

  it.each([0, 5000])(
    "preserves referral price %s when editing without an invitation wrapper",
    async (price) => {
      vi.mocked(updateReferralActivity).mockResolvedValue({
        status: "success",
        data: { activityId: 42 } as MyActivityDetailResponse,
      });
      const detail = { ...buildEditDetail(), price, activityType: "REFERRAL" as const };
      renderWithQueryClient(
        <CreateActivityForm
          referral
          mode="edit"
          activityId="42"
          initialDraft={buildDraftFromMyActivityDetail(detail)}
          initialStatus="ACTIVE"
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
      await waitFor(() => expect(updateReferralActivity).toHaveBeenCalledTimes(1));
      expect(vi.mocked(updateReferralActivity).mock.calls[0][1]).toHaveProperty("price", price);
      expect(vi.mocked(updateReferralActivity).mock.calls[0][1]).not.toHaveProperty("code");
      expect(mockedUpdateMyActivity).not.toHaveBeenCalled();
    },
  );
  it("ignores the second click after entering preview instead of publishing", async () => {
    renderWithQueryClient(<CreateActivityForm />);
    await completeAllStepsUntilReview();
    const submit = screen.getByRole("button", { name: "Register experience" });
    fireEvent.click(submit, { detail: 2 });
    expect(fireEvent.keyDown(submit, { key: "Enter", repeat: true })).toBe(false);
    expect(mockedUploadActivityImageSet).not.toHaveBeenCalled();
    expect(mockedCreateMyActivity).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Preview your experience" })).toBeInTheDocument();
  });
  it("uploads and registers only once after a first click, second click and repeated Enter", async () => {
    const uploadGate = Promise.withResolvers<void>();
    const registrationGate = Promise.withResolvers<void>();
    const uploadImplementation = mockedUploadActivityImageSet.getMockImplementation()!;
    const registrationImplementation = mockedCreateMyActivity.getMockImplementation()!;
    mockedUploadActivityImageSet.mockImplementation(async (...args) => {
      await uploadGate.promise;
      return uploadImplementation(...args);
    });
    mockedCreateMyActivity.mockImplementation(async (...args) => {
      await registrationGate.promise;
      return registrationImplementation(...args);
    });

    renderWithQueryClient(<CreateActivityForm />);
    await completeAllStepsUntilReview();
    const submit = screen.getByRole("button", { name: "Register experience" });

    // Keep events in one batch to cover requests queued before disabled is rendered.
    act(() => {
      fireEvent.click(submit, { detail: 1 });
      fireEvent.click(submit, { detail: 2 });
      for (let repeat = 0; repeat < 3; repeat += 1) {
        expect(fireEvent.keyDown(submit, { key: "Enter", repeat: true })).toBe(false);
      }
      fireEvent.click(submit, { detail: 0 }); // An already queued keyboard activation.
    });
    expect(submit).toBeDisabled();
    expect(routerReplace).not.toHaveBeenCalled();
    expect(mockedUploadActivityImageSet).toHaveBeenCalledTimes(1);
    expect(mockedCreateMyActivity).not.toHaveBeenCalled();

    await act(async () => uploadGate.resolve());
    await waitFor(() => expect(mockedCreateMyActivity).toHaveBeenCalledTimes(1));
    expect(submit).toBeDisabled();
    fireEvent.click(submit, { detail: 2 });
    expect(fireEvent.keyDown(submit, { key: "Enter", repeat: true })).toBe(false);
    expect(routerPush).not.toHaveBeenCalled();

    await act(async () => registrationGate.resolve());
    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/en/my-activities"));
    // router.push has returned, but the old screen remains mounted until navigation completes.
    expect(submit).toBeDisabled();
    expect(routerReplace).not.toHaveBeenCalled();
    fireEvent.click(submit, { detail: 1 });
    fireEvent.click(submit, { detail: 0 });
    fireEvent.keyDown(submit, { key: "Enter" });
    expect(mockedUploadActivityImageSet).toHaveBeenCalledTimes(1);
    expect(mockedCreateMyActivity).toHaveBeenCalledTimes(1);
    expect(routerPush).toHaveBeenCalledTimes(1);
  });
  it.each(["upload", "registration"] as const)(
    "releases the submission lock after %s failure and allows a successful retry",
    async (failurePhase) => {
      if (failurePhase === "upload")
        mockedUploadActivityImageSet.mockRejectedValueOnce(new Error("upload failed"));
      else mockedCreateMyActivity.mockRejectedValueOnce(new Error("registration failed"));
      renderWithQueryClient(<CreateActivityForm />);
      await completeAllStepsUntilReview();
      fireEvent.click(screen.getByRole("button", { name: "Register experience" }));
      expect(await screen.findByRole("alert")).toBeInTheDocument();
      const retry = screen.getByRole("button", { name: "Register experience" });
      expect(retry).toBeEnabled();
      expect(
        screen.queryByRole("button", {
          name: "Select language, current language: English",
        }),
      ).not.toBeInTheDocument();
      expect(routerPush).not.toHaveBeenCalled();
      expect(mockedClearActivityCreateDraft).not.toHaveBeenCalled();
      fireEvent.click(retry);
      await waitFor(() => expect(routerPush).toHaveBeenCalledTimes(1));
      expect(mockedUploadActivityImageSet).toHaveBeenCalledTimes(2);
      expect(mockedCreateMyActivity).toHaveBeenCalledTimes(failurePhase === "upload" ? 1 : 2);
      expect(retry).toBeDisabled();
    },
  );
  beforeEach(() => {
    // 비동기 UI·네트워크 대기는 실제 타이머를 쓰고 Date만 고정한다.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(CALENDAR_TEST_NOW));
    createObjectUrlMock.mockClear();
    revokeObjectUrlMock.mockClear();
    mockedSearchGooglePlacePredictions.mockClear();
    mockedFetchGooglePlaceDetails.mockClear();
    routerPush.mockClear();
    routerReplace.mockClear();
    mockedUploadActivityImageSet.mockReset();
    mockedUploadActivityImageSet.mockImplementation(async (files: File[]) =>
      files.map((file, index) => ({
        uploadUrl: `https://s3.example.test/upload-${index}`,
        imageKey: `activities/2026/08/07/key-${index}.webp`,
        imageUrl: `https://cdn.example.test/key-${index}.webp`,
        expiresInSeconds: 300,
      })),
    );
    mockedUpdateMyActivity.mockReset();
    mockedCreateMyActivity.mockReset();
    vi.mocked(createReferralActivity).mockReset();
    vi.mocked(updateReferralActivity).mockReset();
    mockedClearActivityCreateDraft.mockReset();
    mockedClearActivityCreateDraft.mockResolvedValue(undefined);
    mockedLoadActivityCreateDraft.mockReset();
    mockedLoadActivityCreateDraft.mockResolvedValue(null);
    mockedSaveActivityCreateDraft.mockReset();
    mockedSaveActivityCreateDraft.mockResolvedValue(undefined);
    mockedCreateMyActivity.mockResolvedValue({
      status: "success",
      activity: {
        activityId: 1,
        title: "Seoul market walk",
        description: "Meet local vendors and taste a neighborhood breakfast together.",
        totalDurationMinutes: 0,
        hostIntroduction: "I have guided friends through this market for years.",
        thumbnailImageUrl: "https://cdn.example.test/key-0.webp",
        includedItems: ["Equipment rental"],
        restrictionNotes: [],
        maxCapacity: 1,
        price: 50000,
        currency: "KRW",
        discountPercent: null,
        discountEndDate: null,
        discountedPrice: null,
        meetingPointName: "Gwangjang Market Gate 2",
        meetingPlaceId: "ChIJ-gwangjang",
        status: "ACTIVE",
        images: [],
        schedules: [],
        itineraries: [],
      },
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrlMock,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrlMock,
    });
    mockedUsePathname.mockReturnValue("/my-activities/create");
    mockedUseRouter.mockReturnValue({
      push: routerPush,
      replace: routerReplace,
      refresh: vi.fn(),
      back: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>);
  });

  it("shows the twelve-step full-screen sports experience flow without calling an API", () => {
    const { container } = renderWithQueryClient(<CreateActivityForm />);

    expect(screen.getByRole("heading", { name: "Introduce yourself" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Introduce yourself" })).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Activity creation progress" })).toHaveTextContent(
      "Intro",
    );
    expect(screen.queryByRole("button", { name: "Food & drink" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Select language, current language: English" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Exit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
    expect(container.querySelector('img[src*="logo-borderless"]')).toBeInTheDocument();
    expect(mockedUploadActivityImageSet).not.toHaveBeenCalled();
    expect(mockedCreateMyActivity).not.toHaveBeenCalled();
  });

  it("restores the saved step and fields after the form remounts", async () => {
    const restoredFile = new File([new Uint8Array([1])], "restored.webp", {
      type: "image/webp",
    });
    mockedLoadActivityCreateDraft.mockResolvedValue({
      snapshot: {
        currentStep: "photos",
        furthestStepIndex: 3,
        draft: {
          ...EMPTY_ACTIVITY_DRAFT,
          hostIntroduction: "I have guided sports fans around Seoul for many years.",
          experienceName: "Seoul stadium night",
          photos: [
            {
              id: "restored-photo",
              file: restoredFile,
              previewUrl: "blob:restored.webp",
            },
          ],
        },
        errorKey: null,
        reviewing: false,
        fileSequence: 4,
        scheduleSequence: 2,
      },
      objectUrls: new Set(["blob:restored.webp"]),
    });

    renderWithQueryClient(<CreateActivityForm />);

    expect(
      await screen.findByRole("heading", { name: "Show what guests can expect" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Experience photo 1" })).toHaveAttribute(
      "src",
      "blob:restored.webp",
    );
    expect(mockedLoadActivityCreateDraft).toHaveBeenCalledWith("create");
    await waitFor(() =>
      expect(mockedSaveActivityCreateDraft).toHaveBeenCalledWith(
        "create",
        expect.objectContaining({
          currentStep: "photos",
          furthestStepIndex: 3,
          fileSequence: 4,
          scheduleSequence: 2,
          draft: expect.objectContaining({
            photos: [expect.objectContaining({ file: restoredFile })],
          }),
        }),
      ),
    );
  });

  it("saves changed fields for refresh recovery", async () => {
    renderWithQueryClient(<CreateActivityForm />);
    await waitFor(() => expect(mockedLoadActivityCreateDraft).toHaveBeenCalledWith("create"));

    fireEvent.change(screen.getByRole("textbox", { name: "About you" }), {
      target: { value: "I have guided sports fans around Seoul for many years." },
    });

    await waitFor(() =>
      expect(mockedSaveActivityCreateDraft).toHaveBeenCalledWith(
        "create",
        expect.objectContaining({
          currentStep: "host",
          draft: expect.objectContaining({
            hostIntroduction: "I have guided sports fans around Seoul for many years.",
          }),
        }),
      ),
    );
  });

  it("discards the saved draft when browser history leaves the form", async () => {
    renderWithQueryClient(<CreateActivityForm />);
    await waitFor(() => expect(mockedLoadActivityCreateDraft).toHaveBeenCalledWith("create"));

    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(mockedClearActivityCreateDraft).toHaveBeenCalledWith("create");
  });

  it("keeps the current step and shows guidance when a required value is missing", () => {
    renderWithQueryClient(<CreateActivityForm />);

    clickNext();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Write an introduction between 30 and 2000 characters.",
    );
    expect(screen.getByRole("heading", { name: "Introduce yourself" })).toBeInTheDocument();
  });

  it("starts directly with the host introduction step", () => {
    renderWithQueryClient(<CreateActivityForm />);

    expect(screen.getByRole("heading", { name: "Introduce yourself" })).toBeInTheDocument();
    const hostIntroductionInput = screen.getByRole("textbox", { name: "About you" });
    expect(hostIntroductionInput).toHaveClass("border-b-2", "min-h-0");
    expect(hostIntroductionInput).not.toHaveClass("min-h-36");
    const backButton = within(screen.getByRole("main")).getByRole("button", { name: "Back" });
    expect(backButton).not.toHaveClass("absolute");
    expect(backButton).toHaveClass("hidden", "lg:flex");
    expect(backButton.parentElement).toContainElement(
      screen.getByRole("heading", { name: "Introduce yourself" }),
    );
    expect(
      within(screen.getByRole("contentinfo")).getByRole("button", { name: "Back" }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("textbox", { name: "Qualifications and experience" }),
    ).not.toBeInTheDocument();
  });

  it("keeps all twelve inputs in sequence and opens review after restrictions", async () => {
    renderWithQueryClient(<CreateActivityForm />);

    fireEvent.change(screen.getByRole("textbox", { name: "About you" }), {
      target: { value: "I have guided friends through this market for years." },
    });
    clickNext();

    fireEvent.change(screen.getByRole("textbox", { name: "Experience name" }), {
      target: { value: "Seoul market walk" },
    });
    expect(
      screen.queryByText("Use a short, specific name that tells guests what makes it special."),
    ).not.toBeInTheDocument();
    clickNext();

    expect(screen.getByText("Seoul market walk")).toBeInTheDocument();
    const descriptionInput = screen.getByRole("textbox", { name: "Detailed description" });
    expect(descriptionInput.className).toContain("[field-sizing:content]");
    expect(descriptionInput).not.toHaveClass("min-h-28");
    fireEvent.change(descriptionInput, {
      target: { value: "Meet local vendors and taste a neighborhood breakfast together." },
    });
    clickNext();

    const photos = Array.from(
      { length: 3 },
      (_, index) =>
        new File([new Uint8Array([index])], `market-${index}.webp`, { type: "image/webp" }),
    );
    fireEvent.change(screen.getByLabelText("Upload experience photos"), {
      target: { files: photos },
    });
    clickNext();

    fireEvent.click(screen.getByRole("button", { name: "Add an item" }));
    expect(screen.getByRole("dialog", { name: "Choose an activity photo" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Upload a photo for activity 1"), {
      target: { files: [photos[0]] },
    });
    clickEditorNext();
    expect(screen.getByRole("dialog", { name: "Name this activity" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Activity title" }), {
      target: { value: "Meet market vendors" },
    });
    clickEditorNext();
    const itineraryDescriptionInput = screen.getByRole("textbox", {
      name: "What guests will do",
    });
    expect(itineraryDescriptionInput).toHaveClass("min-h-0");
    expect(itineraryDescriptionInput).not.toHaveClass("min-h-14");
    fireEvent.change(itineraryDescriptionInput, {
      target: { value: "Taste three breakfast dishes with local vendors." },
    });
    clickEditorNext();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Duration in minutes" }), {
      target: { value: "60" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const editItineraryButton = screen.getByRole("button", { name: "Edit item 1" });
    const removeItineraryButton = screen.getByRole("button", { name: "Remove item 1" });
    const itineraryActions = editItineraryButton.parentElement;
    expect(itineraryActions).not.toBeNull();
    expect(itineraryActions?.querySelectorAll("svg")).toHaveLength(2);
    expect(editItineraryButton.querySelector("svg")).toHaveClass("size-4");
    expect(removeItineraryButton.querySelector("svg")).toHaveClass("size-4");
    clickNext();

    const meetingPlaceInput = screen.getByRole("textbox", { name: "Meeting place name" });
    const addressInput = screen.getByRole("combobox", { name: "Search address" });
    expect(addressInput).toHaveClass("pl-12", "lg:pl-12");
    expect(
      meetingPlaceInput.compareDocumentPosition(addressInput) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    fireEvent.change(screen.getByRole("combobox", { name: "Search address" }), {
      target: { value: "Gwangjang" },
    });
    fireEvent.click(
      await screen.findByRole("button", { name: /Gwangjang Market.*Jongno-gu, Seoul/ }),
    );
    await waitFor(() => expect(mockedFetchGooglePlaceDetails).toHaveBeenCalled());
    expect(screen.getByTitle("Map of the selected meeting address")).toHaveAttribute(
      "src",
      "https://maps.example.test/ChIJ-gwangjang",
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Meeting place name" }), {
      target: { value: "Gwangjang Market Gate 2" },
    });
    clickNext();

    expect(screen.getByRole("heading", { name: "Set dates and start times" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    fireEvent.click(screen.getByRole("button", { name: `Select ${labelA}` }));
    fireEvent.click(screen.getByRole("button", { name: "10:00" }));
    expect(screen.getByTestId(`schedule-time-${dateKeyA}-10:00`)).toHaveClass(
      "bg-primary",
      "text-white",
    );
    expect(screen.getByTestId(`schedule-status-${dateKeyA}`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: `Select ${labelB}` }));
    fireEvent.click(screen.getByRole("button", { name: `Edit start times for ${labelA}` }));
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Use the same times for all selected dates" }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Use the same times for all selected dates" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "PM" }));
    fireEvent.change(screen.getByLabelText("Hour (1–12)"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Minute (0–59)"), { target: { value: "00" } });
    fireEvent.click(screen.getByRole("button", { name: "Add time" }));
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "P" && element.textContent === "2 dates selected · 3 sessions",
      ),
    ).toBeInTheDocument();
    clickNext();

    expect(screen.getByRole("heading", { name: "Set the maximum group size" })).toBeInTheDocument();
    clickNext();

    expect(screen.getByText("The minimum price per person is ₩15,000.")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Price per person" }), {
      target: { value: "14999" },
    });
    clickNext();
    expect(screen.getByRole("textbox", { name: "Price per person" })).toHaveValue("14999");
    expect(screen.getByRole("alert")).toHaveTextContent("at least ₩15,000");
    expect(mockedCreateMyActivity).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole("textbox", { name: "Price per person" }), {
      target: { value: "50000" },
    });
    clickNext();

    expect(screen.getByRole("heading", { name: "Add a discount" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /No discount/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /Limited-time discount/ })).toBeInTheDocument();
    clickNext();

    expect(
      screen.getByRole("heading", { name: "Tell guests what's included" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Policies" })).toHaveAttribute(
      "aria-current",
      "step",
    );
    fireEvent.click(screen.getByRole("button", { name: "Equipment rental" }));
    expect(screen.getByRole("button", { name: "Equipment rental" })).toHaveClass(
      "border-emerald-500",
      "bg-emerald-50",
    );
    clickNext();

    expect(screen.getByRole("heading", { name: "Before guests join" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Guests must be at least 19 years old" }));
    expect(
      screen.getByRole("button", { name: "Guests must be at least 19 years old" }),
    ).toHaveClass("border-primary", "bg-primary-soft");
    fireEvent.click(screen.getByRole("checkbox", { name: /Nothing guests need to know/ }));
    expect(
      screen.getByRole("button", { name: "Guests must be at least 19 years old" }),
    ).toBeDisabled();
    clickNext();

    expect(screen.getByRole("heading", { name: "Preview your experience" })).toBeInTheDocument();
    expect(screen.getByTestId("activity-detail-preview")).toBeInTheDocument();
    // 검토 화면은 실제 게스트 상세 뷰와 동일한 컴포넌트를 사용한다
    expect(screen.getByTestId("activity-detail-layout")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Book now" })).toBeDisabled();
    expect(screen.getByText("Seoul market walk")).toBeInTheDocument();
    // 미리보기의 호스트는 버디 본인 프로필로 표시된다
    expect(screen.getByText("Host: Seoul Buddy")).toBeInTheDocument();
    expect(screen.queryByText("Host: Jihoon Kim")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What's included" })).toBeInTheDocument();
    expect(screen.getByText("Equipment rental")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Before you join" })).not.toBeInTheDocument();

    // 날짜 박스로 캘린더를 열면 등록한 세션들이 보인다
    fireEvent.click(screen.getByTestId("date-select-box"));
    const calendarDialog = await screen.findByRole("dialog");
    expect(within(calendarDialog).getByRole("button", { name: /10:00 AM/ })).toBeInTheDocument();
    expect(within(calendarDialog).getByRole("button", { name: /4:00 PM/ })).toBeInTheDocument();
  });

  it("disables calendar dates before today", async () => {
    renderWithQueryClient(<CreateActivityForm />);

    await fillStepsUntilSchedule();

    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(
      screen.getByRole("button", { name: `Select ${calendarLabel(pastProbeDate)}` }),
    ).toBeDisabled();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ["2026-09-30T14:59:59Z", "September 30, 2026", "October 15, 2026", "August 15, 2026"],
    ["2026-09-30T15:00:00Z", "October 1, 2026", "November 15, 2026", "September 15, 2026"],
    ["2026-12-31T15:00:00Z", "January 1, 2027", "February 15, 2027", "December 15, 2026"],
    ["2027-02-28T15:00:00Z", "March 1, 2027", "April 15, 2027", "February 15, 2027"],
    ["2028-02-28T15:00:00Z", "February 29, 2028", "March 15, 2028", "January 15, 2028"],
    ["2028-02-29T15:00:00Z", "March 1, 2028", "April 15, 2028", "February 15, 2028"],
  ])("uses Seoul calendar navigation at %s", async (now, today, nextMonth, previousMonth) => {
    vi.setSystemTime(new Date(now));
    renderWithQueryClient(<CreateActivityForm />);
    await fillStepsUntilSchedule();
    expect(screen.getByRole("button", { name: `Select ${today}` })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    const futureDay = screen.getByRole("button", { name: `Select ${nextMonth}` });
    expect(futureDay).toBeEnabled();
    fireEvent.click(futureDay);
    expect(futureDay).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByRole("button", { name: `Select ${previousMonth}` })).toBeDisabled();
  });

  it("uploads photos and registers the activity with the backend contract", async () => {
    renderWithQueryClient(<CreateActivityForm />);

    await completeAllStepsUntilReview();

    fireEvent.click(screen.getByRole("button", { name: "Register experience" }));

    await waitFor(() => expect(mockedCreateMyActivity).toHaveBeenCalledTimes(1));

    expect(mockedUploadActivityImageSet).toHaveBeenCalledTimes(1);
    const uploadedFiles = mockedUploadActivityImageSet.mock.calls[0][0];
    expect(uploadedFiles).toHaveLength(4);
    expect(uploadedFiles.map((file) => file.name)).toEqual([
      "market-0.webp",
      "market-1.webp",
      "market-2.webp",
      "market-0.webp",
    ]);

    expect(mockedCreateMyActivity).toHaveBeenCalledWith({
      sourceLanguage: "EN",
      title: "Seoul market walk",
      description: "Meet local vendors and taste a neighborhood breakfast together.",
      hostIntroduction: "I have guided friends through this market for years.",
      imageKeys: [
        "activities/2026/08/07/key-0.webp",
        "activities/2026/08/07/key-1.webp",
        "activities/2026/08/07/key-2.webp",
      ],
      includedItems: ["Equipment rental"],
      restrictionNotes: [],
      maxCapacity: 1,
      price: 50000,
      currency: "KRW",
      meetingPointName: "Gwangjang Market Gate 2",
      meetingPlaceId: "ChIJ-gwangjang",
      meetingLatitude: 37.5701,
      meetingLongitude: 126.9996,
      status: "ACTIVE",
      schedules: [{ startAt: `${dateKeyA}T10:00:00+09:00`, maxCapacity: 1 }],
      itineraries: [
        {
          title: "Meet market vendors",
          description: "Taste three breakfast dishes with local vendors.",
          durationMinutes: 60,
          imageKey: "activities/2026/08/07/key-3.webp",
        },
      ],
    });
    const request = mockedCreateMyActivity.mock.calls[0][0];
    expect(request).not.toHaveProperty("discountPercent");
    expect(request).not.toHaveProperty("discountEndDate");

    await waitFor(() => expect(routerPush).toHaveBeenCalled());
    expect(mockedClearActivityCreateDraft).toHaveBeenCalledWith("create");
    expect(String(routerPush.mock.calls[0][0])).toContain("/my-activities");
  });

  it("uploads reordered photos in display order when creating an activity", async () => {
    renderWithQueryClient(<CreateActivityForm />);
    await completeAllStepsUntilReview(true);
    fireEvent.click(screen.getByRole("button", { name: "Register experience" }));
    await waitFor(() => expect(mockedCreateMyActivity).toHaveBeenCalledTimes(1));
    expect(mockedUploadActivityImageSet.mock.calls[0][0].map((file: File) => file.name)).toEqual([
      "market-2.webp",
      "market-0.webp",
      "market-1.webp",
      "market-0.webp",
    ]);
    expect(mockedCreateMyActivity.mock.calls[0][0].imageKeys).toEqual([
      "activities/2026/08/07/key-0.webp",
      "activities/2026/08/07/key-1.webp",
      "activities/2026/08/07/key-2.webp",
    ]);
  });

  it("keeps the review open and shows an error message when registration fails", async () => {
    mockedCreateMyActivity.mockResolvedValue({
      status: "error",
      error: Object.assign(new Error("boom"), { code: null, status: 500, details: null }),
    } as unknown as Awaited<ReturnType<typeof createMyActivity>>);

    renderWithQueryClient(<CreateActivityForm />);

    await completeAllStepsUntilReview();

    fireEvent.click(screen.getByRole("button", { name: "Register experience" }));

    await waitFor(() => expect(mockedCreateMyActivity).toHaveBeenCalled());
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Preview your experience" })).toBeInTheDocument();
    expect(routerPush).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Register experience" })).toBeEnabled();
  });

  it("only allows progress navigation to the current or previous steps", () => {
    renderWithQueryClient(<CreateActivityForm />);

    expect(screen.getByRole("button", { name: "Activity" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Operations" })).toBeDisabled();

    expect(screen.getByRole("heading", { name: "Introduce yourself" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activity" })).toBeDisabled();

    fireEvent.change(screen.getByRole("textbox", { name: "About you" }), {
      target: { value: "A local host who knows this neighborhood well." },
    });
    clickNext();
    fireEvent.click(screen.getByRole("button", { name: "Intro" }));
    expect(screen.getByRole("heading", { name: "Introduce yourself" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Introduce yourself" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activity" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Activity" }));
    expect(screen.getByRole("heading", { name: "Name your experience" })).toBeInTheDocument();
  });

  it("revokes photo object URLs when a preview is removed", () => {
    renderWithQueryClient(<CreateActivityForm />);

    fireEvent.change(screen.getByRole("textbox", { name: "About you" }), {
      target: { value: "I have hosted neighborhood walks for many years." },
    });
    clickNext();
    fireEvent.change(screen.getByRole("textbox", { name: "Experience name" }), {
      target: { value: "Market walk" },
    });
    clickNext();
    fireEvent.change(screen.getByRole("textbox", { name: "Detailed description" }), {
      target: { value: "A detailed market experience with friendly local vendors." },
    });
    clickNext();

    const file = new File([new Uint8Array([1])], "market.webp", { type: "image/webp" });
    fireEvent.change(screen.getByLabelText("Upload experience photos"), {
      target: { files: [file] },
    });

    expect(screen.getByAltText("Experience photo 1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove experience photo 1" }));
    expect(revokeObjectUrlMock).toHaveBeenCalledWith("blob:market.webp");
  });

  it("lets the buddy choose any uploaded photo as the cover", () => {
    renderWithQueryClient(<CreateActivityForm />);
    fireEvent.change(screen.getByRole("textbox", { name: "About you" }), {
      target: { value: "I have hosted neighborhood walks for many years." },
    });
    clickNext();
    fireEvent.change(screen.getByRole("textbox", { name: "Experience name" }), {
      target: { value: "Market walk" },
    });
    clickNext();
    fireEvent.change(screen.getByRole("textbox", { name: "Detailed description" }), {
      target: { value: "A detailed market experience with friendly local vendors." },
    });
    clickNext();

    const photos = [
      new File([new Uint8Array([1])], "first.webp", { type: "image/webp" }),
      new File([new Uint8Array([2])], "second.webp", { type: "image/webp" }),
    ];
    fireEvent.change(screen.getByLabelText("Upload experience photos"), {
      target: { files: photos },
    });
    fireEvent.click(screen.getByRole("button", { name: "Set as cover" }));

    expect(screen.getByAltText("Experience photo 1")).toHaveAttribute("src", "blob:second.webp");
    expect(screen.getByAltText("Experience photo 1").parentElement).toHaveTextContent(
      "Cover photo",
    );
  });

  function buildEditDetail(): MyActivityDetailResponse {
    return {
      activityId: 42,
      sourceLanguage: "KO",
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
          startAt: `${dateKeyA}T10:00:00+09:00`,
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
  }

  function renderEditForm(detail: MyActivityDetailResponse) {
    return renderWithQueryClient(
      <CreateActivityForm
        mode="edit"
        activityId="42"
        initialDraft={buildDraftFromMyActivityDetail(detail)}
        initialStatus={detail.status}
        initialSourceLanguage={detail.sourceLanguage}
      />,
    );
  }

  it.each([
    ["create", false],
    ["create", true],
    ["edit", false],
    ["edit", true],
  ] as const)(
    "applies the top capacity to every session and saves it (%s, referral=%s)",
    async (mode, referral) => {
      const detail = buildEditDetail();
      detail.schedules = Array.from({ length: 7 }, (_, index) => ({
        scheduleId: index + 7,
        startAt: `${dateKeyA}T${10 + index}:00:00+09:00`,
        bookedCount: 0,
        heldSeats: 0,
        maxCapacity: 1,
        status: "OPEN" as const,
      }));
      mockedCreateMyActivity.mockResolvedValue({ status: "success", activity: detail });
      mockedUpdateMyActivity.mockResolvedValue({ status: "success", activity: detail });
      vi.mocked(createReferralActivity).mockResolvedValue({ status: "success", data: detail });
      vi.mocked(updateReferralActivity).mockResolvedValue({ status: "success", data: detail });
      renderWithQueryClient(
        <CreateActivityForm
          mode={mode}
          referral={referral}
          invitationCode={referral ? "a".repeat(43) : undefined}
          activityId={mode === "edit" ? "42" : undefined}
          initialDraft={buildDraftFromMyActivityDetail(detail)}
          initialStatus="ACTIVE"
        />,
      );
      if (mode === "edit") {
        fireEvent.click(
          within(screen.getByRole("contentinfo")).getByRole("button", { name: "Back" }),
        );
      }
      for (let index = 0; index < 7; index++) clickNext();
      fireEvent.click(screen.getByRole("button", { name: "Date-specific settings" }));
      fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: "9" } });
      fireEvent.click(screen.getByRole("button", { name: "Increase maximum guests" }));
      screen.getAllByRole("spinbutton").forEach((input) => expect(input).toHaveValue(5));
      fireEvent.click(screen.getByRole("button", { name: "Next sessions" }));
      screen.getAllByRole("spinbutton").forEach((input) => expect(input).toHaveValue(5));
      fireEvent.click(screen.getByRole("button", { name: "Decrease maximum guests" }));
      screen.getAllByRole("spinbutton").forEach((input) => expect(input).toHaveValue(4));
      if (mode === "create") {
        for (let index = 0; index < (referral ? 4 : 5); index++) clickNext();
      }
      fireEvent.click(
        screen.getByRole("button", {
          name: mode === "edit" ? "Save changes" : "Register experience",
        }),
      );
      const submit = referral
        ? mode === "edit"
          ? vi.mocked(updateReferralActivity)
          : vi.mocked(createReferralActivity)
        : mode === "edit"
          ? mockedUpdateMyActivity
          : mockedCreateMyActivity;
      await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
      const request = submit.mock.calls[0][mode === "edit" || referral ? 1 : 0] as {
        maxCapacity: number;
        schedules: { maxCapacity: number }[];
      };
      expect(request.maxCapacity).toBe(4);
      expect(request.schedules).toHaveLength(7);
      request.schedules.forEach((schedule) => expect(schedule.maxCapacity).toBe(4));
    },
  );

  it("blocks next and edit submission below 15,000 won without silently changing the price", async () => {
    const detail = { ...buildEditDetail(), price: 14999 };
    renderEditForm(detail);
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    const price = screen.getByRole("textbox", { name: "Price per person" });
    expect(price).toHaveValue("14999");
    expect(screen.getByRole("alert")).toHaveTextContent("at least ₩15,000");
    expect(mockedUpdateMyActivity).not.toHaveBeenCalled();
    expect(mockedUploadActivityImageSet).not.toHaveBeenCalled();
    clickNext();
    expect(screen.getByRole("textbox", { name: "Price per person" })).toBeInTheDocument();
    fireEvent.change(price, { target: { value: "15000" } });
    clickNext();
    expect(screen.getByRole("heading", { name: "Add a discount" })).toBeInTheDocument();
    mockedUpdateMyActivity.mockResolvedValue({ status: "success", activity: detail });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(mockedUpdateMyActivity).toHaveBeenCalledTimes(1));
    expect(mockedUpdateMyActivity.mock.calls[0][1].price).toBe(15000);
  });

  it("starts edit mode in review and saves reused image keys through the update API", async () => {
    const detail = buildEditDetail();
    mockedUpdateMyActivity.mockResolvedValue({ status: "success", activity: detail });

    renderEditForm(detail);

    expect(screen.getByRole("heading", { name: "Preview your experience" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Seoul market walk" })).toBeInTheDocument();

    const save = screen.getByRole("button", { name: "Save changes" });
    fireEvent.click(save);

    await waitFor(() => expect(mockedUpdateMyActivity).toHaveBeenCalledTimes(1));
    expect(mockedUploadActivityImageSet).not.toHaveBeenCalled();
    expect(mockedCreateMyActivity).not.toHaveBeenCalled();

    const [calledActivityId, request] = mockedUpdateMyActivity.mock.calls[0];
    expect(calledActivityId).toBe("42");
    expect(request).toMatchObject({
      sourceLanguage: "KO",
      title: "Seoul market walk",
      hostIntroduction: "I have guided friends through this market for years.",
      imageKeys: ["activities/cover.webp", "activities/two.webp", "activities/three.webp"],
      includedItems: ["Equipment rental"],
      restrictionNotes: [],
      maxCapacity: 4,
      price: 50000,
      currency: "KRW",
      meetingPointName: "Gwangjang Market Gate 2",
      meetingPlaceId: "ChIJ-gwangjang",
      status: "ACTIVE",
      schedules: [{ startAt: `${dateKeyA}T10:00:00+09:00`, maxCapacity: 4 }],
      itineraries: [
        {
          title: "Meet market vendors",
          description: "Taste three breakfast dishes with local vendors.",
          durationMinutes: 60,
          imageKey: "activities/itinerary.webp",
        },
      ],
    });
    expect(request).not.toHaveProperty("discountPercent");
    await waitFor(() => expect(routerPush).toHaveBeenCalled());
    expect(String(routerPush.mock.calls[0][0])).toContain("/my-activities/42");
    expect(save).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Select language/ })).not.toBeInTheDocument();
    expect(routerReplace).not.toHaveBeenCalled();
    fireEvent.click(save);
    expect(mockedUpdateMyActivity).toHaveBeenCalledTimes(1);
  });

  it("keeps the edit query successful and preserves input when occupancy refresh fails", async () => {
    const detail = buildEditDetail();
    mockedUpdateMyActivity.mockRejectedValueOnce(
      createApiClientError(400, {
        isSuccess: false,
        code: "ACTIVITY_SCHEDULE400_CAPACITY",
        message: "capacity changed",
      }),
    );
    vi.mocked(getMyActivity).mockRejectedValueOnce(new Error("offline"));
    const { queryClient } = renderEditForm(detail);
    queryClient.setQueryData(buddyKeys.activityDetail("42"), detail);
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(getMyActivity).toHaveBeenCalledWith("42"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled());
    expect(queryClient.getQueryState(buddyKeys.activityDetail("42"))?.status).toBe("success");
    expect(screen.getByRole("heading", { name: "Seoul market walk" })).toBeInTheDocument();
    expect(routerPush).not.toHaveBeenCalled();
    mockedUpdateMyActivity.mockResolvedValueOnce({ status: "success", activity: detail });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(mockedUpdateMyActivity).toHaveBeenCalledTimes(2));
    expect(mockedUpdateMyActivity.mock.calls[1][1]).toEqual(
      mockedUpdateMyActivity.mock.calls[0][1],
    );
  });

  it("saves from any step in edit mode without walking to the review screen", async () => {
    const detail = buildEditDetail();
    mockedUpdateMyActivity.mockResolvedValue({ status: "success", activity: detail });

    renderEditForm(detail);

    // 리뷰에서 첫 단계로 돌아가면 단계 전용 저장 버튼이 생긴다
    fireEvent.click(within(screen.getByRole("contentinfo")).getByRole("button", { name: "Back" }));
    expect(
      screen.queryByRole("heading", { name: "Preview your experience" }),
    ).not.toBeInTheDocument();

    const save = screen.getByRole("button", { name: "Save changes" });
    fireEvent.click(save);

    await waitFor(() => expect(mockedUpdateMyActivity).toHaveBeenCalledTimes(1));
    const [calledActivityId, request] = mockedUpdateMyActivity.mock.calls[0];
    expect(calledActivityId).toBe("42");
    expect(request).toMatchObject({ title: "Seoul market walk", status: "ACTIVE" });
    await waitFor(() => expect(routerPush).toHaveBeenCalled());
    expect(String(routerPush.mock.calls[0][0])).toContain("/my-activities/42");
    expect(save).toBeDisabled();
    fireEvent.click(save);
    expect(mockedUpdateMyActivity).toHaveBeenCalledTimes(1);
  });

  it("keeps the per-step save away from create mode", async () => {
    renderWithQueryClient(<CreateActivityForm />);

    // 생성 모드 첫 단계에는 다음 버튼만 있다
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
  });

  it("uploads only new photos in edit mode and preserves their reordered position among existing keys", async () => {
    const detail = buildEditDetail();
    mockedUpdateMyActivity.mockResolvedValue({ status: "success", activity: detail });

    renderEditForm(detail);

    fireEvent.click(screen.getByRole("button", { name: "Activity" }));
    fireEvent.click(screen.getByRole("button", { name: "Show what guests can expect" }));
    expect(
      screen.getByRole("heading", { name: "Show what guests can expect" }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Upload experience photos"), {
      target: { files: [new File([new Uint8Array([9])], "new-shot.webp", { type: "image/webp" })] },
    });
    const handle = screen.getByRole("button", { name: "Move photo 4" });
    for (let move = 0; move < 3; move += 1) fireEvent.keyDown(handle, { key: "ArrowLeft" });

    for (let step = 0; step < 9; step += 1) {
      clickNext();
    }
    expect(screen.getByRole("heading", { name: "Preview your experience" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(mockedUpdateMyActivity).toHaveBeenCalledTimes(1));
    expect(mockedUploadActivityImageSet).toHaveBeenCalledTimes(1);
    expect(mockedUploadActivityImageSet.mock.calls[0][0].map((file: File) => file.name)).toEqual([
      "new-shot.webp",
    ]);

    const [, request] = mockedUpdateMyActivity.mock.calls[0];
    expect(request.imageKeys).toEqual([
      "activities/2026/08/07/key-0.webp",
      "activities/cover.webp",
      "activities/two.webp",
      "activities/three.webp",
    ]);
    expect(request.itineraries[0].imageKey).toBe("activities/itinerary.webp");
  });
});

describe("buildActivityUpsertRequest", () => {
  const baseDraft = {
    ...EMPTY_ACTIVITY_DRAFT,
    experienceName: "Seoul market walk",
    experienceDescription: "Meet local vendors and taste a neighborhood breakfast together.",
    hostIntroduction: "I have guided friends through this market for years.",
    meetingPlace: "Gwangjang Market Gate 2",
    meetingPlaceId: "ChIJ-gwangjang",
    meetingLatitude: 37.5701,
    meetingLongitude: 126.9996,
    maxGuests: "4",
    pricePerPerson: "50000",
    inclusions: "Breakfast tasting",
    hasNoRestrictions: true,
  };

  function createSchedules(count: number) {
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(Date.UTC(2099, 0, index + 1)).toISOString().slice(0, 10);
      return { id: `schedule-${index}`, date, startTime: "10:00" };
    });
  }

  it("submits edited dates together with the past ones it must keep", () => {
    const schedules = createSchedules(31);
    const request = buildActivityUpsertRequest(
      {
        ...baseDraft,
        schedules,
        retainedScheduleStartAts: ["2020-01-01T10:00:00+09:00"],
      },
      [],
      [],
      "EN",
    );

    // 지난 일정이 빠지면 백엔드가 삭제로 보고, 신청 내역이 있으면 수정을 거절한다
    expect(request.schedules).toHaveLength(32);
    expect(request.schedules.slice(0, 31)).toEqual(
      schedules.map(({ date, startTime }) => ({
        startAt: `${date}T${startTime}:00+09:00`,
        maxCapacity: Number(baseDraft.maxGuests),
      })),
    );
    expect(request.schedules.at(-1)).toEqual({ startAt: "2020-01-01T10:00:00+09:00" });
    expect(request).toMatchObject({
      meetingLatitude: 37.5701,
      meetingLongitude: 126.9996,
    });
  });

  it("sends per-session capacities and preserves the original instant when only capacity changes", () => {
    const request = buildActivityUpsertRequest(
      {
        ...baseDraft,
        maxGuests: "20",
        schedules: [
          {
            id: "existing-schedule-1",
            date: "2099-07-20",
            startTime: "10:00",
            originalStartAt: "2099-07-20T01:00:25.123Z",
            maxCapacity: "6",
          },
          { id: "new", date: "2099-07-21", startTime: "14:00", maxCapacity: "10" },
        ],
      },
      [],
      [],
      "EN",
    );
    expect(request.maxCapacity).toBe(20);
    expect(request.schedules).toEqual([
      { startAt: "2099-07-20T01:00:25.123Z", maxCapacity: 6 },
      { startAt: "2099-07-21T14:00:00+09:00", maxCapacity: 10 },
    ]);
  });

  it("submits all 100 future schedules without truncation", () => {
    const schedules = createSchedules(100);
    const request = buildActivityUpsertRequest({ ...baseDraft, schedules }, [], [], "EN");

    expect(request.schedules).toHaveLength(100);
    expect(request.schedules.at(-1)).toEqual({
      startAt: `${schedules.at(-1)?.date}T10:00:00+09:00`,
      maxCapacity: Number(baseDraft.maxGuests),
    });
  });

  it("does not send the same moment twice", () => {
    const request = buildActivityUpsertRequest(
      {
        ...baseDraft,
        schedules: [{ id: "new", date: "2099-07-20", startTime: "10:00" }],
        retainedScheduleStartAts: ["2099-07-20T10:00:00+09:00"],
      },
      [],
      [],
      "EN",
    );

    expect(request.schedules).toHaveLength(1);
  });

  it("rounds Google meeting coordinates to the backend precision", () => {
    const request = buildActivityUpsertRequest(
      {
        ...baseDraft,
        meetingLatitude: 37.566535123,
        meetingLongitude: 126.977964987,
      },
      [],
      [],
      "EN",
    );

    expect(request).toMatchObject({
      sourceLanguage: "EN",
      meetingLatitude: 37.566535,
      meetingLongitude: 126.977965,
    });
  });
});
