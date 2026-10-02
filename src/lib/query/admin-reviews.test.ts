import { QueryClient } from "@tanstack/react-query";
import { expect, it } from "vitest";
import { invalidateAdminReviewChange } from "./admin-reviews";
import { adminReviewFixture } from "@/test/admin-review-fixture";

it("invalidates every locale, preview, rating and profile cache without modifying statistics locally", async () => {
  const client = new QueryClient();
  const keys = [
    ["admin", "reviews", "42"],
    ["admin", "reviews", "42", "translations"],
    ["reviews", "activity", "7", "EN", "summary", 3],
    ["reviews", "activity", "7", "KO", 12, 5],
    ["reviews", "buddy", "3", "JA", 12],
    ["buddies", "3"],
    ["activities", "list", "EN", "KRW"],
    ["activities", "detail", "7", "KO"],
  ];
  keys.forEach((key) => client.setQueryData(key, { averageRating: 4.2 }));
  client.setQueryData(["reviews", "activity", "99"], {});
  await invalidateAdminReviewChange(client, adminReviewFixture);
  keys.forEach((key) => {
    expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    expect(client.getQueryData(key)).toEqual({ averageRating: 4.2 });
  });
  expect(client.getQueryState(["reviews", "activity", "99"])?.isInvalidated).toBe(false);
});
