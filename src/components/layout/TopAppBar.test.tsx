import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
});
