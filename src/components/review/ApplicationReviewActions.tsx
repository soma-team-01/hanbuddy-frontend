"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ReviewFormDialog } from "@/components/review/ReviewFormDialog";
import { ReviewStars } from "@/components/review/ReviewStars";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CornerDownRightIcon, PencilIcon, TrashIcon } from "@/components/ui/icons";
import { createReview, deleteReview, updateReview } from "@/lib/api/reviews";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { formatSeoulDate } from "@/lib/datetime";
import { getContentLanguage } from "@/lib/content-language";
import { activityKeys } from "@/lib/query/activities";
import { applicationKeys } from "@/lib/query/applications";
import { unwrapApiResult } from "@/lib/query/result";
import { buddyProfileKeys, reviewKeys } from "@/lib/query/reviews";
import type { Locale } from "@/i18n/routing";
import type { MyReviewResponse } from "@/types/review";

/**
 * 완료된 신청 카드의 후기 작성·수정·삭제 액션.
 * 기존 후기 여부는 신청 응답의 `myReview`로 판단하므로 새로고침 후에도 상태가 유지된다.
 */
export function ApplicationReviewActions({
  applicationId,
  activityTitle,
  review,
}: Readonly<{
  applicationId: number | string;
  activityTitle: string;
  /** 신청 응답이 내려준 내 후기. 아직 쓰지 않았으면 null */
  review: MyReviewResponse | null;
}>) {
  const t = useTranslations("Reviews");
  const locale = useLocale() as Locale;
  const language = getContentLanguage(locale);
  const getApiErrorMessage = useApiErrorMessage();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const writtenOn = review ? formatSeoulDate(review.createdAt, locale) : null;

  async function refreshReviewViews() {
    await Promise.all([
      // 신청 목록이 myReview를 함께 내려주므로 버튼 상태도 여기서 갱신된다
      queryClient.invalidateQueries({ queryKey: applicationKeys.mine() }),
      queryClient.invalidateQueries({ queryKey: reviewKeys.all() }),
      queryClient.invalidateQueries({ queryKey: buddyProfileKeys.all() }),
      // 평균 별점이 바뀌므로 활동 목록·상세도 다시 불러온다
      queryClient.invalidateQueries({ queryKey: activityKeys.all() }),
    ]);
  }

  const saveMutation = useMutation({
    mutationFn: async (values: { rating: number; content: string }) =>
      review
        ? unwrapApiResult(await updateReview(review.reviewId, values, language), "review")
        : unwrapApiResult(
            await createReview({ applicationId: Number(applicationId), ...values }, language),
            "review",
          ),
    onSuccess: async () => {
      setFormOpen(false);
      setError(null);
      await refreshReviewViews();
    },
    onError: setError,
  });

  const deleteMutation = useMutation({
    mutationFn: async (reviewId: number) => unwrapApiResult(await deleteReview(reviewId), "review"),
    onSuccess: async () => {
      setDeleteOpen(false);
      setError(null);
      await refreshReviewViews();
    },
    onError: setError,
  });

  return (
    <div className="flex flex-col gap-2">
      {review ? (
        /*
         * 활동에 딸린 답글처럼 보이도록 화살표를 앞에 두고,
         * 카드 썸네일(size-24 / md:size-28) + gap-4 만큼 들여써 활동 제목과 좌측을 맞춘다.
         */
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="flex size-24 shrink-0 items-start justify-end pt-3 pr-1 text-line-strong md:size-28"
          >
            <CornerDownRightIcon className="size-5" />
          </span>
          <section className="min-w-0 flex-1 rounded-2xl border border-primary/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-[11px] font-bold tracking-[0.12em] text-primary uppercase">
                  {t("yourReview")}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <ReviewStars
                    rating={review.rating}
                    label={t("ratingAria", { rating: review.rating })}
                    starClassName="size-3.5"
                  />
                  {writtenOn ? <span className="text-xs text-muted">{writtenOn}</span> : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  title={t("edit")}
                  aria-label={t("edit")}
                  onClick={() => {
                    setError(null);
                    setFormOpen(true);
                  }}
                  className="flex size-9 items-center justify-center rounded-full border border-transparent text-muted transition-colors hover:border-primary hover:text-primary"
                >
                  <PencilIcon className="size-4" />
                </button>
                <button
                  type="button"
                  title={t("delete")}
                  aria-label={t("delete")}
                  onClick={() => {
                    setError(null);
                    setDeleteOpen(true);
                  }}
                  className="flex size-9 items-center justify-center rounded-full border border-transparent text-muted transition-colors hover:border-danger hover:text-danger"
                >
                  <TrashIcon className="size-4" />
                </button>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 whitespace-pre-line text-ink">{review.content}</p>
          </section>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setFormOpen(true);
          }}
          className="h-11 w-full rounded-lg bg-primary font-display text-sm font-bold text-on-primary transition-colors hover:bg-primary-hover"
        >
          {t("write")}
        </button>
      )}

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
          review={review}
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
