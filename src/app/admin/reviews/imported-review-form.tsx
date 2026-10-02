"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminPageTitle } from "@/app/admin/admin-ui";
import { parseImportedReview, positiveReviewId } from "@/lib/admin/reviews";
import { importAdminReview, editImportedReview, getAdminReviews } from "@/lib/api/admin-reviews";
import { getSeoulDateTimeParts, toSeoulStartAt } from "@/lib/datetime";
import { unwrapApiResult } from "@/lib/query/result";
import { invalidateAdminReviewChange } from "@/lib/query/admin-reviews";
import type { AdminReview, ImportReviewRequest } from "@/types/admin-review";
import {
  ReviewError,
  reviewButton,
  reviewInput,
  reviewMain,
  reviewPanel,
  reviewPrimaryButton,
} from "./review-ui";

async function registerReview(activityId: number, input: ImportReviewRequest) {
  const result = await importAdminReview(activityId, input);
  if (result.status === "error" && result.error.code === "REVIEW409_IMPORT") {
    // A previous attempt may have committed even if its response was lost.
    // Resolve only this form's request key, never matching by review content.
    const existing = unwrapApiResult(
      await getAdminReviews({
        page: 0,
        size: 1,
        sourceReference: input.sourceReference,
      }),
      "reviews",
    ).content.find((item) => item.sourceReference === input.sourceReference);
    if (!existing) throw result.error;
    return existing;
  }
  return unwrapApiResult(result, "review");
}

export function ImportedReviewForm({
  review,
  onSaved,
  onCancel,
}: {
  review?: AdminReview;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const client = useQueryClient();
  const busy = useRef(false);
  // One key per mounted creation form; keep it through validation and request failures.
  const registrationKey = useRef<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const originalParts = review?.originalReviewedAt
    ? getSeoulDateTimeParts(review.originalReviewedAt)
    : null;
  const originalLocal = originalParts ? `${originalParts.date}T${originalParts.time}` : "";
  const [date, setDate] = useState(originalLocal);
  const editing = Boolean(review);

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const data = new FormData(event.currentTarget);
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      // Preserve the exact original timestamp, including seconds, unless explicitly changed.
      const originalReviewedAt =
        date === originalLocal && review
          ? review.originalReviewedAt
          : date
            ? toSeoulStartAt(date)
            : null;
      if (date && !originalReviewedAt) throw new Error("원본 작성일을 확인해 주세요.");
      const input = {
        reviewerName: String(data.get("reviewerName") ?? ""),
        rating: Number(data.get("rating")),
        content: data.get("content"),
        originalReviewedAt,
        reason: data.get("reason"),
        sourceReference: review
          ? undefined
          : (registrationKey.current ??= `admin-import:${crypto.randomUUID()}`),
      };
      const saved = review
        ? unwrapApiResult(
            await editImportedReview(review.reviewId, parseImportedReview(input, false)),
            "review",
          )
        : await registerReview(
            positiveReviewId(String(data.get("activityId") ?? "")),
            parseImportedReview(input, true),
          );
      await invalidateAdminReviewChange(client, saved);
      if (onSaved) onSaved();
      else router.replace(`/admin/reviews/${saved.reviewId}`);
    } catch (failure) {
      setError(failure);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <section className={editing ? "" : `${reviewMain} max-w-[800px]`}>
      {!editing ? (
        <>
          <Link href="/admin/reviews" className="text-sm text-muted hover:text-primary">
            ← 리뷰 관리
          </Link>
          <AdminPageTitle title="기존 후기 등록" />
        </>
      ) : null}
      <form onSubmit={submit} className={`${reviewPanel} mt-4`}>
        <fieldset disabled={pending} className="space-y-5 disabled:opacity-60">
          <legend className="sr-only">{editing ? "이관 후기 수정" : "기존 후기 등록"}</legend>
          <p className="text-sm text-muted">
            {editing
              ? "저장된 원문을 수정합니다. 숨김 상태는 유지되며, 내용 변경 시 번역이 다시 생성됩니다."
              : "실제 원본이 있는 후기만 등록해 주세요. 등록 즉시 공개되며 활동의 평점에 반영됩니다."}
          </p>
          {!editing ? (
            <label className="block text-sm font-bold">
              활동 ID
              <input
                name="activityId"
                required
                inputMode="numeric"
                pattern="[0-9]+"
                className={reviewInput}
              />
            </label>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-bold">
              작성자명 <span className="font-normal text-muted">(선택)</span>
              <input
                name="reviewerName"
                defaultValue={review?.reviewerName ?? ""}
                maxLength={100}
                className={reviewInput}
                placeholder="알 수 없으면 비워 두세요"
              />
            </label>
            <label className="block text-sm font-bold">
              별점
              <select
                name="rating"
                required
                defaultValue={review?.rating ?? ""}
                className={reviewInput}
              >
                <option value="" disabled>
                  선택
                </option>
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value}점
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm font-bold">
            원본 작성일 <span className="font-normal text-muted">(선택 · 한국 시간)</span>
            <input
              type="datetime-local"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={reviewInput}
            />
            <span className="mt-1 block text-xs font-normal text-muted">
              정확한 일시를 모르면 비워 두세요. 등록일로 대체하지 않습니다.
            </span>
          </label>
          <label className="block text-sm font-bold">
            후기 원문
            <textarea
              name="content"
              defaultValue={review?.content ?? ""}
              required
              maxLength={1000}
              rows={6}
              className={`${reviewInput} resize-y`}
            />
            <span className="text-xs font-normal text-muted">최대 1,000자</span>
          </label>
          <label className="block text-sm font-bold">
            {editing ? "수정 사유" : "등록 사유"}
            <textarea name="reason" required maxLength={500} rows={2} className={reviewInput} />
            <span className="text-xs font-normal text-muted">
              관리자 작업 이력에 기록됩니다. 최대 500자
            </span>
          </label>
          {!editing ? (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" required className="mt-1 accent-primary" />
              원본과 활동 ID를 확인했으며, 공개 등록에 동의합니다.
            </label>
          ) : null}
        </fieldset>
        <ReviewError error={error} />
        <div className="mt-5 flex justify-end gap-2">
          {onCancel ? (
            <button type="button" disabled={pending} className={reviewButton} onClick={onCancel}>
              수정 취소
            </button>
          ) : null}
          <button type="submit" disabled={pending} className={reviewPrimaryButton}>
            {pending ? "저장 중" : editing ? "변경 저장" : "후기 공개 등록"}
          </button>
        </div>
      </form>
    </section>
  );
}
