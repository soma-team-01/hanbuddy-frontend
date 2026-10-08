import type { PolicySlug } from "@/lib/policy-routes";

/**
 * 사이트맵 lastmod. 화면 문구나 구성이 실제로 바뀐 날짜를 적는다(배포 날짜가 아니다).
 * 해당 화면의 문구·정책 문서를 고치는 PR에서 날짜도 같이 올린다.
 * 활동 상세는 공개 API에 수정일이 없어 lastmod를 넣지 않는다.
 */
export const PAGE_LAST_MODIFIED = {
  home: "2026-10-06",
  about: "2026-10-06",
  faq: "2026-10-06",
  explore: "2026-10-02",
  buddy: "2026-09-30",
} as const;

/** 사이트맵에 올리는 공개 정책 문서와 마지막 개정일. 버디 전용 약관·동의 고지는 검색 노출 대상이 아니다. */
export const PUBLIC_POLICY_LAST_MODIFIED = {
  "privacy-policy": "2026-09-08",
  "terms-of-service": "2026-10-02",
  "cancellation-refund-policy": "2026-09-08",
} as const satisfies Partial<Record<PolicySlug, string>>;
