import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { appendRequestedContentLanguage } from "./content-language";

describe("appendRequestedContentLanguage", () => {
  it("forwards a supported language while preserving existing query parameters", () => {
    const request = new NextRequest(
      "http://localhost/api/applications/conflicts?activityScheduleId=10&language=EN",
    );

    expect(
      appendRequestedContentLanguage(request, "/applications/conflicts?activityScheduleId=10"),
    ).toBe("/applications/conflicts?activityScheduleId=10&language=EN");
  });

  it("does not forward UNKNOWN or arbitrary language values", () => {
    const unknownRequest = new NextRequest("http://localhost/api/activities?language=UNKNOWN");
    const invalidRequest = new NextRequest("http://localhost/api/activities?language=FR");

    expect(appendRequestedContentLanguage(unknownRequest, "/activities")).toBe("/activities");
    expect(appendRequestedContentLanguage(invalidRequest, "/activities")).toBe("/activities");
  });
});
