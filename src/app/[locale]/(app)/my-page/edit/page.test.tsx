import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/routing";
import { ApiClientError } from "@/lib/api/errors";
import { getMyProfile, updateMyProfile } from "@/lib/api/users";
import { uploadProfileImage } from "@/lib/images/presigned";
import { createQueryClient } from "@/lib/query/client";
import { userKeys } from "@/lib/query/users";
import { createMockProfile } from "@/test/factories";
import { IntlTestProvider } from "@/test/render-with-intl";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { EditProfileForm } from "./EditProfileForm";
import EditProfilePage, { generateMetadata } from "./page";

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

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({
    refresh,
    replace,
  }),
}));

vi.mock("@/lib/api/users", () => ({
  getMyProfile: vi.fn(),
  updateMyProfile: vi.fn(),
}));

vi.mock("@/lib/images/presigned", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/images/presigned")>()),
  uploadProfileImage: vi.fn(),
}));

const mockedGetMyProfile = vi.mocked(getMyProfile);
const mockedUpdateMyProfile = vi.mocked(updateMyProfile);

const profile = createMockProfile({
  contactMethod: "WHATSAPP",
});

describe("EditProfilePage", () => {
  beforeAll(() => {
    Object.defineProperty(URL, "createObjectURL", {
      value: vi.fn(() => "blob:profile-preview"),
      writable: true,
    });
    Object.defineProperty(URL, "revokeObjectURL", { value: vi.fn(), writable: true });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(uploadProfileImage).mockReset();
    mockedGetMyProfile.mockResolvedValue({ status: "success", profile });
  });

  function createImageFile(name = "me.png", type = "image/png") {
    return new File([new Uint8Array([1, 2, 3])], name, { type });
  }

  function renderFormForLocaleSwitch() {
    const queryClient = createQueryClient();
    const editProfileForm = <EditProfileForm profile={profile} />;
    const view = render(
      <QueryClientProvider client={queryClient}>
        <IntlTestProvider locale="en">{editProfileForm}</IntlTestProvider>
      </QueryClientProvider>,
    );

    return {
      ...view,
      switchToKorean() {
        view.rerender(
          <QueryClientProvider client={queryClient}>
            <IntlTestProvider locale="ko">{editProfileForm}</IntlTestProvider>
          </QueryClientProvider>,
        );
      },
    };
  }

  it("populates the form with the loaded profile", async () => {
    renderWithQueryClient(<EditProfilePage />);

    expect(await screen.findByRole("form")).toHaveClass("md:grid-cols-2", "max-w-[800px]");
    expect(screen.getByLabelText("Nickname")).toHaveValue("Sarah");
    expect(screen.getByLabelText("Date of birth")).toHaveValue("1998-04-12");
    expect(screen.getByPlaceholderText("Phone number")).toHaveValue("555-0198");
  });

  it("maps the user-not-found load error in Korean", async () => {
    mockedGetMyProfile.mockResolvedValue({
      status: "error",
      error: new ApiClientError({
        code: "USER404",
        status: 404,
        details: null,
        backendMessage: "raw profile load detail",
      }),
    });

    renderWithQueryClient(<EditProfilePage />, { locale: "ko" });

    expect(await screen.findByRole("alert")).toHaveTextContent("사용자 프로필을 찾을 수 없습니다.");
    expect(screen.queryByText("raw profile load detail")).not.toBeInTheDocument();
  });

  it.each([
    [
      "en",
      "Nickname",
      "Nationality",
      "Date of birth",
      "Contact Details",
      "Preferred Messaging App",
      "Add profile photo",
      "Save",
      "Go back",
    ],
    [
      "ko",
      "닉네임",
      "국적",
      "생년월일",
      "연락처 정보",
      "선호하는 메신저",
      "프로필 사진 추가",
      "저장",
      "뒤로 가기",
    ],
  ] as const)(
    "renders localized fields, actions, and accessibility names for %s",
    async (locale, name, nationality, age, contactHeading, messagingApp, addPhoto, save, back) => {
      renderWithQueryClient(<EditProfilePage />, { locale });

      expect(await screen.findByLabelText(name)).toHaveValue("Sarah");
      expect(screen.getByText(nationality)).toBeInTheDocument();
      expect(screen.getByLabelText(age)).toHaveValue("1998-04-12");
      expect(screen.getByRole("heading", { name: contactHeading })).toBeInTheDocument();
      expect(screen.getByText(messagingApp)).toBeInTheDocument();
      expect(screen.getByLabelText(addPhoto)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: save })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: back })).toHaveAttribute(
        "href",
        `/${locale}/my-page`,
      );
    },
  );

  it.each([
    [
      "en",
      "Nickname",
      "Save",
      "Enter a nickname from 2 to 30 characters without spaces at the beginning or end.",
    ],
    ["ko", "닉네임", "저장", "닉네임은 앞뒤 공백 없이 2자 이상 30자 이하로 입력해 주세요."],
  ] as const)("localizes profile validation for %s", async (locale, name, save, message) => {
    renderWithQueryClient(<EditProfilePage />, { locale });
    const nameInput = await screen.findByLabelText(name);
    fireEvent.change(nameInput, { target: { value: " " } });

    fireEvent.click(screen.getByRole("button", { name: save }));

    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(screen.getByRole("button", { name: save })).toBeInTheDocument();
  });

  it("relocalizes a stored validation error when the locale changes", () => {
    const { switchToKorean } = renderFormForLocaleSwitch();
    fireEvent.change(screen.getByLabelText("Nickname"), { target: { value: " " } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a nickname from 2 to 30 characters without spaces at the beginning or end.",
    );

    switchToKorean();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "닉네임은 앞뒤 공백 없이 2자 이상 30자 이하로 입력해 주세요.",
    );
  });

  it.each([
    ["en", "", "Date of birth", "Save", "Please enter a valid date of birth."],
    ["en", "2100-01-01", "Date of birth", "Save", "Please enter a valid date of birth."],
    ["ko", "", "생년월일", "저장", "올바른 생년월일을 입력해 주세요."],
    ["ko", "2100-01-01", "생년월일", "저장", "올바른 생년월일을 입력해 주세요."],
  ] as const)(
    "shows localized birth date validation after a real %s submit with value %s",
    async (locale, value, ageLabel, save, message) => {
      renderWithQueryClient(<EditProfilePage />, { locale });
      const ageInput = await screen.findByLabelText(ageLabel);
      fireEvent.change(ageInput, { target: { value } });

      fireEvent.click(screen.getByRole("button", { name: save }));

      expect(screen.getByRole("alert")).toHaveTextContent(message);
      expect(mockedUpdateMyProfile).not.toHaveBeenCalled();
    },
  );

  it.each([
    [
      "en",
      "Messaging phone number",
      "Save",
      "Enter a contact ID or number with at least 2 characters.",
    ],
    ["ko", "메신저 전화번호", "저장", "연락처 ID 또는 번호를 2자 이상 입력해 주세요."],
  ] as const)(
    "shows localized contact validation after a real %s submit",
    async (locale, contactLabel, save, message) => {
      renderWithQueryClient(<EditProfilePage />, { locale });
      const contactInput = await screen.findByLabelText(contactLabel);
      fireEvent.change(contactInput, { target: { value: "" } });

      fireEvent.click(screen.getByRole("button", { name: save }));

      expect(screen.getByRole("alert")).toHaveTextContent(message);
      expect(mockedUpdateMyProfile).not.toHaveBeenCalled();
    },
  );

  it("does not apply the Korean-only phone input to tourists", async () => {
    renderWithQueryClient(<EditProfilePage />);

    await screen.findByLabelText("Nickname");
    expect(screen.queryByPlaceholderText("010-XXXX-XXXX")).not.toBeInTheDocument();
    expect(screen.queryByText("+82")).not.toBeInTheDocument();
  });

  it("keeps the country selector for phone-based messaging apps", async () => {
    renderWithQueryClient(<EditProfilePage />);

    // 프로필의 연락 수단이 WHATSAPP이므로 국가 선택이 바로 렌더된다
    expect(await screen.findByLabelText("Messaging country code")).toBeInTheDocument();
  });

  it("submits the updated profile and returns to my page", async () => {
    mockedUpdateMyProfile.mockResolvedValue({
      status: "success",
      profile: { ...profile, displayName: "Sarah J." },
    });
    const { queryClient } = renderWithQueryClient(<EditProfilePage />);

    const nameInput = await screen.findByLabelText("Nickname");
    fireEvent.change(nameInput, { target: { value: "Sarah J." } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mockedUpdateMyProfile).toHaveBeenCalledWith({
        displayName: "Sarah J.",
        profileImageKey: "profiles/2026/07/06/uuid.webp",
        nationalityCode: "US",
        birthDate: "1998-04-12",
        contactMethod: "WHATSAPP",
        contactCountryCode: "+1",
        contactIdentifier: "555-0198",
      });
    });
    expect(uploadProfileImage).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/en/my-page");
    expect(queryClient.getQueryData(userKeys.me())).toEqual(
      expect.objectContaining({ displayName: "Sarah J." }),
    );
  });

  it("shows a local preview after selecting a profile image", async () => {
    renderWithQueryClient(<EditProfilePage />);

    fireEvent.change(await screen.findByLabelText("Add profile photo"), {
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
    mockedUpdateMyProfile.mockResolvedValue({
      status: "success",
      profile: { ...profile, profileImageKey: "profiles/2026/07/07/uuid.png" },
    });
    const file = createImageFile();

    renderWithQueryClient(<EditProfilePage />);
    fireEvent.change(await screen.findByLabelText("Add profile photo"), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(uploadProfileImage).toHaveBeenCalledWith(file));
    expect(mockedUpdateMyProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        profileImageKey: "profiles/2026/07/07/uuid.png",
      }),
    );
    expect(replace).toHaveBeenCalledWith("/en/my-page");
  });

  it("shows the upload error and skips saving when the image upload fails", async () => {
    vi.mocked(uploadProfileImage).mockRejectedValue(
      new ApiClientError({
        code: "IMAGE400_CONTENT_TYPE",
        status: 400,
        details: null,
        backendMessage: "지원하지 않는 이미지 형식입니다.",
        fallbackMessage: "프로필 이미지 업로드에 실패했습니다.",
      }),
    );

    renderWithQueryClient(<EditProfilePage />);
    fireEvent.change(await screen.findByLabelText("Add profile photo"), {
      target: { files: [createImageFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Only JPEG, PNG, or WebP images can be uploaded.",
      ),
    );
    expect(screen.queryByText("지원하지 않는 이미지 형식입니다.")).not.toBeInTheDocument();
    expect(mockedUpdateMyProfile).not.toHaveBeenCalled();
  });

  it("uses the current locale when an in-flight image upload fails", async () => {
    let rejectUpload!: (error: Error) => void;
    vi.mocked(uploadProfileImage).mockReturnValue(
      new Promise((_, reject) => {
        rejectUpload = reject;
      }),
    );
    const { switchToKorean } = renderFormForLocaleSwitch();
    fireEvent.change(screen.getByLabelText("Add profile photo"), {
      target: { files: [createImageFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(uploadProfileImage).toHaveBeenCalledTimes(1));

    switchToKorean();
    await act(async () => rejectUpload(new Error("upload failed")));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "프로필 이미지를 업로드하지 못했습니다. 다시 시도해 주세요.",
    );
  });

  it("rejects unsupported image types at selection time", async () => {
    renderWithQueryClient(<EditProfilePage />);

    fireEvent.change(await screen.findByLabelText("Add profile photo"), {
      target: { files: [createImageFile("me.gif", "image/gif")] },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Only JPEG, PNG, or WebP images can be uploaded.",
    );
    expect(screen.queryByAltText("Selected profile photo preview")).not.toBeInTheDocument();
  });

  it("shows a localized safe message when saving fails", async () => {
    mockedUpdateMyProfile.mockResolvedValue({
      status: "error",
      error: new ApiClientError({
        code: "VALIDATION400_FORMAT",
        status: 400,
        details: { field: "nationality" },
        backendMessage: "국적 코드는 영문 대문자 2자리여야 합니다",
        fallbackMessage: "국적 코드는 영문 대문자 2자리여야 합니다",
      }),
    });
    renderWithQueryClient(<EditProfilePage />);

    await screen.findByLabelText("Nickname");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Check the format of the entered information.");
    expect(alert).not.toHaveTextContent("국적 코드는 영문 대문자 2자리여야 합니다");
    expect(replace).not.toHaveBeenCalledWith("/en/my-page");
  });

  it("uses the current locale when an in-flight save fails", async () => {
    let resolveSave!: (result: Awaited<ReturnType<typeof updateMyProfile>>) => void;
    mockedUpdateMyProfile.mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve;
      }),
    );
    const { switchToKorean } = renderFormForLocaleSwitch();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(mockedUpdateMyProfile).toHaveBeenCalledTimes(1));

    switchToKorean();
    await act(async () => {
      resolveSave({
        status: "error",
        error: new ApiClientError({
          code: null,
          status: null,
          details: null,
          backendMessage: null,
          fallbackMessage: "raw backend detail",
        }),
      });
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "프로필을 저장하지 못했습니다. 다시 시도해 주세요.",
    );
    expect(screen.queryByText("raw backend detail")).not.toBeInTheDocument();
  });

  it("redirects to login when the save request is unauthenticated", async () => {
    mockedUpdateMyProfile.mockResolvedValue({ status: "unauthenticated" });
    renderWithQueryClient(<EditProfilePage />);

    await screen.findByLabelText("Nickname");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/en/login");
    });
  });

  it("redirects to login when the profile load is unauthenticated", async () => {
    mockedGetMyProfile.mockResolvedValue({ status: "unauthenticated" });
    renderWithQueryClient(<EditProfilePage />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/en/login");
    });
  });
});

describe("edit profile metadata", () => {
  it.each([
    ["en", "Edit profile | HanBuddy", "/en/my-page/edit"],
    ["ko", "프로필 수정 | HanBuddy", "/ko/my-page/edit"],
  ] as const)("generates localized metadata for %s", async (locale, title, canonicalPath) => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: locale satisfies Locale }),
    });

    expect(metadata).toMatchObject({
      title,
      alternates: {
        canonical: `https://hanbuddy-frontend.vercel.app${canonicalPath}`,
        languages: {
          en: "https://hanbuddy-frontend.vercel.app/en/my-page/edit",
          ko: "https://hanbuddy-frontend.vercel.app/ko/my-page/edit",
          ja: "https://hanbuddy-frontend.vercel.app/ja/my-page/edit",
          "zh-Hans": "https://hanbuddy-frontend.vercel.app/zh-Hans/my-page/edit",
          "zh-Hant": "https://hanbuddy-frontend.vercel.app/zh-Hant/my-page/edit",
        },
      },
    });
  });
});
