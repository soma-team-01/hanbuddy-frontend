import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import type { Locale } from "@/i18n/routing";
import * as countries from "@/lib/countries";
import { uploadProfileImage } from "@/lib/images/presigned";
import { IntlTestProvider, renderWithIntl } from "@/test/render-with-intl";
import { OnboardingForm } from "./OnboardingForm";
import { generateMetadata } from "./page";

const routerMocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
}));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  routerMocks.refresh.mockClear();
  routerMocks.replace.mockClear();
});

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
  useRouter: () => routerMocks,
}));

vi.mock("@/lib/images/presigned", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/images/presigned")>()),
  uploadProfileImage: vi.fn(),
}));

describe("OnboardingForm", () => {
  it.each([
    [
      "en",
      "Welcome, traveler",
      "A few details, then Korea is yours to explore.",
      "Help local buddies welcome you well and reach you when an experience is confirmed.",
      "Choose a clear face photo so your buddy can recognize you when you meet.",
      "About you",
      "Nationality",
      "Date of birth",
      "How should buddies reach you?",
      "Preferred Messaging App",
      "Add profile photo",
      "Sign up",
      "Close",
    ],
    [
      "ko",
      "여행자님, 반가워요",
      "몇 가지만 알려주면, 한버디 여행 준비가 끝나요.",
      "활동이 확정되었을 때 버디가 여행자님을 잘 맞이하고 연락할 수 있도록 사용해요.",
      "만날 때 버디가 알아볼 수 있도록 얼굴이 선명한 사진을 선택해 주세요.",
      "기본 정보",
      "국적",
      "생년월일",
      "버디가 어떻게 연락하면 될까요?",
      "선호하는 메신저",
      "프로필 사진 추가",
      "회원가입",
      "닫기",
    ],
  ] as const)(
    "renders localized fields, actions, and accessibility names for %s",
    (
      locale,
      eyebrow,
      headline,
      description,
      profilePhotoHint,
      personalHeading,
      nationality,
      birthDate,
      contactHeading,
      messagingApp,
      addPhoto,
      submit,
      close,
    ) => {
      renderWithIntl(<OnboardingForm googleProfile={{ name: "Google Traveler" }} />, { locale });

      expect(screen.getByRole("form")).toHaveClass("max-w-[1120px]");
      expect(screen.getByText(eyebrow)).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: headline })).toHaveClass("lg:whitespace-nowrap");
      expect(screen.getByText(description)).toHaveClass("lg:whitespace-nowrap");
      expect(screen.getByText(profilePhotoHint)).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", { name: locale === "ko" ? "닉네임" : "Nickname" }),
      ).toHaveValue("Google Traveler");
      expect(screen.queryByRole("button", { name: "Tourist" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Buddy" })).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { name: personalHeading })).toBeInTheDocument();
      expect(screen.getByText(nationality)).toBeInTheDocument();
      expect(screen.getByLabelText(birthDate)).toHaveAttribute("type", "date");
      expect(screen.getByTestId("onboarding-personal-fields")).not.toHaveClass("sm:grid-cols-2");
      expect(
        screen.queryByText(
          locale === "ko" ? "연령 확인을 위해서만 사용해요." : "Used only to confirm your age.",
        ),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { name: contactHeading })).toBeInTheDocument();
      expect(screen.getByText(messagingApp)).toBeInTheDocument();
      expect(screen.getByLabelText(addPhoto)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: submit })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: close })).toHaveAttribute("href", `/${locale}/login`);
    },
  );

  it("adds the local birth date limit only after client mount", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-06T12:00:00+09:00"));

    const serverHtml = renderToString(
      <IntlTestProvider locale="en">
        <OnboardingForm />
      </IntlTestProvider>,
    );
    expect(serverHtml).not.toContain('max="2026-08-06"');

    renderWithIntl(<OnboardingForm />);
    await act(async () => undefined);
    expect(screen.getByLabelText("Date of birth")).toHaveAttribute("max", "2026-08-06");

    vi.useRealTimers();
  });

  it.each([
    ["en", "Please select a nationality."],
    ["ko", "국적을 선택해 주세요."],
  ] as const)("localizes validation for %s", (locale, message) => {
    renderWithIntl(<OnboardingForm />, { locale });

    fireEvent.click(screen.getByRole("button", { name: locale === "ko" ? "회원가입" : "Sign up" }));

    expect(screen.getByRole("alert")).toHaveTextContent(message);
  });

  it("renders buddy-specific copy and submits the buddy role", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          isSuccess: true,
          code: "201",
          message: "OK",
          result: { registered: true, authStatus: "PENDING_APPROVAL", userType: "BUDDY" },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderWithIntl(<OnboardingForm userType="BUDDY" googleProfile={{ name: "Google Buddy" }} />);

    expect(screen.getByText("Welcome, future buddy")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Nickname" })).toHaveValue("Google Buddy");
    expect(
      screen.getByText("This is the name guests will see. You can edit the name from Google."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Choose a clear face photo so guests can recognize you when you meet."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "How should guests reach you?" }),
    ).toBeInTheDocument();
    fillLocalizedOnboardingFields("en", {
      birthDate: "1998-04-12",
      contact: "line_user",
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign up as a buddy" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      userType: "BUDDY",
      displayName: "Google Buddy",
    });
    expect(routerMocks.replace).toHaveBeenCalledWith(
      "/en/buddy/auth/status?status=PENDING_APPROVAL",
    );
    expect(routerMocks.refresh).toHaveBeenCalled();
  });

  it("relocalizes a stored validation error when the locale changes", () => {
    const onboardingForm = <OnboardingForm />;
    const { rerender } = render(<IntlTestProvider locale="en">{onboardingForm}</IntlTestProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Please select a nationality.");

    rerender(<IntlTestProvider locale="ko">{onboardingForm}</IntlTestProvider>);

    expect(screen.getByRole("alert")).toHaveTextContent("국적을 선택해 주세요.");
  });

  it.each([
    ["en", "", "Please enter a valid date of birth."],
    ["en", "2100-01-01", "Please enter a valid date of birth."],
    ["ko", "", "올바른 생년월일을 입력해 주세요."],
    ["ko", "2100-01-01", "올바른 생년월일을 입력해 주세요."],
  ] as const)(
    "shows localized birth date validation after a real %s submit with birth date %s",
    (locale, birthDate, message) => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      renderWithIntl(<OnboardingForm />, { locale });
      fillLocalizedOnboardingFields(locale, { birthDate, contact: "line_user" });

      fireEvent.click(
        screen.getByRole("button", {
          name: locale === "ko" ? "회원가입" : "Sign up",
        }),
      );

      expect(screen.getByRole("alert")).toHaveTextContent(message);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["en", "Enter a contact ID or number with at least 2 characters."],
    ["ko", "연락처 ID 또는 번호를 2자 이상 입력해 주세요."],
  ] as const)("shows localized contact validation after a real %s submit", (locale, message) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderWithIntl(<OnboardingForm />, { locale });
    fillLocalizedOnboardingFields(locale, { birthDate: "1998-04-12", contact: "" });

    fireEvent.click(
      screen.getByRole("button", {
        name: locale === "ko" ? "회원가입" : "Sign up",
      }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(fetchMock).not.toHaveBeenCalled();
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

  it("blocks phone-based signup when the selected country has no dial code", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(countries, "findCountry").mockReturnValue(undefined);
    renderWithIntl(<OnboardingForm googleProfile={{ name: "Traveler" }} />);
    fillLocalizedOnboardingFields("en", {
      birthDate: "1998-04-12",
      contact: "line_user",
    });
    fireEvent.click(screen.getByRole("button", { name: "WhatsApp" }));
    fireEvent.change(screen.getByLabelText("Messaging phone number"), {
      target: { value: "2025550123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a contact ID or number with at least 2 characters.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function fillLocalizedOnboardingFields(
  locale: "en" | "ko",
  values: { birthDate: string; contact: string },
) {
  Element.prototype.scrollIntoView = vi.fn();
  const labels =
    locale === "ko"
      ? {
          nationality: "국적",
          searchCountry: "국가 검색",
          country: "미국",
          birthDate: "생년월일",
          appId: "메신저 앱 ID",
        }
      : {
          nationality: "Nationality",
          searchCountry: "Search country",
          country: "United States",
          birthDate: "Date of birth",
          appId: "Messaging app ID",
        };

  fireEvent.click(screen.getByRole("button", { name: labels.nationality }));
  fireEvent.change(screen.getByLabelText(labels.searchCountry), {
    target: { value: labels.country },
  });
  fireEvent.click(screen.getByText(labels.country));
  fireEvent.change(screen.getByLabelText(labels.birthDate), {
    target: { value: values.birthDate },
  });
  if (values.contact) {
    fireEvent.change(screen.getByLabelText(labels.appId), {
      target: { value: values.contact },
    });
  }
}

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
    const displayName = screen.getByRole("textbox", { name: "Nickname" });
    if (!displayName.getAttribute("value") && !(displayName as HTMLInputElement).value) {
      fireEvent.change(displayName, { target: { value: "Traveler" } });
    }
    fireEvent.click(screen.getByRole("button", { name: "Nationality" }));
    fireEvent.change(screen.getByLabelText("Search country"), {
      target: { value: "United States" },
    });
    fireEvent.click(screen.getByText("United States"));
    fireEvent.change(screen.getByLabelText("Date of birth"), {
      target: { value: "1998-04-12" },
    });
    fireEvent.change(screen.getByLabelText("Messaging app ID"), {
      target: { value: "line_user" },
    });
  }

  it("shows a local preview after selecting a profile image", () => {
    renderWithIntl(<OnboardingForm googleProfile={{ name: "Traveler" }} />);

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
          result: { registered: true, authStatus: "ACTIVE", userType: "TOURIST" },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderWithIntl(<OnboardingForm />);
    fillRequiredFields();
    const file = createImageFile();
    fireEvent.change(screen.getByLabelText("Add profile photo"), { target: { files: [file] } });

    fireEvent.click(screen.getByRole("button", { name: /Sign up/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(uploadProfileImage).toHaveBeenCalledWith(file);
    const [signupUrl, signupInit] = fetchMock.mock.calls[0];
    expect(signupUrl).toBe("/api/auth/google/signup");
    expect(JSON.parse(signupInit.body)).toMatchObject({
      userType: "TOURIST",
      displayName: "Traveler",
      nationalityCode: "US",
      birthDate: "1998-04-12",
      contactMethod: "LINE",
      contactIdentifier: "line_user",
      profileImageKey: "profiles/2026/07/07/uuid.png",
    });
    expect(JSON.parse(signupInit.body)).not.toHaveProperty("age");
  });

  it("submits without profileImageKey when no image is selected", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          isSuccess: true,
          code: "201",
          message: "요청이 성공했습니다.",
          result: { registered: true, authStatus: "ACTIVE", userType: "TOURIST" },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderWithIntl(<OnboardingForm googleProfile={{ name: "Traveler" }} />);
    fillRequiredFields();

    fireEvent.click(screen.getByRole("button", { name: /Sign up/ }));

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

    fireEvent.click(screen.getByRole("button", { name: /Sign up/ }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Could not upload the profile photo. Please try again.",
      ),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the current locale when an in-flight image upload fails", async () => {
    let rejectUpload!: (error: Error) => void;
    vi.mocked(uploadProfileImage).mockReturnValue(
      new Promise((_, reject) => {
        rejectUpload = reject;
      }),
    );
    vi.stubGlobal("fetch", vi.fn());
    const onboardingForm = <OnboardingForm />;
    const { rerender } = render(<IntlTestProvider locale="en">{onboardingForm}</IntlTestProvider>);
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Add profile photo"), {
      target: { files: [createImageFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    await waitFor(() => expect(uploadProfileImage).toHaveBeenCalledTimes(1));

    rerender(<IntlTestProvider locale="ko">{onboardingForm}</IntlTestProvider>);
    await act(async () => rejectUpload(new Error("upload failed")));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "프로필 이미지를 업로드하지 못했습니다. 다시 시도해 주세요.",
    );
  });

  it("uses the current locale when an in-flight signup fails", async () => {
    let resolveSignup!: (response: Response) => void;
    const fetchMock = vi.fn().mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveSignup = resolve;
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const onboardingForm = <OnboardingForm />;
    const { rerender } = render(<IntlTestProvider locale="en">{onboardingForm}</IntlTestProvider>);
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    rerender(<IntlTestProvider locale="ko">{onboardingForm}</IntlTestProvider>);
    await act(async () => {
      resolveSignup(
        new Response(
          JSON.stringify({ isSuccess: false, code: "COMMON500", message: "server error" }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        ),
      );
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "서비스를 일시적으로 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.",
    );
  });

  it("shows a localized duplicate-email error without exposing the backend message", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          isSuccess: false,
          code: "AUTH409",
          message: "이미 회원가입이 완료된 이메일입니다.",
        }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderWithIntl(<OnboardingForm />);
    fillRequiredFields();

    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This email is already registered. Please sign in instead.",
    );
    expect(screen.queryByText("이미 회원가입이 완료된 이메일입니다.")).not.toBeInTheDocument();
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
            result: { registered: true, authStatus: "ACTIVE", userType: "TOURIST" },
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

    fireEvent.click(screen.getByRole("button", { name: /Sign up/ }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "The service is temporarily unavailable. Please try again shortly.",
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: /Sign up/ }));
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
