import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMyActivity } from "@/lib/api/buddy";
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

const mockedCreateMyActivity = vi.mocked(createMyActivity);
const mockedUploadActivityImages = vi.mocked(uploadActivityImages);

describe("CreateActivityForm", () => {
  beforeEach(() => {
    routerMock.push.mockReset();
    routerMock.replace.mockReset();
    mockedCreateMyActivity.mockReset();
    mockedUploadActivityImages.mockReset();
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
        meetingPointAddress: "Jongno-gu, Seoul",
        meetingPlaceId: "Jongno-gu, Seoul",
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
    fireEvent.change(screen.getByLabelText("Available date"), {
      target: { value: "2026-07-20" },
    });
    fireEvent.change(screen.getByLabelText("Available time"), {
      target: { value: "10:00" },
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
    fireEvent.change(screen.getByLabelText("Meeting place address"), {
      target: { value: "Jongno-gu, Seoul" },
    });
    fireEvent.change(screen.getByLabelText("Restriction"), {
      target: { value: "No caffeine sensitivity" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Publish Activity" }));

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
      meetingPointAddress: "Jongno-gu, Seoul",
      meetingPlaceId: "Jongno-gu, Seoul",
      status: "ACTIVE",
      schedules: [{ activityDate: "2026-07-20", startTime: "10:00" }],
    });
    expect(routerMock.push).toHaveBeenCalledWith("/my-activities");
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
    fireEvent.change(screen.getByLabelText("Available date"), {
      target: { value: "2026-07-20" },
    });
    fireEvent.change(screen.getByLabelText("Available time"), {
      target: { value: "10:00" },
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
    fireEvent.change(screen.getByLabelText("Meeting place address"), {
      target: { value: "Jongno-gu, Seoul" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Publish Activity" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please select at least one activity photo.",
    );
    expect(mockedUploadActivityImages).not.toHaveBeenCalled();
    expect(mockedCreateMyActivity).not.toHaveBeenCalled();
  });

  it("keeps schedule date and time values paired by row", async () => {
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
        meetingPointAddress: "Jongno-gu, Seoul",
        meetingPlaceId: "Jongno-gu, Seoul",
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

    const dateInputs = screen.getAllByLabelText("Available date");
    const timeInputs = screen.getAllByLabelText("Available time");
    fireEvent.change(dateInputs[0], { target: { value: "2026-07-20" } });
    fireEvent.change(timeInputs[0], { target: { value: "10:00" } });
    fireEvent.change(dateInputs[1], { target: { value: "2026-07-21" } });
    fireEvent.change(dateInputs[2], { target: { value: "2026-07-22" } });
    fireEvent.change(timeInputs[2], { target: { value: "14:00" } });
    fireEvent.change(screen.getByLabelText("Max Capacity"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Price per person"), {
      target: { value: "50000" },
    });
    fireEvent.change(screen.getByLabelText("Meeting place name"), {
      target: { value: "Anguk Station" },
    });
    fireEvent.change(screen.getByLabelText("Meeting place address"), {
      target: { value: "Jongno-gu, Seoul" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Publish Activity" }));

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
});
