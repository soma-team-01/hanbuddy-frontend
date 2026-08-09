"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ReviewFormDialog } from "@/components/review/ReviewFormDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { createReview, deleteReview, updateReview } from "@/lib/api/reviews";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { activityKeys } from "@/lib/query/activities";
import { unwrapApiResult } from "@/lib/query/result";
import { buddyProfileKeys, reviewKeys } from "@/lib/query/reviews";
import type { ReviewResponse } from "@/types/review";

/**
 * 완료된 신청 카드의 후기 작성·수정·삭제 액션.
 *
 * 백엔드가 신청 응답에 기존 후기를 함께 내려주지 않아, 새로고침 전까지는 이번 세션에서 작성한
 * 후기만 수정·삭제 버튼으로 이어진다. (백엔드에 `myReview` 노출을 요청해 둔 상태)
 */
export function ApplicationReviewActions({
  applicationId,
  activityTitle,
}: Readonly<{
  applicationId: number | string;
  activityTitle: string;
}>) {
  const t = useTranslations("Reviews");
  const getApiErrorMessage = useApiErrorMessage();
  const queryClient = useQueryClient();
  const [review, setReview] = useState<ReviewResponse | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function invalidateReviewViews() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: reviewKeys.all() }),
      queryClient.invalidateQueries({ queryKey: buddyProfileKeys.all() }),
      // 평균 별점이 바뀌므로 목록·상세도 다시 불러온다
      queryClient.invalidateQueries({ queryKey: activityKeys.all() }),
    ]);
  }

  const saveMutation = useMutation({
    mutationFn: async (values: { rating: number; content: string }) =>
      review
        ? unwrapApiResult(await updateReview(review.reviewId, values), "review")
        : unwrapApiResult(
            await createReview({ applicationId: Number(applicationId), ...values }),
            "review",
          ),
    onSuccess: async (saved) => {
      setReview(saved);
      setFormOpen(false);
      setError(null);
      await invalidateReviewViews();
    },
    onError: setError,
  });

  const deleteMutation = useMutation({
    mutationFn: async (reviewId: number) => unwrapApiResult(await deleteReview(reviewId), "review"),
    onSuccess: async () => {
      setReview(null);
      setDeleteOpen(false);
      setError(null);
      await invalidateReviewViews();
    },
    onError: setError,
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setFormOpen(true);
          }}
          className="h-11 flex-1 rounded-lg border border-primary font-display text-sm font-bold text-primary transition-colors hover:bg-primary-soft"
        >
          {review ? t("edit") : t("write")}
        </button>
        {review ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setDeleteOpen(true);
            }}
            className="h-11 rounded-lg border border-line-strong px-4 font-display text-sm font-bold text-muted transition-colors hover:border-danger hover:text-danger"
          >
            {t("delete")}
          </button>
        ) : null}
      </div>

      {error !== null && !formOpen && !deleteOpen ? (
        <p
          role="alert"
          className="rounded-xl border border-danger/20 px-4 py-3 text-sm text-danger"
        >
          {getApiErrorMessage(error, t("saveError"))}
        </p>
      ) : null}

      {formOpen ? (
        <ReviewFormDialog
          review={review ?? undefined}
          activityTitle={activityTitle}
          isSaving={saveMutation.isPending}
          errorMessage={error === null ? null : getApiErrorMessage(error, t("saveError"))}
          onSubmit={(values) => saveMutation.mutate(values)}
          onClose={() => {
            if (saveMutation.isPending) return;
            setFormOpen(false);
            setError(null);
          }}
        />
      ) : null}

      {deleteOpen && review ? (
        <ConfirmDialog
          title={t("deleteTitle")}
          description={t("deleteDescription")}
          confirmLabel={t("delete")}
          pendingLabel={t("deleting")}
          tone="danger"
          isPending={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(review.reviewId)}
          onClose={() => {
            if (deleteMutation.isPending) return;
            setDeleteOpen(false);
          }}
        >
          {error !== null ? (
            <p role="alert" className="text-sm text-danger">
              {getApiErrorMessage(error, t("deleteError"))}
            </p>
          ) : null}
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
