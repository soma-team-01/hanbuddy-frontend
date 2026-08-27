import { screen } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/routing";
import { getMyProfile } from "@/lib/api/users";
import { createMockProfile } from "@/test/factories";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import ProfilePage, { generateMetadata } from "./page";

vi.mock("next-intl/server", async () => {
  const [{ createTranslator }, { default: en }, { default: ko }] = await Promise.all([
    import("next-intl"),
    import("@/messages/en.json"),
    import("@/messages/ko.json"),
  ]);

  return {
    getTranslations: async ({ locale, namespace }: { locale: Locale; namespace: "Profile" }) =>
      createTranslator({ locale, messages: locale === "ko" ? ko : en, namespace }),
  };
});

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: vi.fn(),
}));

vi.mock("@/lib/api/users", () => ({
  getMyProfile: vi.fn(),
}));

const mockedGetMyProfile = vi.mocked(getMyProfile);
const mockedUseRouter = vi.mocked(useRouter);

const profile = createMockProfile({
  contactMethod: "WHATSAPP",
  contactCountryCode: "+1",
  contactIdentifier: "5550198",
});

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseRouter.mockReturnValue({ replace: vi.fn() } as unknown as ReturnType<
      typeof useRouter
    >);
    mockedGetMyProfile.mockResolvedValue({ status: "success", profile });
  });

  it("shows the saved profile information without editable fields", async () => {
    renderWithQueryClient(<ProfilePage />);

    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Sarah" })).toBeInTheDocument();
    expect(screen.queryByText("Tourist")).not.toBeInTheDocument();
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
    expect(screen.getByText("United States")).toBeInTheDocument();
    expect(screen.getByText("April 12, 1998")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
    expect(screen.getByText("+1 5550198")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp")).toHaveClass("text-primary", "md:text-sm");
    expect(screen.getByTestId("contact-method-divider")).toBeInTheDocument();
    expect(document.querySelector("[data-contact-method-icon]")).not.toBeInTheDocument();
    expect(
      screen.queryByText("This is how your profile appears across HanBuddy."),
    ).not.toBeInTheDocument();
    const profileSummary = screen.getByRole("region", { name: "Profile summary" });
    expect(profileSummary).toHaveClass("max-w-[520px]", "py-6", "md:px-8", "md:py-7");
    expect(profileSummary).not.toHaveClass("sm:px-8", "sm:py-7");
    expect(screen.queryByRole("link", { name: "Go back" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("links to the separate profile editing screen", async () => {
    renderWithQueryClient(<ProfilePage />);

    expect(await screen.findByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      "/en/my-page/edit",
    );
  });

  it("separates the saved messaging service name from the contact ID", async () => {
    mockedGetMyProfile.mockResolvedValue({
      status: "success",
      profile: createMockProfile({
        contactMethod: "LINE",
        contactCountryCode: null,
        contactIdentifier: "test",
      }),
    });

    renderWithQueryClient(<ProfilePage />);

    expect(await screen.findByText("LINE")).toHaveClass("text-primary");
    expect(screen.getByText("test")).toHaveClass("text-ink");
    expect(screen.getByTestId("contact-method-divider")).toBeInTheDocument();
    expect(document.querySelector("[data-contact-method-icon]")).not.toBeInTheDocument();
  });

  it("localizes the profile information in Korean", async () => {
    renderWithQueryClient(<ProfilePage />, { locale: "ko" });

    expect(screen.getByRole("heading", { name: "프로필" })).toBeInTheDocument();
    expect(await screen.findByText("미국")).toBeInTheDocument();
    expect(screen.queryByText("여행자")).not.toBeInTheDocument();
    expect(screen.getByText("1998년 4월 12일")).toBeInTheDocument();
    expect(screen.getByText("연락처")).toBeInTheDocument();
  });
});

describe("profile metadata", () => {
  it.each([
    ["en", "Profile | HanBuddy", "/en/my-page/profile"],
    ["ko", "프로필 | HanBuddy", "/ko/my-page/profile"],
  ] as const)("generates localized metadata for %s", async (locale, title, canonicalPath) => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: locale satisfies Locale }),
    });

    expect(metadata).toMatchObject({
      title,
      alternates: {
        canonical: `https://hanbuddy-frontend.vercel.app${canonicalPath}`,
        languages: {
          en: "https://hanbuddy-frontend.vercel.app/en/my-page/profile",
          ko: "https://hanbuddy-frontend.vercel.app/ko/my-page/profile",
          ja: "https://hanbuddy-frontend.vercel.app/ja/my-page/profile",
          "zh-Hans": "https://hanbuddy-frontend.vercel.app/zh-Hans/my-page/profile",
          "zh-Hant": "https://hanbuddy-frontend.vercel.app/zh-Hant/my-page/profile",
        },
      },
    });
  });
});
