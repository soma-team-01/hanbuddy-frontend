"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { MAX_REVIEW_RATING } from "@/components/review/ReviewStars";
import { StarIcon, XIcon } from "@/components/ui/icons";

export const MAX_REVIEW_CONTENT_LENGTH = 1000;

const STARS = Array.from({ length: MAX_REVIEW_RATING }, (_, index) => index + 1);

/**
 * 후기 작성·수정 폼.
 * 저장 호출과 에러 메시지 변환은 호출부가 맡고, 이 컴포넌트는 입력 검증만 책임진다.
 */
export function ReviewFormDialog({
  review,
  activityTitle,
  isSaving = false,
  errorMessage,
  onSubmit,
  onClose,
}: Readonly<{
  /** 수정 모드일 때 기존 후기. 새로 작성하면 null */
  review?: { rating: number; content: string } | null;
  activityTitle: string;
  isSaving?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: { rating: number; content: string }) => void;
  onClose: () => void;
}>) {
  const t = useTranslations("Reviews");
  const tCommon = useTranslations("Common");
  const tAccessibility = useTranslations("Accessibility");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [content, setContent] = useState(review?.content ?? "");
  const [validationKey, setValidationKey] = useState<"ratingRequired" | "contentRequired" | null>(
    null,
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function handleSubmit() {
    if (rating < 1) {
      setValidationKey("ratingRequired");
      return;
    }
    if (!content.trim()) {
      setValidationKey("contentRequired");
      return;
    }
    setValidationKey(null);
    onSubmit({ rating, content: content.trim() });
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="review-form-title"
      onClose={onClose}
      onCancel={(event) => {
        if (isSaving) event.preventDefault();
      }}
      className="motion-dialog m-0 w-full max-w-none rounded-t-3xl border-0 bg-canvas-soft p-6 text-ink shadow-2xl backdrop:bg-ink/45 backdrop:backdrop-blur-[3px] max-md:mt-auto md:m-auto md:w-[calc(100%-3rem)] md:max-w-lg md:rounded-2xl md:p-8"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="review-form-title" className="font-display text-xl font-bold text-ink">
            {review ? t("editTitle") : t("createTitle")}
          </h2>
          <p className="mt-1 truncate text-sm text-muted">{activityTitle}</p>
        </div>
        <button
          type="button"
          aria-label={tAccessibility("closeDialog")}
          onClick={onClose}
          disabled={isSaving}
          className="-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors enabled:hover:border enabled:hover:border-primary enabled:hover:text-primary disabled:opacity-60"
        >
          <XIcon className="size-5" />
        </button>
      </div>

      <fieldset className="mt-6">
        <legend className="font-display text-sm font-bold text-ink">{t("yourRating")}</legend>
        <div className="mt-2 flex items-center gap-1">
          {STARS.map((star) => (
            <button
              key={star}
              type="button"
              aria-label={t("starLabel", { rating: star })}
              aria-pressed={star === rating}
              onClick={() => setRating(star)}
              disabled={isSaving}
              className="rounded-full p-1 transition-transform enabled:hover:scale-110 disabled:opacity-60"
            >
              <StarIcon
                className={`size-7 ${star <= rating ? "text-primary" : "text-line-strong"}`}
              />
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-5">
        <label htmlFor="review-content" className="font-display text-sm font-bold text-ink">
          {t("contentLabel")}
        </label>
        <textarea
          id="review-content"
          rows={5}
          value={content}
          maxLength={MAX_REVIEW_CONTENT_LENGTH}
          disabled={isSaving}
          placeholder={t("contentPlaceholder")}
          onChange={(event) => setContent(event.target.value)}
          className="mt-2 w-full resize-none rounded-xl border border-line-strong bg-canvas-soft px-4 py-3 text-sm leading-6 text-ink transition-colors placeholder:text-muted focus:border-primary focus:outline-none disabled:opacity-60"
        />
        <p className="mt-1 text-right text-xs text-muted">
          {t("contentCount", { count: content.length, max: MAX_REVIEW_CONTENT_LENGTH })}
        </p>
      </div>

      {validationKey ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {t(validationKey)}
        </p>
      ) : null}
      {errorMessage ? (
        <p
          role="alert"
          className="mt-2 rounded-xl border border-danger/20 px-4 py-3 text-sm text-danger"
        >
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="h-12 flex-1 rounded-xl border border-line-strong font-display text-sm font-semibold text-ink transition-colors enabled:hover:border-primary enabled:hover:text-primary disabled:opacity-60"
        >
          {tCommon("cancel")}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving}
          className="h-12 flex-1 rounded-xl bg-primary font-display text-sm font-semibold text-on-primary transition-colors enabled:hover:bg-primary-hover disabled:opacity-60"
        >
          {isSaving ? t("saving") : review ? t("save") : t("submit")}
        </button>
      </div>
    </dialog>
  );
}
