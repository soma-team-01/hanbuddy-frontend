"use client";

import { useEffect, useRef, useState } from "react";

const REASONS = [
  "Schedule conflict",
  "Illness or unexpected emergency",
  "Found another option",
  "Other reason",
] as const;

export function CancelDialog({ onClose }: Readonly<{ onClose: () => void }>) {
  const [reason, setReason] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="cancel-dialog-title"
      onCancel={onClose}
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
        {REASONS.map((option) => {
          const isSelected = reason === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setReason(option)}
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
              <span className="text-base text-ink">{option}</span>
            </button>
          );
        })}
        {reason === "Other reason" && (
          <textarea
            rows={3}
            placeholder="Please specify (optional)"
            className="w-full resize-none rounded-xl border border-line-strong bg-white px-4 py-3.5 text-base text-ink placeholder:text-ink-soft/60"
          />
        )}
      </div>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="h-12 flex-1 rounded-xl border border-line-strong bg-white font-display text-sm font-semibold text-ink"
        >
          No, Keep It
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-12 flex-1 rounded-xl bg-forest font-display text-sm font-semibold text-cream"
        >
          Yes, Cancel
        </button>
      </div>
    </dialog>
  );
}
