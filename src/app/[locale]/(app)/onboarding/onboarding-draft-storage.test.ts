import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearAllOnboardingDrafts,
  clearOnboardingDraft,
  getOnboardingDraftScope,
  loadOnboardingDraft,
  saveOnboardingDraft,
  type OnboardingDraftSnapshot,
} from "./onboarding-draft-storage";

const snapshot: OnboardingDraftSnapshot = {
  currentStep: 3,
  displayName: "John Smith",
  birthDate: "1998-04-12",
  nationality: "US",
  messagingApp: "line",
  messagingCountry: "US",
  messagingContact: "john_line",
  agreementDecisions: {
    ADULT_CONFIRMATION: true,
    TERMS_OF_SERVICE: true,
  },
  profileImageFile: null,
  existingProfileImageKey: null,
  existingProfileImageUrl: null,
};

afterEach(() => {
  clearAllOnboardingDrafts();
  vi.useRealTimers();
});

describe("onboarding draft storage", () => {
  it("uses a locale-independent scope for the same signup", () => {
    expect(getOnboardingDraftScope({ userType: "TOURIST", googleProfileName: "John Smith" })).toBe(
      "signup:TOURIST:John%20Smith",
    );
    expect(
      getOnboardingDraftScope({
        userType: "BUDDY",
        resubmissionUserId: 7,
        reviewedAt: "2026-09-06T10:00:00+09:00",
      }),
    ).toBe("resubmission:7:2026-09-06T10:00:00+09:00");
  });

  it("restores entered values in the current browser tab", async () => {
    saveOnboardingDraft("signup:TOURIST:John", snapshot);

    await expect(loadOnboardingDraft("signup:TOURIST:John")).resolves.toEqual(snapshot);
  });

  it("removes a completed or discarded draft", async () => {
    saveOnboardingDraft("signup:TOURIST:John", snapshot);

    clearOnboardingDraft("signup:TOURIST:John");

    await expect(loadOnboardingDraft("signup:TOURIST:John")).resolves.toBeNull();
  });

  it("ignores an expired session draft", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T10:00:00+09:00"));
    saveOnboardingDraft("signup:TOURIST:John", snapshot);
    clearAllOnboardingDrafts();
    window.sessionStorage.setItem(
      "hanbuddy:onboarding-draft:signup:TOURIST:John",
      JSON.stringify({
        version: 1,
        updatedAt: Date.now() - 31 * 60 * 1000,
        snapshot: { ...snapshot, profileImageFile: undefined },
      }),
    );

    await expect(loadOnboardingDraft("signup:TOURIST:John")).resolves.toBeNull();
  });
});
