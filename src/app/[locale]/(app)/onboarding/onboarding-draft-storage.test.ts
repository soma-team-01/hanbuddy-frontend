import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearAllOnboardingDrafts,
  clearExpiredOnboardingDrafts,
  clearOnboardingDraft,
  clearSignupOnboardingDrafts,
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
  it.each(["kakaotalk", "instagram", "line", "wechat"] as const)(
    "restores %s from session storage without changing its meaning",
    async (messagingApp) => {
      const scope = "signup:TOURIST:stored";
      window.sessionStorage.setItem(
        "hanbuddy:onboarding-draft:" + scope,
        JSON.stringify({
          version: 1,
          updatedAt: Date.now(),
          snapshot: { ...snapshot, messagingApp },
        }),
      );
      expect(await loadOnboardingDraft(scope)).toMatchObject({
        messagingApp,
        messagingContact: snapshot.messagingContact,
      });
    },
  );

  it("uses a locale-independent account scope for the same signup", () => {
    expect(
      getOnboardingDraftScope({ userType: "TOURIST", signupDraftAccountId: "account-hash" }),
    ).toBe("signup:TOURIST:account-hash");
    expect(
      getOnboardingDraftScope({ userType: "BUDDY", signupDraftAccountId: "account-hash" }),
    ).toBe("signup:BUDDY:account-hash");
    expect(getOnboardingDraftScope({ userType: "TOURIST" })).toBeNull();
    expect(
      getOnboardingDraftScope({
        userType: "BUDDY",
        resubmissionUserId: 7,
        reviewedAt: "2026-09-06T10:00:00+09:00",
      }),
    ).toBe("resubmission:7:2026-09-06T10:00:00+09:00");
  });

  it("does not share a signup draft between accounts with the same profile name", async () => {
    const firstScope = getOnboardingDraftScope({
      userType: "TOURIST",
      signupDraftAccountId: "first-account",
    });
    const secondScope = getOnboardingDraftScope({
      userType: "TOURIST",
      signupDraftAccountId: "second-account",
    });

    expect(firstScope).not.toBeNull();
    expect(secondScope).not.toBeNull();
    saveOnboardingDraft(firstScope!, snapshot);

    await expect(loadOnboardingDraft(secondScope!)).resolves.toBeNull();
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

  it("removes only expired drafts during page-exit cleanup", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T10:00:00+09:00"));
    saveOnboardingDraft("signup:TOURIST:expired", snapshot);
    vi.setSystemTime(new Date("2026-09-06T10:31:00+09:00"));
    saveOnboardingDraft("signup:TOURIST:current", {
      ...snapshot,
      displayName: "Current User",
    });

    clearExpiredOnboardingDrafts();

    expect(
      window.sessionStorage.getItem("hanbuddy:onboarding-draft:signup:TOURIST:expired"),
    ).toBeNull();
    expect(
      window.sessionStorage.getItem("hanbuddy:onboarding-draft:signup:TOURIST:current"),
    ).not.toBeNull();
    await expect(loadOnboardingDraft("signup:TOURIST:current")).resolves.toMatchObject({
      displayName: "Current User",
    });
  });

  it("clears signup drafts without removing a resubmission draft", async () => {
    saveOnboardingDraft("signup:TOURIST:account", snapshot);
    saveOnboardingDraft("resubmission:7:reviewed", snapshot);

    clearSignupOnboardingDrafts();

    await expect(loadOnboardingDraft("signup:TOURIST:account")).resolves.toBeNull();
    await expect(loadOnboardingDraft("resubmission:7:reviewed")).resolves.toEqual(snapshot);
  });
});
