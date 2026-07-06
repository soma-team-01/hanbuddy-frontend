import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LoginPage from "./page";

describe("LoginPage", () => {
  it("starts Google OAuth through the same-origin auth route", () => {
    render(<LoginPage />);

    expect(screen.getByRole("link", { name: /continue with google/i })).toHaveAttribute(
      "href",
      "/api/auth/google/start",
    );
  });
});
