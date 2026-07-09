import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMyActivity } from "@/lib/api/buddy";
import { GOOGLE_PLACE_COMPAT_ADDRESS, searchGooglePlacePredictions } from "@/lib/google/places";
import { uploadActivityImages } from "@/lib/images/presigned";
import { CreateActivityForm } from "./create-activity-form";

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/lib/api/buddy", () => ({
  createMyActivity: vi.fn(),
}));

vi.mock("@/lib/images/presigned", () => ({
  uploadActivityImages: vi.fn(),
}));

vi.mock("@/lib/google/places", async () => {
  const actual = await vi.importActual<typeof import("@/lib/google/places")>("@/lib/google/places");
  return {
    ...actual,
    searchGooglePlacePredictions: vi.fn(),
  };
});

const mockedCreateMyActivity = vi.mocked(createMyActivity);
const mockedUploadActivityImages = vi.mocked(uploadActivityImages);
const mockedSearchGooglePlacePredictions = vi.mocked(searchGooglePlacePredictions);
const createObjectUrlMock = vi.fn((file: Blob) =>
  file instanceof File ? `blob:${file.name}` : "blob:preview",
);
const revokeObjectUrlMock = vi.fn();

function confirmPublishInDialog() {
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Publish" }));
}

async function selectGooglePlace() {
  fireEvent.change(screen.getByLabelText("Search Google place"), {
    target: { value: "Anguk" },
  });
  fireEvent.click(await screen.findByRole("option", { name: /Anguk Station/ }));
}

async function fillRequiredTextFields() {
  fireEvent.change(screen.getByLabelText("Activity Title"), {
    target: { value: "Traditional Tea Tasting" },
  });
  fireEvent.change(screen.getByLabelText("Description"), {
    target: { value: "Learn Korean tea etiquette." },
  });
  fireEvent.change(screen.getByLabelText("Included item"), {
    target: { value: "Tea" },
  });
  fireEvent.change(screen.getByLabelText("Available schedule"), {
    target: { value: "2026-07-20T10:00" },
  });
  fireEvent.change(screen.getByLabelText("Max Capacity"), {
    target: { value: "4" },
  });
  fireEvent.change(screen.getByLabelText("Price per person"), {
    target: { value: "50000" },
  });
  fireEvent.change(screen.getByLabelText("Meeting place name"), {
    target: { value: "Anguk Station" },
  });
  await selectGooglePlace();
}

async function fillRequiredFields() {
  const file = new File([new Uint8Array([1])], "tea.webp", { type: "image/webp" });
  fireEvent.change(screen.getByLabelText("Activity photos"), {
    target: { files: [file] },
  });
  await fillRequiredTextFields();
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
    routerMock.replace.mockReset();
    mockedCreateMyActivity.mockReset();
    mockedUploadActivityImages.mockReset();
    mockedSearchGooglePlacePredictions.mockReset();
    mockedSearchGooglePlacePredictions.mockResolvedValue([
      {
        placeId: "ChIJ-anguk",
        mainText: "Anguk Station",
        secondaryText: "Seoul, South Korea",
        text: "Anguk Station, Seoul, South Korea",
      },
    ]);
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "test-google-key";
  });

  it("puts the searchable Google place field before the guide meeting point name", () => {
    render(<CreateActivityForm />);

    const googlePlaceSearch = screen.getByRole("textbox", { name: "Search Google place" });
    const meetingPlaceName = screen.getByRole("textbox", { name: "Meeting place name" });

    expect(
      googlePlaceSearch.compareDocumentPosition(meetingPlaceName) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows the selected Google place name in the search field and address below it", async () => {
    render(<CreateActivityForm />);

    await selectGooglePlace();

    expect(screen.getByRole("textbox", { name: "Search Google place" })).toHaveValue(
      "Anguk Station",
    );
    expect(screen.getByText("Seoul, South Korea")).toBeInTheDocument();
    expect(screen.queryByText("Anguk Station, Seoul, South Korea")).not.toBeInTheDocument();
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
        meetingPointAddress: GOOGLE_PLACE_COMPAT_ADDRESS,
        meetingPlaceId: "ChIJ-anguk",
        images: [],
        schedules: [],
      },
    });

    render(<CreateActivityForm />);

    const file = await fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Restriction"), {
      target: { value: "No caffeine sensitivity" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Publish Activity" }));
    confirmPublishInDialog();

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
      meetingPointAddress: GOOGLE_PLACE_COMPAT_ADDRESS,
      meetingPlaceId: "ChIJ-anguk",
      status: "ACTIVE",
      schedules: [{ activityDate: "2026-07-20", startTime: "10:00" }],
    });
    expect(routerMock.push).toHaveBeenCalledWith("/my-activities");
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
        meetingPointAddress: GOOGLE_PLACE_COMPAT_ADDRESS,
        meetingPlaceId: "ChIJ-anguk",
        images: [],
        schedules: [],
      },
    });

    render(<CreateActivityForm />);

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

    await fillRequiredTextFields();

    fireEvent.click(screen.getByRole("button", { name: "Publish Activity" }));
    confirmPublishInDialog();

    await waitFor(() => expect(mockedUploadActivityImages).toHaveBeenCalledWith([marketFile]));
  });

  it("blocks submission until at least one activity photo is selected", async () => {
    render(<CreateActivityForm />);

    fireEvent.change(screen.getByLabelText("Activity Title"), {
      target: { value: "Traditional Tea Tasting" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Learn Korean tea etiquette." },
    });
    fireEvent.change(screen.getByLabelText("Included item"), {
      target: { value: "Tea" },
    });
    fireEvent.change(screen.getByLabelText("Available schedule"), {
      target: { value: "2026-07-20T10:00" },
    });
    fireEvent.change(screen.getByLabelText("Max Capacity"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Price per person"), {
      target: { value: "50000" },
    });
    fireEvent.change(screen.getByLabelText("Meeting place name"), {
      target: { value: "Anguk Station" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Publish Activity" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please select at least one activity photo.",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockedUploadActivityImages).not.toHaveBeenCalled();
    expect(mockedCreateMyActivity).not.toHaveBeenCalled();
  });

  it("does not publish when the confirmation is cancelled", async () => {
    render(<CreateActivityForm />);

    await fillRequiredFields();

    fireEvent.click(screen.getByRole("button", { name: "Publish Activity" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockedUploadActivityImages).not.toHaveBeenCalled();
    expect(mockedCreateMyActivity).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("saves a draft without asking for confirmation", async () => {
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
        status: "DRAFT",
        includedItems: [],
        restrictionNotes: [],
        maxCapacity: 4,
        price: 50000,
        currency: "KRW",
        meetingPointName: "Anguk Station",
        meetingPointAddress: GOOGLE_PLACE_COMPAT_ADDRESS,
        meetingPlaceId: "ChIJ-anguk",
        images: [],
        schedules: [],
      },
    });

    render(<CreateActivityForm />);

    await fillRequiredFields();

    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(mockedCreateMyActivity).toHaveBeenCalledWith(
        expect.objectContaining({ status: "DRAFT" }),
      ),
    );
  });

  it("leaves immediately when going back with an untouched form", () => {
    render(<CreateActivityForm />);

    fireEvent.click(screen.getByRole("button", { name: "Go back" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(routerMock.push).toHaveBeenCalledWith("/my-activities");
  });

  it("asks for confirmation before discarding entered input", () => {
    render(<CreateActivityForm />);

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
    render(<CreateActivityForm />);

    fireEvent.change(screen.getByLabelText("Activity Title"), {
      target: { value: "Traditional Tea Tasting" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(routerMock.push).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Activity Title")).toHaveValue("Traditional Tea Tasting");
  });

  it("ignores the back button while a submission is in progress", async () => {
    mockedUploadActivityImages.mockReturnValue(new Promise(() => {}));

    render(<CreateActivityForm />);

    await fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Publish Activity" }));
    confirmPublishInDialog();

    fireEvent.click(screen.getByRole("button", { name: "Go back" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("warns on page unload only while the form is dirty", () => {
    render(<CreateActivityForm />);

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
        meetingPointAddress: GOOGLE_PLACE_COMPAT_ADDRESS,
        meetingPlaceId: "ChIJ-anguk",
        images: [],
        schedules: [],
      },
    });

    render(<CreateActivityForm />);

    const file = new File([new Uint8Array([1])], "tea.webp", { type: "image/webp" });
    fireEvent.change(screen.getByLabelText("Activity photos"), {
      target: { files: [file] },
    });
    fireEvent.change(screen.getByLabelText("Activity Title"), {
      target: { value: "Traditional Tea Tasting" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Learn Korean tea etiquette." },
    });
    fireEvent.change(screen.getByLabelText("Included item"), {
      target: { value: "Tea" },
    });
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
    fireEvent.change(screen.getByLabelText("Meeting place name"), {
      target: { value: "Anguk Station" },
    });
    await selectGooglePlace();

    fireEvent.click(screen.getByRole("button", { name: "Publish Activity" }));
    confirmPublishInDialog();

    await waitFor(() =>
      expect(mockedCreateMyActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          schedules: [
            { activityDate: "2026-07-20", startTime: "10:00" },
            { activityDate: "2026-07-22", startTime: "14:00" },
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
        meetingPointAddress: GOOGLE_PLACE_COMPAT_ADDRESS,
        meetingPlaceId: "ChIJ-anguk",
        images: [],
        schedules: [],
      },
    });

    render(<CreateActivityForm />);

    await fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "+ Add item" }));
    fireEvent.change(screen.getAllByLabelText("Included item")[1], {
      target: { value: "Extra snack" },
    });
    fireEvent.click(screen.getByRole("button", { name: "+ Add time slot" }));
    fireEvent.change(screen.getAllByLabelText("Available schedule")[1], {
      target: { value: "2026-07-21T11:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "+ Add restriction" }));
    fireEvent.change(screen.getAllByLabelText("Restriction")[1], {
      target: { value: "No nut allergies" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove included item 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove time slot 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove restriction 2" }));

    expect(screen.getAllByLabelText("Included item")).toHaveLength(1);
    expect(screen.getAllByLabelText("Available schedule")).toHaveLength(1);
    expect(screen.getAllByLabelText("Restriction")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Publish Activity" }));
    confirmPublishInDialog();

    await waitFor(() =>
      expect(mockedCreateMyActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          includedItems: ["Tea"],
          restrictionNotes: [],
          schedules: [{ activityDate: "2026-07-20", startTime: "10:00" }],
        }),
      ),
    );
  });

  it("shows hover background feedback on add row buttons", () => {
    render(<CreateActivityForm />);

    expect(screen.getByRole("button", { name: "+ Add item" })).toHaveClass("hover:bg-earth/10");
    expect(screen.getByRole("button", { name: "+ Add time slot" })).toHaveClass(
      "hover:bg-earth/10",
    );
    expect(screen.getByRole("button", { name: "+ Add restriction" })).toHaveClass(
      "hover:bg-earth/10",
    );
  });

  it("puts remove buttons inside rows from the second dynamic row onward", () => {
    render(<CreateActivityForm />);

    fireEvent.click(screen.getByRole("button", { name: "+ Add item" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Add time slot" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Add restriction" }));

    expect(
      screen.queryByRole("button", { name: "Remove included item 1" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove included item 2" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove time slot 1" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove time slot 2" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove restriction 1" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove restriction 2" })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Remove included item 2" })).toHaveClass(
      "absolute",
      "right-2",
    );
    expect(screen.getByRole("button", { name: "Remove time slot 2" })).toHaveClass(
      "absolute",
      "right-2",
    );
    expect(screen.getByRole("button", { name: "Remove restriction 2" })).toHaveClass(
      "absolute",
      "right-2",
    );
    expect(screen.getAllByLabelText("Available schedule")).toHaveLength(2);
  });
});
