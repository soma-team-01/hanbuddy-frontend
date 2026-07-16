import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import LoginPage from "./page";

vi.mock("next/link", () => ({
  default: ({
    href,
    prefetch,
    children,
    className,
  }: {
    href: string;
    prefetch?: boolean;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} data-prefetch={String(prefetch)} className={className}>
      {children}
    </a>
  ),
}));

describe("LoginPage", () => {
  it("starts Google OAuth through the same-origin auth route", async () => {
    render(await LoginPage({ searchParams: Promise.resolve({}) }));

    const googleLoginLink = screen.getByRole("link", { name: /continue with google/i });
    expect(googleLoginLink).toHaveAttribute("href", "/api/auth/google/start");
    expect(googleLoginLink).toHaveAttribute("data-prefetch", "false");
  });

  it("shows an OAuth error passed through the URL", async () => {
    render(
      await LoginPage({
        searchParams: Promise.resolve({ error: "Google 로그인 상태 검증에 실패했습니다." }),
      }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Google 로그인 상태 검증에 실패했습니다.");
  });
});
