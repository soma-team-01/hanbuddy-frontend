import { describe, expect, it } from "vitest";
import { resolveHaiBuddyContext } from "./use-hai-buddy-context";

describe("resolveHaiBuddyContext", () => {
  it.each([
    ["/activities/3", "", { page: "ACTIVITY_DETAIL", activityId: 3 }],
    [
      "/activities/3/book",
      "scheduleId=12&guestCount=2",
      { page: "BOOKING", activityId: 3, scheduleId: 12 },
    ],
    ["/activities/3/book", "scheduleId=abc", { page: "BOOKING", activityId: 3 }],
    ["/applications", "", { page: "APPLICATIONS" }],
    ["/applications/9/activity", "", { page: "APPLICATIONS" }],
    ["/explore", "", { page: "EXPLORE" }],
    ["/faq", "", { page: "FAQ" }],
    ["/about", "", { page: "ABOUT" }],
    ["/tips/watch-kbo", "", { page: "TIPS" }],
    ["/policies/privacy-policy", "", { page: "POLICY" }],
    ["/chat/4", "", { page: "CHAT" }],
    ["/my-page", "", { page: "MY_PAGE" }],
    ["/", "", { page: "HOME" }],
    ["/somewhere/else", "", { page: "OTHER" }],
  ])("%s?%s", (pathname, search, expected) => {
    expect(resolveHaiBuddyContext(pathname, new URLSearchParams(search), "ja")).toEqual({
      ...expected,
      language: "JA",
      locale: "ja",
    });
  });
});
