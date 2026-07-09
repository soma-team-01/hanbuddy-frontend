import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TopAppBar } from "./TopAppBar";

describe("TopAppBar", () => {
  it("links the HanBuddy wordmark to the role-aware home entry", () => {
    render(<TopAppBar />);

    expect(screen.getByRole("link", { name: "HanBuddy" })).toHaveAttribute("href", "/home");
  });

  it("keeps custom titles as plain headings", () => {
    render(<TopAppBar title="Applicants" />);

    expect(screen.getByRole("heading", { name: "Applicants" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Applicants" })).not.toBeInTheDocument();
  });

  it("renders a back button instead of a link when onLeftClick is provided", () => {
    const onLeftClick = vi.fn();
    render(<TopAppBar title="Create" onLeftClick={onLeftClick} />);

    const button = screen.getByRole("button", { name: "Go back" });
    fireEvent.click(button);

    expect(onLeftClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("link", { name: "Go back" })).not.toBeInTheDocument();
  });
});
