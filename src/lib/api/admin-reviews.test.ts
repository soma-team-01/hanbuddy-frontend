import { afterEach, expect, it, vi } from "vitest";
import {
  editImportedReview,
  getAdminReview,
  getAdminReviews,
  getAdminReviewTranslations,
  importAdminReview,
  moderateAdminReview,
} from "./admin-reviews";
import { adminReviewFixture } from "@/test/admin-review-fixture";

afterEach(() => vi.unstubAllGlobals());
it("uses same-origin endpoints, numeric rating, complete edit payload, and unwraps result once", async () => {
  const fetchMock = vi.fn().mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          isSuccess: true,
          code: "200",
          message: "ok",
          result: adminReviewFixture,
        }),
      ),
  );
  vi.stubGlobal("fetch", fetchMock);
  const content = {
    reviewerName: null,
    rating: 5,
    content: "원본 후기",
    originalReviewedAt: null,
    reason: "원본 확인",
  };
  const importing = { ...content, sourceReference: "legacy:42" };
  await expect(importAdminReview(7, importing)).resolves.toEqual({
    status: "success",
    review: adminReviewFixture,
  });
  await editImportedReview(42, content);
  await moderateAdminReview(42, "hide", "사유");
  await moderateAdminReview(42, "restore", "사유");
  for (const [index, path, method, body] of [
    [0, "/api/admin/activities/7/imported-reviews", "POST", importing],
    [1, "/api/admin/reviews/42/imported-content", "PATCH", content],
    [2, "/api/admin/reviews/42/hide", "POST", { reason: "사유" }],
    [3, "/api/admin/reviews/42/restore", "POST", { reason: "사유" }],
  ] as const) {
    expect(fetchMock.mock.calls[index]).toEqual([
      path,
      {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "same-origin",
      },
    ]);
  }
  await getAdminReviews({ page: 0, size: 20, source: undefined, reviewerName: "Mina" });
  expect(fetchMock).toHaveBeenLastCalledWith(
    "/api/admin/reviews?page=0&size=20&reviewerName=Mina",
    { cache: "no-store", credentials: "same-origin" },
  );
  await getAdminReview(42);
  expect(fetchMock).toHaveBeenLastCalledWith("/api/admin/reviews/42", {
    cache: "no-store",
    credentials: "same-origin",
  });
  await getAdminReviewTranslations(42);
  expect(fetchMock).toHaveBeenLastCalledWith("/api/admin/reviews/42/translations", {
    cache: "no-store",
    credentials: "same-origin",
  });
});
