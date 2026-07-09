"use client";

import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  isPending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: React.ReactNode;
}

/** 실행 전 확인을 받는 공용 모달. API 호출·에러 표시는 호출부 책임이다. */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "default",
  isPending = false,
  onConfirm,
  onClose,
  children,
}: Readonly<ConfirmDialogProps>) {
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
      // Tailwind preflight가 UA의 dialog margin:auto를 리셋하므로 m-auto로 중앙 정렬 복원
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border-0 bg-cream p-6 text-ink shadow-xl backdrop:bg-black/30 backdrop:backdrop-blur-[2px]"
    >
      <h2 id="confirm-dialog-title" className="font-display text-xl font-semibold text-forest">
        {title}
      </h2>
      {description ? <p className="mt-2 text-ink-soft">{description}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="h-12 flex-1 rounded-xl border border-line-strong bg-white font-display text-sm font-semibold text-ink transition-colors enabled:hover:bg-chip disabled:opacity-60"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className={`h-12 flex-1 rounded-xl font-display text-sm font-semibold text-cream transition-colors disabled:opacity-60 ${
            tone === "danger"
              ? "bg-danger enabled:hover:bg-danger/90"
              : "bg-forest enabled:hover:bg-forest-soft"
          }`}
        >
          {isPending ? `${confirmLabel}...` : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
