"use client";

import { useEffect, useRef, useState } from "react";
import type { ApplicationCancellationReason } from "@/types/application";

const REASONS = [
  { value: "SCHEDULE_CONFLICT", label: "Schedule conflict" },
  { value: "ILLNESS", label: "Illness or unexpected emergency" },
  { value: "FOUND_OTHER", label: "Found another option" },
  { value: "OTHER", label: "Other reason" },
] as const satisfies ReadonlyArray<{ value: ApplicationCancellationReason; label: string }>;

export type CancelDialogOutcome = { ok: true } | { ok: false; message: string };

export function CancelDialog({
  onClose,
  onConfirm,
}: Readonly<{
  onClose: () => void;
  onConfirm: (reason: ApplicationCancellationReason) => Promise<CancelDialogOutcome>;
}>) {
  const [reason, setReason] = useState<ApplicationCancellationReason | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  async function handleConfirm() {
    if (!reason || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage("");

    const outcome = await onConfirm(reason);
    if (!outcome.ok) {
      setErrorMessage(outcome.message);
      setIsSubmitting(false);
    }
    // 성공 시에는 부모가 다이얼로그를 언마운트하므로 여기서 상태를 만지지 않는다.
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="cancel-dialog-title"
      // Escape는 cancel → 기본 close 순으로 이어지므로 close 이벤트에서만 onClose를 부른다 (이중 호출 방지)
      onClose={onClose}
      // Tailwind preflight가 UA의 dialog margin:auto를 리셋하므로 m-auto로 중앙 정렬 복원
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border-0 bg-cream p-6 text-ink shadow-xl backdrop:bg-black/30 backdrop:backdrop-blur-[2px]"
    >
      <h2 id="cancel-dialog-title" className="font-display text-xl font-semibold text-forest">
        Cancel Application?
      </h2>
      <p className="mt-2 text-ink-soft">
        Are you sure you want to cancel this booking? This action cannot be undone.
      </p>
      <p className="mt-5 font-display text-sm font-semibold text-ink">Why are you cancelling?</p>
      <div className="mt-3 flex flex-col gap-3">
        {REASONS.map(({ value, label }) => {
          const isSelected = reason === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setReason(value)}
              className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3.5 text-left ${
                isSelected ? "border-forest" : "border-line-strong"
              }`}
            >
              <span
                aria-hidden
                className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                  isSelected ? "border-forest" : "border-line-strong"
                }`}
              >
                {isSelected && <span className="size-2 rounded-full bg-forest" />}
              </span>
              <span className="text-base text-ink">{label}</span>
            </button>
          );
        })}
        {/* OTHER 상세 사유 입력란은 백엔드 CancelApplicationRequest.cancellationDetail 타입 오류(boolean)가
            고쳐져 실제로 전송할 수 있게 되면 다시 추가한다. 입력을 받고 버리는 UI는 두지 않는다. */}
      </div>
      {errorMessage && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {errorMessage}
        </p>
      )}
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="h-12 flex-1 rounded-xl border border-line-strong bg-white font-display text-sm font-semibold text-ink disabled:opacity-60"
        >
          No, Keep It
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!reason || isSubmitting}
          className="h-12 flex-1 rounded-xl bg-forest font-display text-sm font-semibold text-cream disabled:opacity-60"
        >
          {isSubmitting ? "Cancelling..." : "Yes, Cancel"}
        </button>
      </div>
    </dialog>
  );
}
