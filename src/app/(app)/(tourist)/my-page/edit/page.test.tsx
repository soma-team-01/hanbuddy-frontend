import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMyProfile, updateMyProfile } from "@/lib/api/users";
import type { MyProfile } from "@/types/user";
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

const mockedGetMyProfile = vi.mocked(getMyProfile);
const mockedUpdateMyProfile = vi.mocked(updateMyProfile);

const profile: MyProfile = {
  userId: 1,
  email: "user@example.com",
  name: "Sarah Jenkins",
  userType: "TOURIST",
  profileImageKey: "profiles/2026/07/06/uuid.webp",
  profileImageUrl: "https://bucket.s3.ap-northeast-2.amazonaws.com/profiles/2026/07/06/uuid.webp",
  nationalityCode: "US",
  age: 28,
  contactMethod: "WHATSAPP",
  contactCountryCode: "+1",
  contactIdentifier: "555-0198",
};

describe("EditProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetMyProfile.mockResolvedValue({ status: "success", profile });
  });

  it("populates the form with the loaded profile", async () => {
    render(<EditProfilePage />);

    expect(await screen.findByLabelText("Full Name")).toHaveValue("Sarah Jenkins");
    expect(screen.getByLabelText("Age")).toHaveValue(28);
    expect(screen.getByPlaceholderText("Phone number")).toHaveValue("555-0198");
  });

  it("does not render the Korean Phone Number field", async () => {
    render(<EditProfilePage />);

    await screen.findByLabelText("Full Name");
    expect(screen.queryByText(/Korean Phone Number/)).not.toBeInTheDocument();
  });

  it("keeps the country selector for phone-based messaging apps", async () => {
    render(<EditProfilePage />);

    // 프로필의 연락 수단이 WHATSAPP이므로 국가 선택이 바로 렌더된다
    expect(await screen.findByLabelText("Messaging country code")).toBeInTheDocument();
  });

  it("submits the updated profile and returns to my page", async () => {
    mockedUpdateMyProfile.mockResolvedValue({
      status: "success",
      profile: { ...profile, name: "Sarah J." },
    });
    render(<EditProfilePage />);

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
    expect(replace).toHaveBeenCalledWith("/my-page");
  });

  it("shows the backend message when saving fails", async () => {
    mockedUpdateMyProfile.mockResolvedValue({
      status: "error",
      message: "국적 코드는 영문 대문자 2자리여야 합니다",
    });
    render(<EditProfilePage />);

    await screen.findByLabelText("Full Name");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "국적 코드는 영문 대문자 2자리여야 합니다",
    );
    expect(replace).not.toHaveBeenCalledWith("/my-page");
  });

  it("redirects to login when the profile load is unauthenticated", async () => {
    mockedGetMyProfile.mockResolvedValue({ status: "unauthenticated" });
    render(<EditProfilePage />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/login");
    });
  });
});
