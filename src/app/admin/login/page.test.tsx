import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import AdminLoginPage from "./page";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    prefetch,
    ...props
  }: {
    href: string;
    children: ReactNode;
    prefetch?: boolean;
  }) => (
    <a href={href} data-prefetch={String(prefetch)} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span data-image-alt={alt} />,
}));

async function renderPage(error?: string) {
  render(await AdminLoginPage({ searchParams: Promise.resolve({ error }) }));
}

describe("AdminLoginPage", () => {
  it("관리자 기능 안내와 Google 로그인 진입점을 제공한다", async () => {
    await renderPage();

    expect(screen.getByRole("heading", { name: /서비스의 신뢰를/ })).toBeInTheDocument();
    expect(screen.getByText("회원 상태 관리")).toBeInTheDocument();
    expect(screen.getByText("버디 자격 검토")).toBeInTheDocument();
    expect(screen.getByText("운영 이력 확인")).toBeInTheDocument();

    const loginLink = screen.getByRole("link", { name: "Google로 관리자 로그인" });
    expect(loginLink).toHaveAttribute("href", "/api/auth/google/start?intent=admin");
    expect(loginLink).toHaveAttribute("data-prefetch", "false");
  });

  it("허용된 로그인 오류를 사용자 메시지로 표시한다", async () => {
    await renderPage("adminAccountRequired");

    expect(screen.getByRole("alert")).toHaveTextContent("등록된 관리자 계정이 아닙니다.");
  });

  it("알 수 없는 오류 상세를 노출하지 않는다", async () => {
    await renderPage("raw-backend-error");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "로그인에 실패했습니다. 다시 시도해 주세요.",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent("raw-backend-error");
  });
});
