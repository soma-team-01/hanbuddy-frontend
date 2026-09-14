import { createHash } from "node:crypto";

export function getSignupDraftAccountId(signupToken?: string) {
  if (!signupToken) return undefined;

  return createHash("sha256").update(signupToken).digest("base64url");
}
