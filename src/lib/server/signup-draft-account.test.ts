import { describe, expect, it } from "vitest";
import { getSignupDraftAccountId } from "./signup-draft-account";

describe("getSignupDraftAccountId", () => {
  it("derives a stable non-secret account scope from the signup token", () => {
    const first = getSignupDraftAccountId("signup-token-for-first-account");

    expect(first).toBe(getSignupDraftAccountId("signup-token-for-first-account"));
    expect(first).not.toBe(getSignupDraftAccountId("signup-token-for-second-account"));
    expect(first).not.toContain("signup-token-for-first-account");
  });

  it("does not create a shared anonymous account scope", () => {
    expect(getSignupDraftAccountId()).toBeUndefined();
  });
});
