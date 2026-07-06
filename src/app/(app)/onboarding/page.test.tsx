import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ProfileSetupPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("ProfileSetupPage", () => {
  it("does not render the Korean Phone Number field", () => {
    render(<ProfileSetupPage />);
    expect(screen.queryByText("Korean Phone Number")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Korean phone number")).not.toBeInTheDocument();
  });

  it("keeps the country selector for tourists on phone-based apps", () => {
    render(<ProfileSetupPage />);
    fireEvent.click(screen.getByRole("button", { name: "WhatsApp" }));
    expect(screen.getByLabelText("Messaging country code")).toBeInTheDocument();
    expect(screen.queryByText("+82")).not.toBeInTheDocument();
  });

  it("fixes +82 without a country selector for buddies", () => {
    render(<ProfileSetupPage />);
    fireEvent.click(screen.getByRole("button", { name: "Buddy" }));
    fireEvent.click(screen.getByRole("button", { name: "WhatsApp" }));
    expect(screen.queryByLabelText("Messaging country code")).not.toBeInTheDocument();
    expect(screen.getByText("+82")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("010-XXXX-XXXX")).toBeInTheDocument();
  });

  it("clears the contact input when the role changes", () => {
    render(<ProfileSetupPage />);
    fireEvent.click(screen.getByRole("button", { name: "WhatsApp" }));
    fireEvent.change(screen.getByLabelText("Messaging phone number"), {
      target: { value: "5551234" },
    });
    expect(screen.getByLabelText("Messaging phone number")).toHaveValue("5551234");
    fireEvent.click(screen.getByRole("button", { name: "Buddy" }));
    expect(screen.getByLabelText("Messaging phone number")).toHaveValue("");
  });
});
