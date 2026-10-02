import type { AdminReview } from "@/types/admin-review";

export const adminReviewFixture: AdminReview = {
  reviewId: 42,
  activityId: 7,
  activityTitle: "한강 노을 산책",
  buddyId: 3,
  applicationId: null,
  reviewerId: null,
  reviewerName: null,
  source: "LEGACY_IMPORT",
  visibility: "VISIBLE",
  rating: 5,
  content: "한강에서 노을을 보며 서울의 이야기를 들을 수 있어서 좋았어요.",
  sourceLanguage: "KO",
  contentVersion: 1,
  sourceReference: "legacy:42",
  originalReviewedAt: null,
  createdAt: "2026-09-01T12:00:00+09:00",
  updatedAt: "2026-09-01T12:00:00+09:00",
  hiddenReason: null,
  moderatedBy: null,
  moderatedAt: null,
};
