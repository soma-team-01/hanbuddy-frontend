import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { CreateActivityForm } from "./create-activity-form";

const createObjectUrlMock = vi.fn((file: Blob) =>
  file instanceof File ? `blob:${file.name}` : "blob:preview",
);
const revokeObjectUrlMock = vi.fn();

describe("CreateActivityForm", () => {
  beforeEach(() => {
    createObjectUrlMock.mockClear();
    revokeObjectUrlMock.mockClear();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrlMock,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrlMock,
    });
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("shows the nine-step category screen without calling an API", () => {
    renderWithIntl(<CreateActivityForm />);

    expect(screen.getByRole("heading", { name: "Choose a category" })).toBeInTheDocument();
    expect(screen.getAllByText("Step 1 of 9")).not.toHaveLength(0);
    expect(screen.getByRole("button", { name: "Food & drink" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
  });

  it("keeps the current step and shows guidance when a required value is missing", () => {
    renderWithIntl(<CreateActivityForm />);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Choose a category to continue.");
    expect(screen.getByRole("heading", { name: "Choose a category" })).toBeInTheDocument();
  });

  it("moves to the concept step after a category is selected", () => {
    renderWithIntl(<CreateActivityForm />);

    fireEvent.click(screen.getByRole("button", { name: "Culture & history" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByRole("heading", { name: "Shape your experience" })).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: /What will guests experience/ }),
    ).toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenCalled();
  });

  it("adds photo previews and revokes their object URLs when removed", () => {
    renderWithIntl(<CreateActivityForm />);

    fireEvent.click(screen.getByRole("button", { name: "Food & drink" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.change(screen.getByRole("textbox", { name: /What will guests experience/ }), {
      target: { value: "A market breakfast walk" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /Describe the idea/ }), {
      target: { value: "Taste a neighborhood breakfast with a local host." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.change(screen.getByRole("textbox", { name: "About you" }), {
      target: { value: "I have guided friends through this market for years." },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /Qualifications and experience/ }), {
      target: { value: "Licensed local guide" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    const file = new File([new Uint8Array([1])], "market.webp", { type: "image/webp" });
    fireEvent.change(screen.getByLabelText("Upload experience photos"), {
      target: { files: [file] },
    });

    expect(screen.getByAltText("Experience photo 1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove experience photo 1" }));
    expect(revokeObjectUrlMock).toHaveBeenCalledWith("blob:market.webp");
  });
});
