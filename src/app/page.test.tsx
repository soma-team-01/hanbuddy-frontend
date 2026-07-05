import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import LandingPage from "./page";

describe("LandingPage", () => {
  it("renders the hero headline", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /experience korea like a local/i }),
    ).toBeInTheDocument();
  });

  it("routes Log in and Get started to /login", () => {
    render(<LandingPage />);
    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: /get started/i })).toHaveAttribute("href", "/login");
  });

  it("routes Browse experiences to /explore", () => {
    render(<LandingPage />);
    expect(screen.getByRole("link", { name: /browse experiences/i })).toHaveAttribute(
      "href",
      "/explore",
    );
  });

  it("renders the three experiences with images", () => {
    render(<LandingPage />);
    for (const title of ["Gwangjang Market", "Bukchon Hanok", "Tea Ceremony"]) {
      expect(screen.getByRole("img", { name: title })).toBeInTheDocument();
    }
  });
});
