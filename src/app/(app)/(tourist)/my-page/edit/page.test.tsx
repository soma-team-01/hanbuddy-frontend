import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getMyProfile, updateMyProfile } from "@/lib/api/users";
import { uploadProfileImage } from "@/lib/images/presigned";
import { userKeys } from "@/lib/query/users";
import { createMockProfile } from "@/test/factories";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import EditProfilePage from "./page";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
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

  it("populates the form with the loaded profile", async () => {
    renderWithQueryClient(<EditProfilePage />);

    expect(await screen.findByLabelText("Full Name")).toHaveValue("Sarah Jenkins");
    expect(screen.getByLabelText("Age")).toHaveValue(28);
    expect(screen.getByPlaceholderText("Phone number")).toHaveValue("555-0198");
  });

  it("does not render the Korean Phone Number field", async () => {
    renderWithQueryClient(<EditProfilePage />);

    await screen.findByLabelText("Full Name");
    expect(screen.queryByText(/Korean Phone Number/)).not.toBeInTheDocument();
  });

  it("keeps the country selector for phone-based messaging apps", async () => {
    renderWithQueryClient(<EditProfilePage />);

    // 프로필의 연락 수단이 WHATSAPP이므로 국가 선택이 바로 렌더된다
    expect(await screen.findByLabelText("Messaging country code")).toBeInTheDocument();
  });

  it("submits the updated profile and returns to my page", async () => {
    mockedUpdateMyProfile.mockResolvedValue({
      status: "success",
      profile: { ...profile, name: "Sarah J." },
    });
    const { queryClient } = renderWithQueryClient(<EditProfilePage />);

    const nameInput = await screen.findByLabelText("Full Name");
    fireEvent.change(nameInput, { target: { value: "Sarah J." } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mockedUpdateMyProfile).toHaveBeenCalledWith({
        name: "Sarah J.",
        profileImageKey: "profiles/2026/07/06/uuid.webp",
        nationalityCode: "US",
        age: 28,
        contactMethod: "WHATSAPP",
        contactCountryCode: "+1",
        contactIdentifier: "555-0198",
      });
    });
    expect(uploadProfileImage).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/my-page");
    expect(queryClient.getQueryData(userKeys.me())).toEqual(
      expect.objectContaining({ name: "Sarah J." }),
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
    expect(replace).toHaveBeenCalledWith("/my-page");
  });

  it("shows the upload error and skips saving when the image upload fails", async () => {
    vi.mocked(uploadProfileImage).mockRejectedValue(
      new Error("프로필 이미지 업로드에 실패했습니다."),
    );

    renderWithQueryClient(<EditProfilePage />);
    fireEvent.change(await screen.findByLabelText("Add profile photo"), {
      target: { files: [createImageFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("프로필 이미지 업로드에 실패했습니다."),
    );
    expect(mockedUpdateMyProfile).not.toHaveBeenCalled();
  });

  it("rejects unsupported image types at selection time", async () => {
    renderWithQueryClient(<EditProfilePage />);

    fireEvent.change(await screen.findByLabelText("Add profile photo"), {
      target: { files: [createImageFile("me.gif", "image/gif")] },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "JPEG, PNG, WebP 형식의 이미지만 업로드할 수 있습니다.",
    );
    expect(screen.queryByAltText("Selected profile photo preview")).not.toBeInTheDocument();
  });

  it("shows the backend message when saving fails", async () => {
    mockedUpdateMyProfile.mockResolvedValue({
      status: "error",
      message: "국적 코드는 영문 대문자 2자리여야 합니다",
    });
    renderWithQueryClient(<EditProfilePage />);

    await screen.findByLabelText("Full Name");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "국적 코드는 영문 대문자 2자리여야 합니다",
    );
    expect(replace).not.toHaveBeenCalledWith("/my-page");
  });

  it("redirects to login when the profile load is unauthenticated", async () => {
    mockedGetMyProfile.mockResolvedValue({ status: "unauthenticated" });
    renderWithQueryClient(<EditProfilePage />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/login");
    });
  });
});
