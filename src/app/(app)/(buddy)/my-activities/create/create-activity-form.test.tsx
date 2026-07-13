import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMyActivity } from "@/lib/api/buddy";
import { getMyProfile } from "@/lib/api/users";
import { fetchGooglePlaceDetails, searchGooglePlacePredictions } from "@/lib/google/places";
import { uploadActivityImages } from "@/lib/images/presigned";
import { buddyKeys } from "@/lib/query/buddy";
import { createQueryClient } from "@/lib/query/client";
import { userKeys } from "@/lib/query/users";
import { createMockProfile } from "@/test/factories";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { CreateActivityForm } from "./create-activity-form";

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/lib/api/buddy", () => ({
  createMyActivity: vi.fn(),
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
const mockedGetMyProfile = vi.mocked(getMyProfile);
const mockedUploadActivityImages = vi.mocked(uploadActivityImages);
const mockedFetchGooglePlaceDetails = vi.mocked(fetchGooglePlaceDetails);
const mockedSearchGooglePlacePredictions = vi.mocked(searchGooglePlacePredictions);
const createObjectUrlMock = vi.fn((file: Blob) =>
  file instanceof File ? `blob:${file.name}` : "blob:preview",
);
const revokeObjectUrlMock = vi.fn();
const profile = createMockProfile({ userType: "BUDDY" });

function confirmRegisterInDialog() {
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Register" }));
}

async function selectGooglePlace() {
  fireEvent.change(screen.getByLabelText("Search Google place"), {
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

  it("reuses one session token for autocomplete and terminates it after selection", async () => {
    const randomUUID = vi.spyOn(globalThis.crypto, "randomUUID");
    renderWithQueryClient(<CreateActivityForm />);

    goToStepThree();
    const searchInput = screen.getByRole("textbox", { name: "Search Google place" });
    fireEvent.change(searchInput, { target: { value: "Ang" } });
    await waitFor(() => expect(mockedSearchGooglePlacePredictions).toHaveBeenCalledTimes(1));
    fireEvent.change(searchInput, { target: { value: "Anguk" } });
    await waitFor(() => expect(mockedSearchGooglePlacePredictions).toHaveBeenCalledTimes(2));

    const firstSessionToken = mockedSearchGooglePlacePredictions.mock.calls[0][3];
    const secondSessionToken = mockedSearchGooglePlacePredictions.mock.calls[1][3];
    expect(firstSessionToken).toEqual(expect.any(String));
    expect(secondSessionToken).toBe(firstSessionToken);

    fireEvent.click(await screen.findByRole("button", { name: /Anguk Station/ }));

    await waitFor(() =>
      expect(mockedFetchGooglePlaceDetails).toHaveBeenCalledWith(
        "ChIJ-anguk",
        "test-google-key",
        expect.any(Function),
        firstSessionToken,
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
    const abandonedSessionToken = mockedSearchGooglePlacePredictions.mock.calls[0][3];

    fireEvent.change(searchInput, { target: { value: "" } });
    fireEvent.change(searchInput, { target: { value: "Anguk" } });
    await waitFor(() => expect(mockedSearchGooglePlacePredictions).toHaveBeenCalledTimes(2));

    expect(mockedSearchGooglePlacePredictions.mock.calls[1][3]).not.toBe(abandonedSessionToken);
  });

  it("uses three registration steps and removes the draft action", () => {
    renderWithQueryClient(<CreateActivityForm />);

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
    expect(screen.getByRole("button", { name: "Previous Step" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Register Activity" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save Draft" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous Step" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous Step" }));

    expect(screen.getByRole("textbox", { name: "Activity Title" })).toHaveValue(
      "Traditional Tea Tasting",
    );
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
    expect(routerMock.push).toHaveBeenCalledWith("/my-activities");
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
    expect(routerMock.push).toHaveBeenCalledWith("/my-activities");
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

    expect(routerMock.push).toHaveBeenCalledWith("/my-activities");
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

    fireEvent.click(screen.getByRole("button", { name: "Go back" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(routerMock.push).not.toHaveBeenCalled();
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
    fireEvent.click(screen.getByRole("button", { name: "+ Add time slot" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Add time slot" }));

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
    fireEvent.click(screen.getByRole("button", { name: "+ Add time slot" }));
    fireEvent.change(screen.getAllByLabelText("Available schedule")[1], {
      target: { value: "2026-07-21T11:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Remove time slot 2" }));
    expect(screen.getAllByLabelText("Available schedule")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Next Step" }));
    await fillStepThreeFields();
    fireEvent.click(screen.getByRole("button", { name: "+ Add item" }));
    fireEvent.change(screen.getAllByLabelText("Included item")[1], {
      target: { value: "Extra snack" },
    });
    fireEvent.click(screen.getByRole("button", { name: "+ Add restriction" }));
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
    expect(screen.getByRole("button", { name: "+ Add time slot" })).toHaveClass(
      "hover:bg-earth/10",
    );
    fillStepTwoFields();
    fireEvent.click(screen.getByRole("button", { name: "Next Step" }));

    expect(screen.getByRole("button", { name: "+ Add item" })).toHaveClass("hover:bg-earth/10");
    expect(screen.getByRole("button", { name: "+ Add restriction" })).toHaveClass(
      "hover:bg-earth/10",
    );
  });

  it("puts remove buttons inside rows from the second dynamic row onward", () => {
    renderWithQueryClient(<CreateActivityForm />);

    goToStepTwo();
    fireEvent.click(screen.getByRole("button", { name: "+ Add time slot" }));
    expect(screen.queryByRole("button", { name: "Remove time slot 1" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove time slot 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove time slot 2" })).toHaveClass(
      "absolute",
      "right-2",
    );
    expect(screen.getAllByLabelText("Available schedule")).toHaveLength(2);

    fillStepTwoFields();
    fireEvent.click(screen.getByRole("button", { name: "Next Step" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Add item" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Add restriction" }));

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
