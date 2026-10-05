import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { getMyProfile, type MyProfileResult } from "@/lib/api/users";
import { getCancellationTranslation } from "@/lib/api/cancellation-translation";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import { UnauthenticatedQueryError } from "@/lib/api/errors";
import { CancellationReasonText } from "./CancellationReasonText";

vi.mock("@/lib/api/users", () => ({ getMyProfile: vi.fn() }));
vi.mock("@/lib/api/cancellation-translation", () => ({ getCancellationTranslation: vi.fn() }));
vi.mock("@/lib/query/use-auth-query-redirect", () => ({ useAuthQueryRedirect: vi.fn() }));

const profileApi = vi.mocked(getMyProfile);
const translationApi = vi.mocked(getCancellationTranslation);
const props = { kind: "application" as const, id: 42, originalText: "개인 사정" };
const profile: MyProfileResult = {
  status: "success",
  profile: {
    userId: 7,
    email: "guest@example.com",
    name: "Guest",
    displayName: "Guest",
    userType: "TOURIST",
    profileImageKey: null,
    profileImageUrl: null,
    nationalityCode: "US",
    birthDate: "1990-01-01",
    contactMethod: "WHATSAPP",
    contactCountryCode: "+1",
    contactIdentifier: "1234567890",
  },
};

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", undefined);
  vi.clearAllMocks();
  profileApi.mockReset();
  translationApi.mockReset();
  translationApi.mockResolvedValue({
    status: "success",
    translation: {
      originalText: props.originalText,
      displayText: "Personal reasons",
      sourceLanguage: "KO",
      targetLanguage: "EN",
      status: "TRANSLATED",
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("cancellation translation profile recovery", () => {
  it("shows a profile failure fallback and resumes isolated translation after manual retry", async () => {
    let finish!: (value: MyProfileResult) => void;
    profileApi.mockRejectedValueOnce(new Error("Profile temporarily unavailable"));
    profileApi.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const outerClick = vi.fn();
    const { queryClient } = renderWithQueryClient(
      <div onClick={outerClick}>
        <CancellationReasonText {...props} />
      </div>,
    );
    const retry = await screen.findByRole("button", { name: "Retry translation" });
    expect(screen.getByText(props.originalText)).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Translation unavailable");
    expect(translationApi).not.toHaveBeenCalled();
    expect(profileApi).toHaveBeenCalledTimes(1);
    fireEvent.click(retry);
    expect(outerClick).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("button")).not.toBeInTheDocument());
    expect(screen.getByRole("status")).toHaveTextContent("Translating…");
    expect(translationApi).not.toHaveBeenCalled();
    await act(async () => finish(profile));
    expect(await screen.findByText("Personal reasons")).toBeVisible();
    expect(screen.queryByText(props.originalText)).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(profileApi).toHaveBeenCalledTimes(2);
    expect(translationApi).toHaveBeenCalledTimes(1);
    expect(
      queryClient.getQueryCache().findAll({ queryKey: ["cancellation-translation"] })[0].queryKey,
    ).toEqual(expect.arrayContaining([7, "application", "42", "EN"]));
  });

  it("keeps retry available after a repeated profile failure without requesting translation", async () => {
    profileApi.mockRejectedValue(new Error("Profile unavailable"));
    renderWithQueryClient(<CancellationReasonText {...props} />);
    fireEvent.click(await screen.findByRole("button", { name: "Retry translation" }));
    await waitFor(() => expect(profileApi).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("button", { name: "Retry translation" })).toBeEnabled();
    expect(screen.getByText(props.originalText)).toBeVisible();
    expect(translationApi).not.toHaveBeenCalled();
  });

  it("preserves loading and hides private text while an unauthenticated session redirects", async () => {
    profileApi.mockResolvedValue({ status: "unauthenticated" });
    renderWithQueryClient(<CancellationReasonText {...props} />);
    await waitFor(() =>
      expect(useAuthQueryRedirect).toHaveBeenCalledWith(expect.any(UnauthenticatedQueryError)),
    );
    expect(screen.getByRole("status")).toHaveTextContent("Translating…");
    expect(screen.queryByText(props.originalText)).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(translationApi).not.toHaveBeenCalled();
  });
});
