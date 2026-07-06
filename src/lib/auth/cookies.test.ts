import { describe, expect, it } from "vitest";
import { decodeGoogleProfile, encodeGoogleProfile } from "./cookies";

describe("Google profile cookie encoding", () => {
  it("does not persist Google email in the reversible onboarding cookie", () => {
    const encoded = encodeGoogleProfile({
      email: "traveler@example.com",
      name: "Traveler",
      picture: "https://lh3.googleusercontent.com/profile",
    });

    expect(Buffer.from(encoded, "base64url").toString("utf8")).not.toContain(
      "traveler@example.com",
    );
    expect(decodeGoogleProfile(encoded)).toEqual({
      name: "Traveler",
      picture: "https://lh3.googleusercontent.com/profile",
    });
  });
});
