import { describe, expect, it } from "vitest";
import { buildSignupAgreements } from "./signup-agreements";

describe("signup document versions", () => {
  it("records the version actually displayed instead of the default version", () => {
    const agreements = buildSignupAgreements(
      "TOURIST",
      { TERMS_OF_SERVICE: true },
      {
        TERMS_OF_SERVICE: { version: "2026-09-08", source: "Updated terms" },
      },
    );
    expect(agreements.find(({ type }) => type === "TERMS_OF_SERVICE")).toEqual({
      type: "TERMS_OF_SERVICE",
      version: "2026-09-08",
      agreed: true,
    });
    expect(agreements.find(({ type }) => type === "ADULT_CONFIRMATION")?.version).toBe(
      "2026-09-07",
    );
  });
});
