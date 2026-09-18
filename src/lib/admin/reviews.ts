import { CONTENT_LANGUAGES } from "@/types/content-language";
import type {
  AdminReviewFilters,
  ImportReviewRequest,
  ImportedReviewContent,
} from "@/types/admin-review";
import { getSeoulDateTimeParts, toSeoulStartAt } from "@/lib/datetime";
import { ApiClientError, isUnauthenticatedError } from "@/lib/api/errors";

export const REVIEW_SOURCES = [
  ["PLATFORM", "서비스 후기"],
  ["LEGACY_IMPORT", "이관 후기"],
];
export const REVIEW_VISIBILITIES = [
  ["VISIBLE", "공개"],
  ["HIDDEN", "숨김"],
];
export const REVIEW_LANGUAGES = [
  ["KO", "한국어"],
  ["EN", "영어"],
  ["JA", "일본어"],
  ["ZH_HANS", "중국어 간체"],
  ["ZH_HANT", "중국어 번체"],
  ["UNKNOWN", "미확인"],
];

export function positiveReviewId(value: string) {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) {
    throw new Error("ID는 양의 정수로 입력해 주세요.");
  }
  return Number(value);
}

function requiredText(value: unknown, label: string, max: number) {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error(`${label}: 1~${max}자로 입력해 주세요.`);
  }
  return value.trim();
}
export function parseReviewReason(value: unknown) {
  return requiredText(value, "작업 사유", 500);
}

export function parseImportedReview(
  input: Record<string, unknown>,
  importing: true,
): ImportReviewRequest;
export function parseImportedReview(
  input: Record<string, unknown>,
  importing: false,
): ImportedReviewContent;
export function parseImportedReview(
  input: Record<string, unknown>,
  importing: boolean,
): ImportedReviewContent | ImportReviewRequest {
  const { reviewerName, rating, content, originalReviewedAt } = input;
  if (reviewerName != null && (typeof reviewerName !== "string" || reviewerName.length > 100))
    throw new Error("작성자명은 100자 이하로 입력해 주세요.");
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5)
    throw new Error("별점은 1~5 사이의 정수로 선택해 주세요.");
  requiredText(content, "후기 내용", 1000);
  if (
    originalReviewedAt != null &&
    (typeof originalReviewedAt !== "string" ||
      !getSeoulDateTimeParts(originalReviewedAt) ||
      new Date(originalReviewedAt).getTime() > Date.now())
  )
    throw new Error("원본 작성일은 과거 또는 현재의 유효한 일시여야 합니다.");
  const result: ImportedReviewContent = {
    reviewerName: typeof reviewerName === "string" ? reviewerName.trim() || null : null,
    rating,
    content: content as string,
    originalReviewedAt: typeof originalReviewedAt === "string" ? originalReviewedAt : null,
    reason: parseReviewReason(input.reason),
  };
  return importing
    ? { ...result, sourceReference: requiredText(input.sourceReference, "원본 식별값", 120) }
    : result;
}

export function parseReviewFilters(params: URLSearchParams): AdminReviewFilters {
  const filters: AdminReviewFilters = { page: 0, size: 20 };
  for (const key of ["reviewId", "activityId", "reviewerId", "buddyId"] as const) {
    const value = params.get(key)?.trim();
    if (value) filters[key] = positiveReviewId(value);
  }
  for (const [key, max] of [
    ["reviewerName", 100],
    ["sourceReference", 120],
  ] as const) {
    const value = params.get(key)?.trim();
    if (value) filters[key] = requiredText(value, key, max);
  }
  const enums = {
    source: ["PLATFORM", "LEGACY_IMPORT"],
    visibility: ["VISIBLE", "HIDDEN"],
    sourceLanguage: [...CONTENT_LANGUAGES, "UNKNOWN"],
  };
  for (const key of ["source", "visibility", "sourceLanguage"] as const) {
    const value = params.get(key)?.trim();
    if (!value) continue;
    if (!enums[key].includes(value)) throw new Error("검색 조건을 확인해 주세요.");
    Object.assign(filters, { [key]: value });
  }
  for (const key of ["rating", "page", "size"] as const) {
    const value = params.get(key)?.trim();
    if (!value) continue;
    const number = Number(value);
    if (
      !/^\d+$/.test(value) ||
      !Number.isSafeInteger(number) ||
      number < (key === "page" ? 0 : 1) ||
      (key === "rating" && number > 5) ||
      (key === "size" && number > 100)
    )
      throw new Error("별점 또는 페이지 범위를 확인해 주세요.");
    filters[key] = number;
  }
  for (const key of ["createdFrom", "createdTo"] as const) {
    const value = params.get(key)?.trim();
    if (!value) continue;
    if (!toSeoulStartAt(`${value}T00:00`)) throw new Error("등록일을 확인해 주세요.");
    filters[key] = value;
  }
  if (filters.createdFrom && filters.createdTo && filters.createdFrom > filters.createdTo)
    throw new Error("등록일 시작은 종료일보다 늦을 수 없습니다.");
  return filters;
}

export function reviewQueryString(filters: AdminReviewFilters) {
  return new URLSearchParams(
    Object.entries(filters)
      .filter(([, value]) => value != null && String(value).trim() !== "")
      .map(([key, value]) => [key, String(value).trim()]),
  ).toString();
}

export function adminReviewError(error: unknown) {
  if (isUnauthenticatedError(error)) return "세션이 만료되었습니다. 다시 로그인해 주세요.";
  if (error instanceof ApiClientError) {
    if (error.code === "REVIEW409_IMPORT")
      return "이미 처리된 등록 요청입니다. 리뷰 목록에서 등록 결과를 확인해 주세요.";
    if (error.code === "REVIEW409_NOT_IMPORTED")
      return "서비스에서 작성된 후기는 수정할 수 없습니다.";
    if (error.status === 403) return "활성 관리자 계정만 이용할 수 있습니다.";
    if (error.status === 404) {
      return error.code === "REVIEW404" || error.code === "ACTIVITY404"
        ? "후기 또는 활동을 찾을 수 없습니다. ID를 확인해 주세요."
        : "리뷰 관리 API를 찾지 못했습니다. 백엔드 반영 상태를 확인해 주세요.";
    }
    if (error.status === 400) return error.backendMessage || "입력 내용을 확인해 주세요.";
    return "요청을 완료하지 못했습니다. 입력값은 유지되니 잠시 후 다시 시도해 주세요.";
  }
  return error instanceof Error ? error.message : "요청을 완료하지 못했습니다.";
}
