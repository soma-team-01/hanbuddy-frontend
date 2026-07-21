import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api/errors";
import { getMyProfile } from "@/lib/api/users";
import { createQueryClient } from "@/lib/query/client";
import { createMockProfile } from "@/test/factories";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { ProfileCard } from "./ProfileCard";

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
}));

const mockedGetMyProfile = vi.mocked(getMyProfile);

const profile = createMockProfile();

describe("ProfileCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the profile name and image after loading", async () => {
    mockedGetMyProfile.mockResolvedValue({ status: "success", profile });

    renderWithQueryClient(<ProfileCard />);

    expect(await screen.findByText("Sarah Jenkins")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Edit Profile/ })).toHaveAttribute(
      "href",
      "/en/my-page/edit",
    );
    expect(screen.getByAltText("Sarah Jenkins")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects to login when the session is unauthenticated", async () => {
    mockedGetMyProfile.mockResolvedValue({ status: "unauthenticated" });

    renderWithQueryClient(<ProfileCard />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/en/login");
    });
  });

  it("maps the user-not-found profile error in Korean", async () => {
    mockedGetMyProfile.mockResolvedValue({
      status: "error",
      error: new ApiClientError({
        code: "USER404",
        status: 404,
        details: null,
        backendMessage: "raw server detail",
      }),
    });

    renderWithQueryClient(<ProfileCard />, { locale: "ko" });

    expect(await screen.findByText("사용자 프로필을 찾을 수 없습니다.")).toBeInTheDocument();
    expect(screen.queryByText("raw server detail")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("localizes the profile action in Korean", async () => {
    mockedGetMyProfile.mockResolvedValue({ status: "success", profile });

    renderWithQueryClient(<ProfileCard />, { locale: "ko" });

    expect(await screen.findByRole("link", { name: "프로필 수정" })).toHaveAttribute(
      "href",
      "/ko/my-page/edit",
    );
  });

  it("reuses the cached profile after remounting", async () => {
    mockedGetMyProfile.mockResolvedValue({ status: "success", profile });
    const queryClient = createQueryClient();
    const firstRender = renderWithQueryClient(<ProfileCard />, { queryClient });

    expect(await screen.findByText("Sarah Jenkins")).toBeInTheDocument();
    firstRender.unmount();
    renderWithQueryClient(<ProfileCard />, { queryClient });

    expect(await screen.findByText("Sarah Jenkins")).toBeInTheDocument();
    expect(mockedGetMyProfile).toHaveBeenCalledTimes(1);
  });
});
