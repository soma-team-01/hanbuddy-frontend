import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/routing";
import { renderWithIntl } from "@/test/render-with-intl";
import LoginPage, { generateMetadata } from "./page";

vi.mock("next-intl/server", async () => {
  const [{ createTranslator }, { default: en }, { default: ko }] = await Promise.all([
    import("next-intl"),
    import("@/messages/en.json"),
    import("@/messages/ko.json"),
  ]);

  return {
    getTranslations: async ({ locale, namespace }: { locale: Locale; namespace: "Auth" }) =>
      createTranslator({ locale, messages: locale === "ko" ? ko : en, namespace }),
  };
});

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

async function renderLogin(locale: Locale, searchParams: { error?: string | string[] } = {}) {
  renderWithIntl(
    await LoginPage({
      params: Promise.resolve({ locale }),
      searchParams: Promise.resolve(searchParams),
    }),
    { locale },
  );
}

describe("LoginPage", () => {
  it.each([
    ["en", "Experience Korea like a local.", "Continue with Google", "Privacy Policy"],
    ["ko", "현지인처럼 한국을 경험해 보세요.", "Google로 계속하기", "개인정보 처리방침"],
  ] as const)(
    "renders localized authentication content for %s",
    async (locale, heading, action, policy) => {
      await renderLogin(locale);

      expect(screen.getByRole("main")).toHaveClass("w-full");
      expect(screen.getByRole("heading", { name: heading })).toHaveClass("font-display");
      expect(screen.getByText(policy)).toBeInTheDocument();
      const googleLoginLink = screen.getByRole("link", { name: action });
      expect(googleLoginLink).toHaveAttribute("href", `/api/auth/google/start?locale=${locale}`);
      expect(googleLoginLink).toHaveAttribute("data-prefetch", "false");
    },
  );

  it.each([
    ["en", "invalidState", "We couldn't verify your Google sign-in session."],
    ["ko", "invalidState", "Google 로그인 상태를 확인할 수 없습니다."],
  ] as const)("maps a finite OAuth error code for %s", async (locale, error, message) => {
    await renderLogin(locale, { error });

    expect(screen.getByRole("alert")).toHaveTextContent(message);
  });

  it.each(["en", "ko"] as const)(
    "does not reflect an arbitrary OAuth query value in %s",
    async (locale) => {
      const rawError = "<script>raw backend detail</script>";
      await renderLogin(locale, { error: rawError });

      const alert = screen.getByRole("alert");
      expect(alert).not.toHaveTextContent(rawError);
      expect(alert).not.toHaveTextContent("raw backend detail");
      expect(alert).toHaveTextContent(
        locale === "ko"
          ? "로그인 중 문제가 발생했습니다. 다시 시도해 주세요."
          : "Something went wrong during sign-in. Please try again.",
      );
    },
  );

  it.each([
    ["en", "Log in | HanBuddy", "/en/login"],
    ["ko", "로그인 | HanBuddy", "/ko/login"],
  ] as const)("generates localized metadata for %s", async (locale, title, canonicalPath) => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale }) });

    expect(metadata).toMatchObject({
      title,
      alternates: {
        canonical: `https://hanbuddy-frontend.vercel.app${canonicalPath}`,
        languages: {
          en: "https://hanbuddy-frontend.vercel.app/en/login",
          ko: "https://hanbuddy-frontend.vercel.app/ko/login",
        },
      },
    });
  });
});
