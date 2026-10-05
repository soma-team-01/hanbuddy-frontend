import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/routing";
import { expectLocalizedMetadata } from "@/test/expect-localized-metadata";
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
    mockedGetMyProfile.mockReset();
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

  it("saves a changed buddy account as an enum and string, preserving the image key", async () => {
    const buddy = createMockProfile({
      userType: "BUDDY",
      contactMethod: "PHONE",
      contactCountryCode: "+82",
      contactIdentifier: "021234567",
      bankAccount: { bank: "KB", bankCode: "004", bankName: "KB국민은행", accountNumber: "001234" },
    });
    mockedGetMyProfile.mockResolvedValue({ status: "success", profile: buddy });
    mockedUpdateMyProfile.mockResolvedValue({ status: "success", profile: buddy });
    renderWithQueryClient(<EditProfilePage />);
    fireEvent.change(await screen.findByLabelText("Account number"), {
      target: { value: "00-987 654" },
    });
    expect(screen.getByLabelText("Account number")).toHaveValue("00987654");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(mockedUpdateMyProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          bankName: "KB",
          bankAccountNumber: "00987654",
          profileImageKey: buddy.profileImageKey,
          contactIdentifier: "021234567",
        }),
      ),
    );
  });

  it("registers a previously missing bank account and refreshes the own-profile cache", async () => {
    const buddy = createMockProfile({
      userType: "BUDDY",
      contactMethod: "PHONE",
      contactCountryCode: "+82",
      contactIdentifier: "01012345678",
      bankAccount: null,
    });
    const updated = {
      ...buddy,
      bankAccount: {
        bank: "KB" as const,
        bankCode: "004",
        bankName: "KB국민은행",
        accountNumber: "001234",
      },
    };
    mockedGetMyProfile.mockResolvedValue({ status: "success", profile: buddy });
    mockedUpdateMyProfile.mockResolvedValue({ status: "success", profile: updated });
    const { queryClient } = renderWithQueryClient(<EditProfilePage />);
    fireEvent.click(await screen.findByRole("combobox", { name: "Bank" }));
    fireEvent.click(screen.getByRole("option", { name: "KB국민은행" }));
    fireEvent.change(screen.getByLabelText("Account number"), { target: { value: "001234" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(queryClient.getQueryData(userKeys.me())).toEqual(updated));
    expect(mockedUpdateMyProfile).toHaveBeenCalledWith(
      expect.objectContaining({ bankName: "KB", bankAccountNumber: "001234" }),
    );
  });

  it("requires a supported bank when editing a legacy account number", async () => {
    mockedGetMyProfile.mockResolvedValue({
      status: "success",
      profile: createMockProfile({
        userType: "BUDDY",
        contactMethod: "PHONE",
        contactCountryCode: "+82",
        contactIdentifier: "01012345678",
        bankAccount: {
          bank: null,
          bankCode: null,
          bankName: "Legacy Bank",
          accountNumber: "001234",
        },
      }),
    });
    renderWithQueryClient(<EditProfilePage />);
    fireEvent.change(await screen.findByLabelText("Account number"), {
      target: { value: "009876" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Select a bank and enter your account number.",
    );
    expect(mockedUpdateMyProfile).not.toHaveBeenCalled();
  });

  it.each(["KB", null] as const)(
    "omits unchanged bank fields even for legacy bank %s",
    async (bank) => {
      const buddy = createMockProfile({
        userType: "BUDDY",
        contactMethod: "PHONE",
        contactCountryCode: "+82",
        contactIdentifier: "07012345678",
        bankAccount: {
          bank,
          bankCode: bank ? "004" : null,
          bankName: bank ? "KB국민은행" : "Legacy Bank",
          accountNumber: "001-234",
        },
      });
      mockedGetMyProfile.mockResolvedValue({ status: "success", profile: buddy });
      mockedUpdateMyProfile.mockResolvedValue({ status: "success", profile: buddy });
      renderWithQueryClient(<EditProfilePage />);
      expect(await screen.findByLabelText("Account number")).toHaveValue("001234");
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      await waitFor(() => expect(mockedUpdateMyProfile).toHaveBeenCalled());
      expect(mockedUpdateMyProfile.mock.calls[0][0]).not.toHaveProperty("bankName");
      expect(mockedUpdateMyProfile.mock.calls[0][0]).not.toHaveProperty("bankAccountNumber");
    },
  );

  it.each(["", "abc", "---", "1".repeat(51)])(
    "rejects an invalid changed account %s",
    async (value) => {
      mockedGetMyProfile.mockResolvedValue({
        status: "success",
        profile: createMockProfile({
          userType: "BUDDY",
          contactMethod: "PHONE",
          contactCountryCode: "+82",
          contactIdentifier: "01012345678",
          bankAccount: {
            bank: "KB",
            bankCode: "004",
            bankName: "KB국민은행",
            accountNumber: "001234",
          },
        }),
      });
      renderWithQueryClient(<EditProfilePage />);
      fireEvent.change(await screen.findByLabelText("Account number"), { target: { value } });
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(mockedUpdateMyProfile).not.toHaveBeenCalled();
    },
  );

  it.each(["LINE", "WECHAT"] as const)(
    "preserves a tourist's legacy %s contact and never sends bank fields",
    async (contactMethod) => {
      const tourist = createMockProfile({ contactMethod, contactIdentifier: "old-contact" });
      mockedGetMyProfile.mockResolvedValue({ status: "success", profile: tourist });
      mockedUpdateMyProfile.mockResolvedValue({ status: "success", profile: tourist });
      renderWithQueryClient(<EditProfilePage />);
      expect(await screen.findByLabelText("Messaging app ID")).toHaveValue("old-contact");
      expect(screen.queryByLabelText("Account number")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      await waitFor(() =>
        expect(mockedUpdateMyProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            contactMethod,
            contactIdentifier: "old-contact",
            contactCountryCode: "",
          }),
        ),
      );
      expect(mockedUpdateMyProfile.mock.calls[0][0]).not.toHaveProperty("bankName");
    },
  );

  it("populates the form with the loaded profile", async () => {
    renderWithQueryClient(<EditProfilePage />);

    expect(await screen.findByRole("form")).toHaveClass("max-w-[900px]", "rounded-[2rem]");
    expect(screen.getByLabelText("Nickname")).toHaveValue("Sarah");
    expect(screen.getByLabelText("Email")).toHaveValue("user@example.com");
    expect(screen.getByLabelText("Email")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Email")).toHaveClass("bg-panel-raised");
    expect(screen.queryByRole("heading", { name: "Sarah" })).not.toBeInTheDocument();
    expect(screen.getByTestId("edit-profile-layout")).toHaveClass(
      "lg:grid-cols-[180px_minmax(0,1fr)]",
    );
    expect(within(screen.getByRole("form")).getByRole("button", { name: "Save" })).toBeVisible();
    expect(screen.getByTestId("page-header")).not.toContainElement(
      screen.getByRole("button", { name: "Save" }),
    );
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
      "Contact",
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
      "연락처",
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
        `/${locale}/my-page/profile`,
      );
    },
  );

  it.each([
    [
      "en",
      "Nickname",
      "Save",
      "Enter a nickname using 2–30 English letters, with only a single space, hyphen (-), or apostrophe (') between words.",
    ],
    [
      "ko",
      "닉네임",
      "저장",
      "닉네임은 2~30자의 영문으로 입력하고, 단어 사이에는 공백, 하이픈(-), 작은따옴표(')만 사용해 주세요.",
    ],
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
      "Enter a nickname using 2–30 English letters, with only a single space, hyphen (-), or apostrophe (') between words.",
    );

    switchToKorean();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "닉네임은 2~30자의 영문으로 입력하고, 단어 사이에는 공백, 하이픈(-), 작은따옴표(')만 사용해 주세요.",
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
    ["en", "Phone number", "Save", "Enter a contact ID or number with at least 2 characters."],
    ["ko", "전화번호", "저장", "연락처 ID 또는 번호를 2자 이상 입력해 주세요."],
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
    expect(await screen.findByLabelText("Country code")).toBeInTheDocument();
  });

  it("offers the same four contact methods as tourist signup", async () => {
    renderWithQueryClient(<EditProfilePage />);

    const options = await screen.findByTestId("messaging-app-options");
    expect(within(options).getAllByRole("button")).toHaveLength(4);
    for (const name of ["WhatsApp", "KakaoTalk", "Instagram", "Phone Number"]) {
      expect(within(options).getByRole("button", { name })).toBeInTheDocument();
    }
    expect(within(options).queryByText("Line")).not.toBeInTheDocument();
    expect(within(options).queryByText("WeChat")).not.toBeInTheDocument();
  });

  it("edits buddy domestic phone numbers without showing a country code", async () => {
    const buddy = createMockProfile({
      userType: "BUDDY",
      contactMethod: "PHONE",
      contactCountryCode: "+82",
      contactIdentifier: "01012345678",
    });
    mockedGetMyProfile.mockResolvedValue({ status: "success", profile: buddy });
    mockedUpdateMyProfile.mockResolvedValue({ status: "success", profile: buddy });
    renderWithQueryClient(<EditProfilePage />);

    expect(await screen.findByLabelText("Phone number")).toHaveValue("01012345678");
    expect(screen.queryByTestId("messaging-app-options")).not.toBeInTheDocument();
    expect(screen.queryByText("Preferred Messaging App")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Country code")).not.toBeInTheDocument();
    expect(screen.queryByText("+82")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mockedUpdateMyProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          contactMethod: "PHONE",
          contactCountryCode: "+82",
          contactIdentifier: "01012345678",
        }),
      ),
    );
  });

  it("requires a new domestic number instead of relabeling a buddy's overseas phone", async () => {
    mockedGetMyProfile.mockResolvedValue({
      status: "success",
      profile: createMockProfile({
        userType: "BUDDY",
        contactMethod: "PHONE",
        contactCountryCode: "+1",
        contactIdentifier: "2025550114",
      }),
    });
    renderWithQueryClient(<EditProfilePage />);
    expect(await screen.findByLabelText("Phone number")).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(mockedUpdateMyProfile).not.toHaveBeenCalled();
  });

  it("rejects too-short buddy phone numbers before saving", async () => {
    mockedGetMyProfile.mockResolvedValue({
      status: "success",
      profile: createMockProfile({
        userType: "BUDDY",
        contactMethod: "PHONE",
        contactCountryCode: "+82",
        contactIdentifier: "01012345678",
      }),
    });
    renderWithQueryClient(<EditProfilePage />);
    fireEvent.change(await screen.findByLabelText("Phone number"), {
      target: { value: "12345" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a Korean phone number");
    expect(mockedUpdateMyProfile).not.toHaveBeenCalled();
  });

  it.each(["BUDDY"] as const)(
    "does not reinterpret a legacy %s LINE ID as a new contact",
    async (userType) => {
      mockedGetMyProfile.mockResolvedValue({
        status: "success",
        profile: createMockProfile({
          userType,
          contactMethod: "LINE",
          contactIdentifier: "old-line-id",
        }),
      });
      renderWithQueryClient(<EditProfilePage />);

      await screen.findByRole("form");
      expect(screen.queryByDisplayValue("old-line-id")).not.toBeInTheDocument();
      expect(screen.getByText(/Please enter your contact details again/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(mockedUpdateMyProfile).not.toHaveBeenCalled();
    },
  );

  it.each(["KakaoTalk", "Instagram"])(
    "saves %s IDs without an unrelated phone country code",
    async (name) => {
      mockedUpdateMyProfile.mockResolvedValue({ status: "success", profile });
      renderWithQueryClient(<EditProfilePage />);
      fireEvent.click(await screen.findByRole("button", { name }));
      fireEvent.change(screen.getByLabelText("Messaging app ID"), { target: { value: "new-id" } });
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      await waitFor(() =>
        expect(mockedUpdateMyProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            contactMethod: name.toUpperCase(),
            contactCountryCode: "",
            contactIdentifier: "new-id",
          }),
        ),
      );
    },
  );

  it("submits the updated profile and returns to my page", async () => {
    mockedUpdateMyProfile.mockResolvedValue({
      status: "success",
      profile: { ...profile, displayName: "Sarah Jane" },
    });
    const { queryClient } = renderWithQueryClient(<EditProfilePage />);

    const nameInput = await screen.findByLabelText("Nickname");
    fireEvent.change(nameInput, { target: { value: "Sarah Jane" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mockedUpdateMyProfile).toHaveBeenCalledWith({
        displayName: "Sarah Jane",
        profileImageKey: "profiles/2026/07/06/uuid.webp",
        nationalityCode: "US",
        birthDate: "1998-04-12",
        contactMethod: "WHATSAPP",
        contactCountryCode: "+1",
        contactIdentifier: "555-0198",
      });
    });
    expect(uploadProfileImage).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/en/my-page/profile");
    expect(queryClient.getQueryData(userKeys.me())).toEqual(
      expect.objectContaining({ displayName: "Sarah Jane" }),
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
    expect(replace).toHaveBeenCalledWith("/en/my-page/profile");
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

  it("stays on the form with an upload error when the image upload is rejected with 401", async () => {
    vi.mocked(uploadProfileImage).mockRejectedValue(
      new ApiClientError({
        code: "TOKEN401",
        status: 401,
        details: null,
        backendMessage: "토큰이 유효하지 않습니다.",
        fallbackMessage: "프로필 이미지 업로드 URL을 발급받지 못했습니다.",
      }),
    );

    renderWithQueryClient(<EditProfilePage />);
    fireEvent.change(await screen.findByLabelText("Add profile photo"), {
      target: { files: [createImageFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not upload the profile photo. Please try again.",
    );
    expect(screen.queryByText("Please sign in again to continue.")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(mockedUpdateMyProfile).not.toHaveBeenCalled();
    expect(screen.getByAltText("Selected profile photo preview")).toBeInTheDocument();
  });

  it("redirects to login when the image upload 401 comes from an ended session", async () => {
    vi.mocked(uploadProfileImage).mockRejectedValue(
      new ApiClientError({
        code: "TOKEN401",
        status: 401,
        details: null,
        backendMessage: "토큰이 유효하지 않습니다.",
      }),
    );
    mockedGetMyProfile
      .mockResolvedValueOnce({ status: "success", profile })
      .mockResolvedValueOnce({ status: "unauthenticated" });

    renderWithQueryClient(<EditProfilePage />);
    fireEvent.change(await screen.findByLabelText("Add profile photo"), {
      target: { files: [createImageFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/en/login");
    });
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
    expect(replace).not.toHaveBeenCalledWith("/en/my-page/profile");
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

    expectLocalizedMetadata(metadata, title, canonicalPath, "/my-page/edit");
  });
});
