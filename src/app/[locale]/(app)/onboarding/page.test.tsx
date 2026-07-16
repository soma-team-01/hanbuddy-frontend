import { screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import type { Locale } from "@/i18n/routing";
import { uploadProfileImage } from "@/lib/images/presigned";
import { renderWithIntl } from "@/test/render-with-intl";
import { OnboardingForm } from "./OnboardingForm";
import { generateMetadata } from "./page";

vi.mock("next-intl/server", async () => {
  const [{ createTranslator }, { default: en }, { default: ko }] = await Promise.all([
    import("next-intl"),
    import("@/messages/en.json"),
    import("@/messages/ko.json"),
  ]);

  return {
    getTranslations: async ({ locale, namespace }: { locale: Locale; namespace: "Onboarding" }) =>
      createTranslator({ locale, messages: locale === "ko" ? ko : en, namespace }),
  };
});

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/lib/images/presigned", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/images/presigned")>()),
  uploadProfileImage: vi.fn(),
}));

describe("OnboardingForm", () => {
  it.each([
    [
      "en",
      "I am a...",
      "Tourist",
      "Personal Information",
      "Nationality",
      "Age",
      "e.g. 25",
      "Contact Methods",
      "Preferred Messaging App",
      "Add profile photo",
      "Complete Registration",
      "Close",
    ],
    [
      "ko",
      "역할을 선택해 주세요",
      "여행자",
      "개인 정보",
      "국적",
      "나이",
      "예: 25",
      "연락 방법",
      "선호하는 메신저",
      "프로필 사진 추가",
      "가입 완료",
      "닫기",
    ],
  ] as const)(
    "renders localized fields, actions, and accessibility names for %s",
    (
      locale,
      roleHeading,
      tourist,
      personalHeading,
      nationality,
      age,
      agePlaceholder,
      contactHeading,
      messagingApp,
      addPhoto,
      submit,
      close,
    ) => {
      renderWithIntl(<OnboardingForm />, { locale });

      expect(screen.getByRole("heading", { name: roleHeading })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: tourist })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: personalHeading })).toBeInTheDocument();
      expect(screen.getByText(nationality)).toBeInTheDocument();
      expect(screen.getByLabelText(age)).toHaveAttribute("placeholder", agePlaceholder);
      expect(screen.getByRole("heading", { name: contactHeading })).toBeInTheDocument();
      expect(screen.getByText(messagingApp)).toBeInTheDocument();
      expect(screen.getByLabelText(addPhoto)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: submit })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: close })).toHaveAttribute("href", `/${locale}/login`);
    },
  );

  it.each([
    ["en", "Please select a nationality."],
    ["ko", "국적을 선택해 주세요."],
  ] as const)("localizes validation for %s", (locale, message) => {
    const { container } = renderWithIntl(<OnboardingForm />, { locale });

    fireEvent.submit(container.querySelector("form")!);

    expect(screen.getByRole("alert")).toHaveTextContent(message);
  });

  it("does not render the Korean Phone Number field", () => {
    renderWithIntl(<OnboardingForm />);
    expect(screen.queryByText("Korean Phone Number")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Korean phone number")).not.toBeInTheDocument();
  });

  it("keeps the country selector for tourists on phone-based apps", () => {
    renderWithIntl(<OnboardingForm />);
    fireEvent.click(screen.getByRole("button", { name: "WhatsApp" }));
    expect(screen.getByLabelText("Messaging country code")).toBeInTheDocument();
    expect(screen.queryByText("+82")).not.toBeInTheDocument();
  });

  it("fixes +82 without a country selector for buddies", () => {
    renderWithIntl(<OnboardingForm />);
    fireEvent.click(screen.getByRole("button", { name: "Buddy" }));
    fireEvent.click(screen.getByRole("button", { name: "WhatsApp" }));
    expect(screen.queryByLabelText("Messaging country code")).not.toBeInTheDocument();
    expect(screen.getByText("+82")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("010-XXXX-XXXX")).toBeInTheDocument();
  });

  it("clears the contact input when the role changes", () => {
    renderWithIntl(<OnboardingForm />);
    fireEvent.click(screen.getByRole("button", { name: "WhatsApp" }));
    fireEvent.change(screen.getByLabelText("Messaging phone number"), {
      target: { value: "5551234" },
    });
    expect(screen.getByLabelText("Messaging phone number")).toHaveValue("5551234");
    fireEvent.click(screen.getByRole("button", { name: "Buddy" }));
    expect(screen.getByLabelText("Messaging phone number")).toHaveValue("");
  });
});

describe("OnboardingForm profile image", () => {
  beforeAll(() => {
    // jsdom에는 createObjectURL/scrollIntoView가 없어 스텁으로 대체한다
    Object.defineProperty(URL, "createObjectURL", {
      value: vi.fn(() => "blob:profile-preview"),
      writable: true,
    });
    Object.defineProperty(URL, "revokeObjectURL", { value: vi.fn(), writable: true });
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(uploadProfileImage).mockReset();
  });

  function createImageFile(name = "me.png", type = "image/png") {
    return new File([new Uint8Array([1, 2, 3])], name, { type });
  }

  function fillRequiredFields() {
    fireEvent.click(screen.getByRole("button", { name: "Nationality" }));
    fireEvent.change(screen.getByLabelText("Search country"), {
      target: { value: "United States" },
    });
    fireEvent.click(screen.getByText("United States"));
    fireEvent.change(screen.getByPlaceholderText("e.g. 25"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Messaging app ID"), {
      target: { value: "line_user" },
    });
  }

  it("shows a local preview after selecting a profile image", () => {
    renderWithIntl(<OnboardingForm />);

    fireEvent.change(screen.getByLabelText("Add profile photo"), {
      target: { files: [createImageFile()] },
    });

    expect(screen.getByAltText("Selected profile photo preview")).toBeInTheDocument();
  });

  it("uploads the selected image and submits its key as profileImageKey", async () => {
    vi.mocked(uploadProfileImage).mockResolvedValue({
      uploadUrl: "https://bucket.s3.amazonaws.com/profiles/2026/07/07/uuid.png?signed",
      imageKey: "profiles/2026/07/07/uuid.png",
      imageUrl: "https://static.hanbuddy.com/profiles/2026/07/07/uuid.png",
      expiresInSeconds: 300,
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          isSuccess: true,
          code: "201",
          message: "요청이 성공했습니다.",
          result: { registered: true, userType: "TOURIST" },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderWithIntl(<OnboardingForm />);
    fillRequiredFields();
    const file = createImageFile();
    fireEvent.change(screen.getByLabelText("Add profile photo"), { target: { files: [file] } });

    fireEvent.click(screen.getByRole("button", { name: /Complete Registration/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(uploadProfileImage).toHaveBeenCalledWith(file);
    const [signupUrl, signupInit] = fetchMock.mock.calls[0];
    expect(signupUrl).toBe("/api/auth/google/signup");
    expect(JSON.parse(signupInit.body)).toMatchObject({
      profileImageKey: "profiles/2026/07/07/uuid.png",
    });
  });

  it("submits without profileImageKey when no image is selected", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          isSuccess: true,
          code: "201",
          message: "요청이 성공했습니다.",
          result: { registered: true, userType: "TOURIST" },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderWithIntl(<OnboardingForm />);
    fillRequiredFields();

    fireEvent.click(screen.getByRole("button", { name: /Complete Registration/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(uploadProfileImage).not.toHaveBeenCalled();
    const [, signupInit] = fetchMock.mock.calls[0];
    expect(JSON.parse(signupInit.body)).not.toHaveProperty("profileImageKey");
  });

  it("shows the upload error and skips signup when the image upload fails", async () => {
    vi.mocked(uploadProfileImage).mockRejectedValue(
      new Error("프로필 이미지 업로드에 실패했습니다."),
    );
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderWithIntl(<OnboardingForm />);
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Add profile photo"), {
      target: { files: [createImageFile()] },
    });

    fireEvent.click(screen.getByRole("button", { name: /Complete Registration/ }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Could not upload the profile photo. Please try again.",
      ),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not re-upload the same file when resubmitting after a signup failure", async () => {
    vi.mocked(uploadProfileImage).mockResolvedValue({
      uploadUrl: "https://bucket.s3.amazonaws.com/profiles/2026/07/07/uuid.png?signed",
      imageKey: "profiles/2026/07/07/uuid.png",
      imageUrl: "https://static.hanbuddy.com/profiles/2026/07/07/uuid.png",
      expiresInSeconds: 300,
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ isSuccess: false, code: "COMMON500", message: "서버 오류입니다." }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            isSuccess: true,
            code: "201",
            message: "요청이 성공했습니다.",
            result: { registered: true, userType: "TOURIST" },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    renderWithIntl(<OnboardingForm />);
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Add profile photo"), {
      target: { files: [createImageFile()] },
    });

    fireEvent.click(screen.getByRole("button", { name: /Complete Registration/ }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Could not complete registration. Please try again.",
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: /Complete Registration/ }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    expect(uploadProfileImage).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
      profileImageKey: "profiles/2026/07/07/uuid.png",
    });
  });

  it("rejects images over the size limit at selection time", () => {
    renderWithIntl(<OnboardingForm />);

    const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", {
      type: "image/png",
    });
    fireEvent.change(screen.getByLabelText("Add profile photo"), {
      target: { files: [oversized] },
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Profile photos must be 5MB or smaller.");
    expect(screen.queryByAltText("Selected profile photo preview")).not.toBeInTheDocument();
  });

  it("rejects unsupported image types at selection time", () => {
    renderWithIntl(<OnboardingForm />);

    fireEvent.change(screen.getByLabelText("Add profile photo"), {
      target: { files: [createImageFile("me.gif", "image/gif")] },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Only JPEG, PNG, or WebP images can be uploaded.",
    );
    expect(screen.queryByAltText("Selected profile photo preview")).not.toBeInTheDocument();
  });
});

describe("onboarding metadata", () => {
  it.each([
    ["en", "Complete your profile | HanBuddy", "/en/onboarding"],
    ["ko", "프로필 설정 | HanBuddy", "/ko/onboarding"],
  ] as const)("generates localized metadata for %s", async (locale, title, canonicalPath) => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: locale satisfies Locale }),
    });

    expect(metadata).toMatchObject({
      title,
      alternates: {
        canonical: `https://hanbuddy-frontend.vercel.app${canonicalPath}`,
        languages: {
          en: "https://hanbuddy-frontend.vercel.app/en/onboarding",
          ko: "https://hanbuddy-frontend.vercel.app/ko/onboarding",
        },
      },
    });
  });
});
