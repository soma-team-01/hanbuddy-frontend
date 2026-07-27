"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { XIcon } from "./icons";

interface ConfirmDialogBaseProps {
  title: string;
  description?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  isPending?: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}

type ConfirmDialogProps = ConfirmDialogBaseProps &
  (
    | {
        /** 확인 버튼 대신 렌더링할 커스텀 액션 (예: PayPal 결제 버튼) */
        confirmSlot: React.ReactNode;
        confirmLabel?: never;
        pendingLabel?: never;
        onConfirm?: never;
      }
    | {
        confirmSlot?: never;
        confirmLabel: string;
        pendingLabel?: string;
        onConfirm: () => void;
      }
  );

/** 실행 전 확인을 받는 공용 모달. API 호출·에러 표시는 호출부 책임이다. */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  pendingLabel,
  cancelLabel,
  tone = "default",
  isPending = false,
  onConfirm,
  onClose,
  confirmSlot,
  children,
}: Readonly<ConfirmDialogProps>) {
  const tCommon = useTranslations("Common");
  const tAccessibility = useTranslations("Accessibility");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-dialog-title"
      // Escape는 cancel → 기본 close 순으로 이어지므로 close 이벤트에서만 onClose를 부른다 (이중 호출 방지)
      onClose={onClose}
      onCancel={(event) => {
        if (isPending) event.preventDefault();
      }}
      className="motion-dialog max-md:mt-auto m-0 w-full max-w-none rounded-t-2xl border-0 bg-canvas-soft p-5 text-ink shadow-xl backdrop:bg-black/30 backdrop:backdrop-blur-[2px] md:m-auto md:w-[calc(100%-3rem)] md:max-w-lg md:rounded-2xl md:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 id="confirm-dialog-title" className="font-display text-xl font-bold text-ink">
          {title}
        </h2>
        {confirmSlot ? (
          <button
            type="button"
            aria-label={tAccessibility("closeDialog")}
            onClick={onClose}
            disabled={isPending}
            className="-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors enabled:hover:bg-primary-soft enabled:hover:text-ink disabled:opacity-60"
          >
            <XIcon className="size-5" />
          </button>
        ) : null}
      </div>
      {description ? <p className="mt-2 text-muted">{description}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
      <div className={`mt-6 ${confirmSlot ? "" : "flex gap-3"}`}>
        {confirmSlot ? (
          <div className="w-full">{confirmSlot}</div>
        ) : (
          <>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="h-12 flex-1 rounded-xl border border-line-strong bg-panel font-display text-sm font-semibold text-ink transition-colors enabled:hover:bg-panel-raised disabled:opacity-60"
            >
              {cancelLabel ?? tCommon("cancel")}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isPending}
              className={`h-12 flex-1 rounded-xl font-display text-sm font-semibold text-on-primary transition-colors disabled:opacity-60 ${
                tone === "danger"
                  ? "bg-danger enabled:hover:bg-danger/90"
                  : "bg-primary enabled:hover:bg-primary-hover"
              }`}
            >
              {isPending ? (pendingLabel ?? confirmLabel) : confirmLabel}
            </button>
          </>
        )}
      </div>
    </dialog>
  );
}
