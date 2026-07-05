import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import LandingPage from "./page";

describe("LandingPage", () => {
  it("links Get started to /login", () => {
    render(<LandingPage />);
    const cta = screen.getByRole("link", { name: /get started/i });
    expect(cta).toHaveAttribute("href", "/login");
  });
});
