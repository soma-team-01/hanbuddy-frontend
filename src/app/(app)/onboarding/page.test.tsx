import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { OnboardingForm } from "./OnboardingForm";
import { uploadProfileImage } from "@/lib/images/presigned";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/lib/images/presigned", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/images/presigned")>()),
  uploadProfileImage: vi.fn(),
}));

describe("OnboardingForm", () => {
  it("does not render the Korean Phone Number field", () => {
    render(<OnboardingForm />);
    expect(screen.queryByText("Korean Phone Number")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Korean phone number")).not.toBeInTheDocument();
  });

  it("keeps the country selector for tourists on phone-based apps", () => {
    render(<OnboardingForm />);
    fireEvent.click(screen.getByRole("button", { name: "WhatsApp" }));
    expect(screen.getByLabelText("Messaging country code")).toBeInTheDocument();
    expect(screen.queryByText("+82")).not.toBeInTheDocument();
  });

  it("fixes +82 without a country selector for buddies", () => {
    render(<OnboardingForm />);
    fireEvent.click(screen.getByRole("button", { name: "Buddy" }));
    fireEvent.click(screen.getByRole("button", { name: "WhatsApp" }));
    expect(screen.queryByLabelText("Messaging country code")).not.toBeInTheDocument();
    expect(screen.getByText("+82")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("010-XXXX-XXXX")).toBeInTheDocument();
  });

  it("clears the contact input when the role changes", () => {
    render(<OnboardingForm />);
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
    render(<OnboardingForm />);

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

    render(<OnboardingForm />);
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

    render(<OnboardingForm />);
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

    render(<OnboardingForm />);
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Add profile photo"), {
      target: { files: [createImageFile()] },
    });

    fireEvent.click(screen.getByRole("button", { name: /Complete Registration/ }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("프로필 이미지 업로드에 실패했습니다."),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects unsupported image types at selection time", () => {
    render(<OnboardingForm />);

    fireEvent.change(screen.getByLabelText("Add profile photo"), {
      target: { files: [createImageFile("me.gif", "image/gif")] },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "JPEG, PNG, WebP 형식의 이미지만 업로드할 수 있습니다.",
    );
    expect(screen.queryByAltText("Selected profile photo preview")).not.toBeInTheDocument();
  });
});
