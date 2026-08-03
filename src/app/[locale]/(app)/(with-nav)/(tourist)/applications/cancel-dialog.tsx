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

export type CancelDialogOutcome = { ok: true } | { ok: false; error: unknown };

export function CancelDialog({
  onClose,
  onConfirm,
}: Readonly<{
  onClose: () => void;
  onConfirm: (reason: ApplicationCancellationReason) => Promise<CancelDialogOutcome>;
}>) {
  const t = useTranslations("Applications");
  const tErrors = useTranslations("Errors");
  const getApiErrorMessage = useApiErrorMessage();
  const [reason, setReason] = useState<ApplicationCancellationReason | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failure, setFailure] = useState<{
    error: unknown;
    fallbackKey: "cancelFailed" | "generic";
  } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  async function handleConfirm() {
    if (!reason || isSubmitting) return;
    setIsSubmitting(true);
    setFailure(null);

    // onConfirm이 계약을 어기고 reject하면 두 버튼이 잠긴 채 복구 불가가 되므로 여기서 방어한다
    try {
      const outcome = await onConfirm(reason);
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
      className="m-0 w-full max-w-none rounded-t-3xl border-0 bg-canvas-soft p-6 text-ink shadow-2xl backdrop:bg-ink/45 backdrop:backdrop-blur-[3px] max-md:mt-auto md:m-auto md:w-[calc(100%-3rem)] md:max-w-lg md:rounded-2xl md:rounded-3xl md:p-8"
    >
      <h2 id="cancel-dialog-title" className="font-display text-xl font-bold text-ink">
        {t("cancellationTitle")}
      </h2>
      <p className="mt-2 text-muted">{t("cancellationPrompt")}</p>
      <p className="mt-5 font-display text-sm font-semibold text-ink">
        {t("cancellationQuestion")}
      </p>
      <div className="mt-3 flex flex-col gap-3">
        {REASONS.map(({ value, key }) => {
          const isSelected = reason === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setReason(value)}
              className={`flex items-center gap-3 rounded-2xl border bg-panel px-4 py-4 text-left transition-colors ${
                isSelected
                  ? "border-primary-strong bg-primary-soft"
                  : "border-line-strong hover:border-primary/50"
              }`}
            >
              <span
                aria-hidden
                className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                  isSelected ? "border-primary-strong" : "border-line-strong"
                }`}
              >
                {isSelected && <span className="size-2 rounded-full bg-primary-strong" />}
              </span>
              <span className="text-base text-ink">{t(`cancellationReasons.${key}`)}</span>
            </button>
          );
        })}
        {/* OTHER 상세 사유 입력란은 백엔드 CancelApplicationRequest.cancellationDetail 타입 오류(boolean)가
            고쳐져 실제로 전송할 수 있게 되면 다시 추가한다. 입력을 받고 버리는 UI는 두지 않는다. */}
      </div>
      {failure && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {getApiErrorMessage(
            failure.error,
            failure.fallbackKey === "generic" ? tErrors("generic") : t("cancelFailed"),
          )}
        </p>
      )}
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="h-12 flex-1 rounded-full border border-line-strong bg-panel font-display text-sm font-semibold text-ink transition-colors enabled:hover:bg-panel-raised disabled:opacity-60"
        >
          {t("keepApplication")}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!reason || isSubmitting}
          className="h-12 flex-1 rounded-full bg-primary font-display text-sm font-bold text-on-primary transition-colors enabled:hover:bg-primary-hover disabled:opacity-60"
        >
          {isSubmitting ? t("cancelling") : t("confirmCancellation")}
        </button>
      </div>
    </dialog>
  );
}
