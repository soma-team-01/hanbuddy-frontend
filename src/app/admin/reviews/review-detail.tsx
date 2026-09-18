"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AdminLoadingRows,
  AdminPageTitle,
  AdminReasonDialog,
  formatAdminDate,
} from "@/app/admin/admin-ui";
import { REVIEW_LANGUAGES } from "@/lib/admin/reviews";
import { moderateAdminReview } from "@/lib/api/admin-reviews";
import {
  adminReviewQueryOptions,
  adminReviewTranslationsQueryOptions,
  invalidateAdminReviewChange,
} from "@/lib/query/admin-reviews";
import { unwrapApiResult } from "@/lib/query/result";
import { ImportedReviewForm } from "./imported-review-form";
import { ReviewBadges, ReviewError, reviewButton, reviewMain, reviewPanel } from "./review-ui";

const TRANSLATION_LABELS = {
  CURRENT: "최신 번역",
  STALE: "이전 버전 번역",
  MISSING: "저장된 번역 없음",
  SOURCE_UNKNOWN: "원문 언어 미확인",
};

export function ReviewDetail({ reviewId }: { reviewId: string }) {
  const client = useQueryClient();
  const query = useQuery(adminReviewQueryOptions(reviewId));
  const translations = useQuery({
    ...adminReviewTranslationsQueryOptions(reviewId),
    enabled: Boolean(query.data) && !query.error,
  });
  const review = query.data;
  const [editing, setEditing] = useState(false);
  const [action, setAction] = useState<"hide" | "restore" | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);

  async function moderate() {
    if (!review || !action || busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const saved = unwrapApiResult(
        await moderateAdminReview(review.reviewId, action, reason.trim()),
        "review",
      );
      await invalidateAdminReviewChange(client, saved);
      setAction(null);
      setReason("");
    } catch (failure) {
      setError(failure);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <main className={reviewMain}>
      <Link href="/admin/reviews" className="text-sm text-muted hover:text-primary">
        ← 리뷰 관리
      </Link>
      <AdminPageTitle
        title={`리뷰 #${reviewId}`}
        aside={
          <button
            type="button"
            className={reviewButton}
            disabled={query.isFetching || editing || pending}
            onClick={() => void query.refetch()}
          >
            새로고침
          </button>
        }
      />
      <ReviewError error={query.error} />
      {query.isPending ? <AdminLoadingRows /> : null}
      {review && !query.error ? (
        <>
          <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <section className={reviewPanel}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <ReviewBadges review={review} />
                <span className="text-sm font-bold text-primary">{review.rating} / 5</span>
              </div>
              <h2 className="mt-4 text-lg font-bold break-words">{review.activityTitle}</h2>
              <p className="mt-1 text-sm text-muted">
                {review.reviewerName?.trim() || "익명"} · 활동 #{review.activityId} · 버디 #
                {review.buddyId}
              </p>
              <p className="mt-5 text-sm leading-7 [overflow-wrap:anywhere] whitespace-pre-wrap">
                {review.content}
              </p>
              <div className="mt-5 flex flex-wrap gap-2 border-t border-line-soft pt-4">
                {review.source === "LEGACY_IMPORT" ? (
                  <button
                    type="button"
                    disabled={editing || pending}
                    className={reviewButton}
                    onClick={() => setEditing(true)}
                  >
                    원문 수정
                  </button>
                ) : (
                  <span className="self-center text-xs text-muted">
                    서비스 후기는 내용을 수정할 수 없습니다.
                  </span>
                )}
                <button
                  type="button"
                  className={reviewButton}
                  disabled={editing || pending}
                  onClick={() => {
                    setAction(review.visibility === "HIDDEN" ? "restore" : "hide");
                    setError(null);
                    setReason("");
                  }}
                >
                  {review.visibility === "HIDDEN" ? "공개 복원" : "후기 숨기기"}
                </button>
              </div>
            </section>
            <aside className={`${reviewPanel} text-xs`}>
              <h2 className="mb-4 text-sm font-bold">등록 정보</h2>
              <dl className="space-y-3">
                {[
                  ["원본 식별값", review.sourceReference],
                  [
                    "원문 언어",
                    REVIEW_LANGUAGES.find(([value]) => value === review.sourceLanguage)?.[1],
                  ],
                  ["원문 버전", String(review.contentVersion)],
                  [
                    "원본 작성일",
                    review.originalReviewedAt
                      ? formatAdminDate(review.originalReviewedAt, true)
                      : "미상",
                  ],
                  ["시스템 등록일", formatAdminDate(review.createdAt, true)],
                  ["최근 수정일", formatAdminDate(review.updatedAt, true)],
                  ["작성자 회원 ID", review.reviewerId],
                  ["신청 ID", review.applicationId],
                  ["숨김 사유", review.hiddenReason],
                  ["최근 처리 관리자 ID", review.moderatedBy],
                  [
                    "최근 처리일",
                    review.moderatedAt ? formatAdminDate(review.moderatedAt, true) : null,
                  ],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <dt className="text-muted">{label}</dt>
                    <dd className="mt-1 [overflow-wrap:anywhere] whitespace-pre-wrap">
                      {value ?? "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            </aside>
          </div>
          {editing && review.source === "LEGACY_IMPORT" ? (
            <ImportedReviewForm
              review={review}
              onCancel={() => setEditing(false)}
              onSaved={() => setEditing(false)}
            />
          ) : null}
          <section className={`${reviewPanel} mt-4`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold">번역 상태</h2>
              <button
                type="button"
                className={reviewButton}
                disabled={translations.isFetching}
                onClick={() => void translations.refetch()}
              >
                번역 새로고침
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">
              번역은 비동기로 생성됩니다. 저장된 번역이 없다는 표시만으로 실패 여부를 판단할 수
              없습니다.
            </p>
            <ReviewError error={translations.error} />
            {translations.isPending ? <AdminLoadingRows /> : null}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {translations.data?.map((translation) => (
                <article
                  key={translation.targetLanguage}
                  className="rounded-lg border border-line-soft p-3"
                >
                  <div className="flex flex-wrap justify-between gap-2 text-xs">
                    <h3 className="font-bold">
                      {
                        REVIEW_LANGUAGES.find(
                          ([value]) => value === translation.targetLanguage,
                        )?.[1]
                      }
                    </h3>
                    <span className="text-muted">
                      {TRANSLATION_LABELS[translation.status]}
                      {translation.sourceVersion != null ? ` · v${translation.sourceVersion}` : ""}
                    </span>
                  </div>
                  {translation.content ? (
                    <p className="mt-3 text-sm leading-6 [overflow-wrap:anywhere] whitespace-pre-wrap">
                      {translation.content}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}
      {action ? (
        <AdminReasonDialog
          title={action === "hide" ? "이 후기를 숨길까요?" : "이 후기를 다시 공개할까요?"}
          description={
            action === "hide"
              ? "공개 후기 목록과 평점 집계에서 제외됩니다. 원문과 이력은 유지됩니다."
              : "공개 후기 목록과 평점 집계에 다시 포함됩니다."
          }
          confirmLabel={action === "hide" ? "숨기기" : "공개 복원"}
          reason={reason}
          onReason={setReason}
          pending={pending}
          onClose={() => {
            setAction(null);
            setError(null);
          }}
          onConfirm={() => void moderate()}
        >
          <ReviewError error={error} />
        </AdminReasonDialog>
      ) : null}
    </main>
  );
}
