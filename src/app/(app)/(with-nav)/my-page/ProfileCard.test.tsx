import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMyProfile } from "@/lib/api/users";
import { createMockProfile } from "@/test/factories";
import { ProfileCard } from "./ProfileCard";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace,
  }),
}));

vi.mock("@/lib/api/users", () => ({
  getMyProfile: vi.fn(),
}));

const mockedGetMyProfile = vi.mocked(getMyProfile);

const profile = createMockProfile();

describe("ProfileCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the profile name and image after loading", async () => {
    mockedGetMyProfile.mockResolvedValue({ status: "success", profile });

    render(<ProfileCard />);

    expect(await screen.findByText("Sarah Jenkins")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Edit Profile/ })).toHaveAttribute(
      "href",
      "/my-page/edit",
    );
    expect(screen.getByAltText("Sarah Jenkins")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects to login when the session is unauthenticated", async () => {
    mockedGetMyProfile.mockResolvedValue({ status: "unauthenticated" });

    render(<ProfileCard />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/login");
    });
  });

  it("shows the error message when the profile fails to load", async () => {
    mockedGetMyProfile.mockResolvedValue({ status: "error", message: "서버 오류입니다." });

    render(<ProfileCard />);

    expect(await screen.findByText("서버 오류입니다.")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
