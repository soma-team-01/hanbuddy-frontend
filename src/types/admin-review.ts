import type { ResolvedContentLanguage } from "./content-language";
import type { ReviewSource } from "./review";

export type ReviewVisibility = "VISIBLE" | "HIDDEN";
export interface AdminReview {
  reviewId: number;
  activityId: number;
  activityTitle: string;
  buddyId: number;
  applicationId: number | null;
  reviewerId: number | null;
  reviewerName: string | null;
  source: ReviewSource;
  visibility: ReviewVisibility;
  rating: number;
  content: string;
  sourceLanguage: ResolvedContentLanguage;
  contentVersion: number;
  sourceReference: string | null;
  originalReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  hiddenReason: string | null;
  moderatedBy: number | null;
  moderatedAt: string | null;
}
export interface AdminReviewTranslation {
  targetLanguage: ResolvedContentLanguage;
  status: "CURRENT" | "STALE" | "MISSING" | "SOURCE_UNKNOWN";
  sourceVersion: number | null;
  content: string | null;
}
export interface AdminReviewFilters {
  reviewId?: number;
  activityId?: number;
  reviewerId?: number;
  buddyId?: number;
  rating?: number;
  sourceLanguage?: ResolvedContentLanguage;
  source?: ReviewSource;
  visibility?: ReviewVisibility;
  reviewerName?: string;
  sourceReference?: string;
  createdFrom?: string;
  createdTo?: string;
  page: number;
  size: number;
}
export interface ImportedReviewContent {
  reviewerName: string | null;
  rating: number;
  content: string;
  originalReviewedAt: string | null;
  reason: string;
}
export interface ImportReviewRequest extends ImportedReviewContent {
  sourceReference: string;
}
