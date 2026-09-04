import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BuddyResubmission } from "@/lib/auth/types";
import { renderWithIntl } from "@/test/render-with-intl";
import { BuddyResubmissionContent } from "./buddy-resubmission-content";

const routerMocks = vi.hoisted(() => ({ refresh: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => routerMocks,
}));

const application: BuddyResubmission = {
  userId: 7,
  email: "buddy@example.com",
  name: "Google Buddy",
  displayName: "Old Buddy",
  profileImageKey: null,
  profileImageUrl: null,
  nationalityCode: "KR",
  birthDate: "1995-02-03",
  contactMethod: "LINE",
  contactCountryCode: "",
  contactIdentifier: "old-buddy",
  accountStatus: "REJECTED",
  reviewedAt: null,
  rejectionReason: "Please update your profile.",
};

afterEach(() => {
  vi.unstubAllGlobals();
  routerMocks.refresh.mockClear();
  routerMocks.replace.mockClear();
});

describe("BuddyResubmissionContent", () => {
  it("loads the previous application before rendering the editable form", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ isSuccess: true, code: "200", message: "OK", result: application }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
        ),
    );

    renderWithIntl(<BuddyResubmissionContent />);

    expect(screen.getByText("Loading your previous application...")).toBeInTheDocument();
    expect(await screen.findByRole("textbox", { name: "Nickname" })).toHaveValue("Old Buddy");
  });

  it("asks for Google login again when the resubmission session expired", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ isSuccess: false, code: "TOKEN401_EXPIRED", message: "expired" }),
            { status: 401, headers: { "content-type": "application/json" } },
          ),
        ),
    );

    renderWithIntl(<BuddyResubmissionContent />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Please sign in again" })).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: "Sign in with Google" })).toHaveAttribute(
      "href",
      "/en/buddy",
    );
  });
});
