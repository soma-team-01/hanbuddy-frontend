"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import type { ApplicationCancellationReason } from "@/types/application";

const REASONS = [
  { value: "SCHEDULE_CONFLICT", key: "scheduleConflict" },
  { value: "ILLNESS", key: "illness" },
  { value: "FOUND_OTHER", key: "foundOther" },
  { value: "OTHER", key: "other" },
] as const satisfies ReadonlyArray<{ value: ApplicationCancellationReason; key: string }>;

/** 백엔드 CancelApplicationRequest.cancellationDetail의 @Size(max = 255)와 맞춘다 */
const CANCELLATION_DETAIL_MAX_LENGTH = 255;

export type CancelDialogOutcome = { ok: true } | { ok: false; error: unknown };

export function CancelDialog({
  onClose,
  onConfirm,
}: Readonly<{
  onClose: () => void;
  onConfirm: (
    reason: ApplicationCancellationReason,
    detail?: string,
  ) => Promise<CancelDialogOutcome>;
}>) {
  const t = useTranslations("Applications");
  const tErrors = useTranslations("Errors");
  const getApiErrorMessage = useApiErrorMessage();
  const [reason, setReason] = useState<ApplicationCancellationReason | null>(null);
  const [detail, setDetail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failure, setFailure] = useState<{
    error: unknown;
    fallbackKey: "cancelFailed" | "generic";
  } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const detailRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  // 기타를 고르면 곧바로 적을 수 있게 커서를 옮긴다
  useEffect(() => {
    if (reason === "OTHER") detailRef.current?.focus();
  }, [reason]);

  const trimmedDetail = detail.trim();
  // 백엔드는 OTHER에서 상세 사유를 필수로 받는다
  const needsDetail = reason === "OTHER";
  const canSubmit = Boolean(reason) && (!needsDetail || trimmedDetail.length > 0);

  async function handleConfirm() {
    if (!reason || !canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    setFailure(null);

    // onConfirm이 계약을 어기고 reject하면 두 버튼이 잠긴 채 복구 불가가 되므로 여기서 방어한다
    try {
      const outcome = await onConfirm(reason, needsDetail ? trimmedDetail : undefined);
      if (!outcome.ok) {
        setFailure({ error: outcome.error, fallbackKey: "cancelFailed" });
        setIsSubmitting(false);
      }
      // 성공 시에는 부모가 다이얼로그를 언마운트하므로 여기서 상태를 만지지 않는다.
    } catch (error) {
      setFailure({ error, fallbackKey: "generic" });
      setIsSubmitting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="cancel-dialog-title"
      // Escape는 cancel → 기본 close 순으로 이어지므로 close 이벤트에서만 onClose를 부른다 (이중 호출 방지)
      onCancel={(event) => {
        if (isSubmitting) event.preventDefault();
      }}
      onClose={onClose}
      className="motion-dialog m-0 w-full max-w-none rounded-t-3xl border-0 bg-canvas-soft p-6 text-ink shadow-2xl backdrop:bg-ink/45 backdrop:backdrop-blur-[3px] max-md:mt-auto md:m-auto md:w-[calc(100%-3rem)] md:max-w-lg md:rounded-3xl md:p-8"
    >
      <h2 id="cancel-dialog-title" className="font-display text-xl font-bold text-ink">
        {t("cancellationTitle")}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted">{t("cancellationPrompt")}</p>

      <p className="mt-6 font-display text-sm font-bold text-ink">{t("cancellationQuestion")}</p>
      <div className="mt-3 flex flex-col gap-2">
        {REASONS.map(({ value, key }) => {
          const isSelected = reason === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setReason(value)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors ${
                isSelected
                  ? "border-primary text-primary"
                  : "border-line-soft text-ink hover:border-primary/40"
              }`}
            >
              <span
                aria-hidden
                className={`flex size-[18px] shrink-0 items-center justify-center rounded-full border transition-colors ${
                  isSelected ? "border-primary" : "border-line-strong"
                }`}
              >
                {isSelected ? <span className="size-2.5 rounded-full bg-primary" /> : null}
              </span>
              <span className={`text-sm ${isSelected ? "font-bold" : "font-medium"}`}>
                {t(`cancellationReasons.${key}`)}
              </span>
            </button>
          );
        })}
      </div>

      {/* 기타 사유는 무엇이 문제였는지 남겨야 버디에게 전달할 내용이 생긴다 */}
      {needsDetail ? (
        <div className="mt-4">
          <label htmlFor="cancellation-detail" className="font-display text-sm font-bold text-ink">
            {t("cancellationDetailLabel")}
          </label>
          <textarea
            id="cancellation-detail"
            ref={detailRef}
            rows={3}
            value={detail}
            maxLength={CANCELLATION_DETAIL_MAX_LENGTH}
            disabled={isSubmitting}
            placeholder={t("cancellationDetailPlaceholder")}
            onChange={(event) => setDetail(event.target.value)}
            className="focus-border-only mt-2 w-full resize-none rounded-xl border border-line-strong bg-canvas-soft px-4 py-3 text-sm leading-6 text-ink transition-colors placeholder:text-muted focus:border-primary focus:outline-none disabled:opacity-60"
          />
          <p className="mt-1.5 text-right text-xs text-muted tabular-nums">
            {t("cancellationDetailCount", {
              count: trimmedDetail.length,
              max: CANCELLATION_DETAIL_MAX_LENGTH,
            })}
          </p>
        </div>
      ) : null}

      {failure ? (
        <p role="alert" className="mt-4 border-l-2 border-danger pl-3 text-sm text-danger">
          {getApiErrorMessage(
            failure.error,
            failure.fallbackKey === "generic" ? tErrors("generic") : t("cancelFailed"),
          )}
        </p>
      ) : null}

      <div className="mt-6 flex gap-2.5">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="h-12 flex-1 rounded-xl border border-line-strong font-display text-sm font-semibold text-ink transition-colors enabled:hover:border-primary enabled:hover:text-primary disabled:opacity-60"
        >
          {t("keepApplication")}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canSubmit || isSubmitting}
          className="h-12 flex-1 rounded-xl border border-primary font-display text-sm font-bold text-primary transition-colors enabled:hover:bg-primary enabled:hover:text-on-primary disabled:opacity-40"
        >
          {isSubmitting ? t("cancelling") : t("confirmCancellation")}
        </button>
      </div>
    </dialog>
  );
}
