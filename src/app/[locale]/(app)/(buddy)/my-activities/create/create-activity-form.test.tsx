import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { usePathname, useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import {
  fetchGooglePlaceDetailsViaBff,
  searchGooglePlacePredictionsViaBff,
} from "@/lib/google/places";
import { CreateActivityForm } from "./create-activity-form";

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
  }),
}));

const mockedUsePathname = vi.mocked(usePathname);
const mockedUseRouter = vi.mocked(useRouter);
const mockedSearchGooglePlacePredictions = vi.mocked(searchGooglePlacePredictionsViaBff);
const mockedFetchGooglePlaceDetails = vi.mocked(fetchGooglePlaceDetailsViaBff);

const createObjectUrlMock = vi.fn((file: Blob) =>
  file instanceof File ? `blob:${file.name}` : "blob:preview",
);
const revokeObjectUrlMock = vi.fn();

function clickNext() {
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
}

function clickEditorNext() {
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Next" }));
}

describe("CreateActivityForm", () => {
  beforeEach(() => {
    createObjectUrlMock.mockClear();
    revokeObjectUrlMock.mockClear();
    mockedSearchGooglePlacePredictions.mockClear();
    mockedFetchGooglePlaceDetails.mockClear();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrlMock,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrlMock,
    });
    mockedUsePathname.mockReturnValue("/my-activities/create");
    mockedUseRouter.mockReturnValue({ replace: vi.fn() } as unknown as ReturnType<
      typeof useRouter
    >);
  });

  it("shows the twelve-step full-screen sports experience flow without calling an API", () => {
    const { container } = renderWithIntl(<CreateActivityForm />);

    expect(screen.getByRole("heading", { name: "Introduce yourself" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Introduce yourself" })).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Activity creation progress" })).toHaveTextContent(
      "Intro",
    );
    expect(screen.queryByRole("button", { name: "Food & drink" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Select language, current language: English" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Exit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
    expect(container.querySelector('img[src*="logo-borderless"]')).toBeInTheDocument();
  });

  it("keeps the current step and shows guidance when a required value is missing", () => {
    renderWithIntl(<CreateActivityForm />);

    clickNext();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Write an introduction between 30 and 200 characters.",
    );
    expect(screen.getByRole("heading", { name: "Introduce yourself" })).toBeInTheDocument();
  });

  it("preserves the draft and current step while changing the language", () => {
    const firstRender = renderWithIntl(<CreateActivityForm />);

    fireEvent.change(screen.getByRole("textbox", { name: "About you" }), {
      target: { value: "I have guided sports fans around Seoul for many years." },
    });
    clickNext();
    fireEvent.change(screen.getByRole("textbox", { name: "Experience name" }), {
      target: { value: "Seoul stadium night" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Select language, current language: English" }),
    );
    fireEvent.click(screen.getByRole("menuitemradio", { name: "한국어" }));
    firstRender.unmount();

    renderWithIntl(<CreateActivityForm />);

    expect(screen.getByRole("heading", { name: "Name your experience" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Experience name" })).toHaveValue(
      "Seoul stadium night",
    );

    fireEvent.click(screen.getByRole("link", { name: "Exit" }));
  });

  it("starts directly with the host introduction step", () => {
    renderWithIntl(<CreateActivityForm />);

    expect(screen.getByRole("heading", { name: "Introduce yourself" })).toBeInTheDocument();
    const hostIntroductionInput = screen.getByRole("textbox", { name: "About you" });
    expect(hostIntroductionInput).toHaveClass("border-b-2", "min-h-0");
    expect(hostIntroductionInput).not.toHaveClass("min-h-36");
    const backButton = screen.getByRole("button", { name: "Back" });
    expect(backButton).toHaveClass("absolute");
    expect(backButton.parentElement).toHaveClass("relative");
    expect(
      screen.queryByRole("textbox", { name: "Qualifications and experience" }),
    ).not.toBeInTheDocument();
  });

  it("keeps all twelve inputs in sequence and opens review after restrictions", async () => {
    renderWithIntl(<CreateActivityForm />);

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

    fireEvent.click(screen.getByRole("button", { name: "Add an activity" }));
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
    clickNext();

    const meetingPlaceInput = screen.getByRole("textbox", { name: "Meeting place name" });
    const addressInput = screen.getByRole("combobox", { name: "Search address" });
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
    fireEvent.click(screen.getByRole("button", { name: "Select August 15, 2026" }));
    fireEvent.change(screen.getByLabelText("Add a start time"), {
      target: { value: "10:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add time" }));
    expect(screen.getByTestId("schedule-time-2026-08-15-10:00")).toHaveClass(
      "bg-primary",
      "text-white",
    );
    expect(screen.getByTestId("schedule-status-2026-08-15")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Select August 22, 2026" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit start times for August 15, 2026" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply these times to all 2 dates" }));
    fireEvent.change(screen.getByLabelText("Add a start time"), {
      target: { value: "16:00" },
    });
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
    expect(screen.getAllByText("August 15, 2026").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("August 22, 2026")).toBeInTheDocument();
    expect(screen.getAllByText("10:00 AM").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("4:00 PM")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Book now" })).toBeInTheDocument();
    expect(screen.getByText("Seoul market walk")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What's included" })).toBeInTheDocument();
    expect(screen.getByText("Equipment rental")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Before you join" })).not.toBeInTheDocument();
  });

  it("only allows progress navigation to the current or previous steps", () => {
    renderWithIntl(<CreateActivityForm />);

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
    renderWithIntl(<CreateActivityForm />);

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
    renderWithIntl(<CreateActivityForm />);
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
});
