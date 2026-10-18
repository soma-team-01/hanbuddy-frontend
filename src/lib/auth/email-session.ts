import type { EmailSignupSession } from "./email";

export function readEmailSignupSession(value?: string): EmailSignupSession | undefined {
  if (!value) return undefined;
  try {
    const session = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (typeof session.email === "string" && Number.isFinite(session.expiresAt))
      return { email: session.email, expiresAt: session.expiresAt };
  } catch {
    /* Invalid metadata is not an authenticated signup session. */
  }
  return undefined;
}
