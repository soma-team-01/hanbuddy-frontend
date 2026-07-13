import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DashboardPage from "./page";

vi.mock("./dashboard-content", () => ({
  DashboardContent: () => null,
}));

describe("DashboardPage", () => {
  it("does not show the mock personalized greeting", () => {
    render(<DashboardPage />);

    expect(screen.queryByText("Hello, Ji-hun 👋")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Quick Actions" })).toBeInTheDocument();
  });
});
