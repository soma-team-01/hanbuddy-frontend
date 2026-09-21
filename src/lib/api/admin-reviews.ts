import { requestApiResult } from "./result";
import { reviewQueryString } from "@/lib/admin/reviews";
import type { AdminPageResponse } from "@/types/admin";
import type {
  AdminReview,
  AdminReviewFilters,
  AdminReviewTranslation,
  ImportedReviewContent,
  ImportReviewRequest,
} from "@/types/admin-review";

export function getAdminReviews(filters: AdminReviewFilters) {
  return requestApiResult<AdminPageResponse<AdminReview>, "reviews">(
    `/api/admin/reviews?${reviewQueryString(filters)}`,
    "reviews",
    { cache: "no-store" },
    "후기 목록을 불러오지 못했습니다.",
  );
}
export function getAdminReview(id: number | string) {
  return requestApiResult<AdminReview, "review">(
    `/api/admin/reviews/${id}`,
    "review",
    { cache: "no-store" },
    "후기를 불러오지 못했습니다.",
  );
}
export function getAdminReviewTranslations(id: number | string) {
  return requestApiResult<AdminReviewTranslation[], "translations">(
    `/api/admin/reviews/${id}/translations`,
    "translations",
    { cache: "no-store" },
    "번역 상태를 불러오지 못했습니다.",
  );
}
function writeReview(path: string, method: "POST" | "PATCH", body: object) {
  return requestApiResult<AdminReview, "review">(
    path,
    "review",
    { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    "후기를 변경하지 못했습니다.",
  );
}
export function importAdminReview(activityId: number, body: ImportReviewRequest) {
  return writeReview(`/api/admin/activities/${activityId}/imported-reviews`, "POST", body);
}
export function editImportedReview(id: number, body: ImportedReviewContent) {
  return writeReview(`/api/admin/reviews/${id}/imported-content`, "PATCH", body);
}
export function moderateAdminReview(id: number, action: "hide" | "restore", reason: string) {
  return writeReview(`/api/admin/reviews/${id}/${action}`, "POST", { reason });
}
