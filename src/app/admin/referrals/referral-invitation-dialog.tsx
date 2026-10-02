"use client";
import { useId, useRef, useState } from "react";
import { useModalDialog } from "@/components/ui/use-modal-dialog";
import { XIcon } from "@/components/ui/icons";
import { ReferralInvitations } from "./referral-invitations";

export function ReferralInvitationDialog({ onClose }: { onClose: () => void }) {
  const { dialogRef, closeRef } = useModalDialog();
  const titleId = useId();
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const close = () => {
    if (!busyRef.current) onClose();
  };
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      className="motion-dialog m-0 h-dvh max-h-none w-screen max-w-none items-end justify-center overflow-hidden border-0 bg-transparent p-0 text-ink backdrop:bg-ink/45 open:flex md:items-center md:p-6"
    >
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={close}
        className="absolute inset-0 cursor-default"
      />
      <div className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl md:max-w-2xl md:rounded-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line-soft px-5 py-4 md:px-6">
          <h2 id={titleId} className="text-lg font-bold">
            등록 링크 관리
          </h2>
          <button
            ref={closeRef}
            type="button"
            aria-label="등록 링크 닫기"
            aria-disabled={busy}
            onClick={close}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:text-primary aria-disabled:opacity-40"
          >
            <XIcon className="size-5" />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-6">
          <ReferralInvitations
            onNavigate={close}
            onPendingChange={(value) => {
              busyRef.current = value;
              setBusy(value);
            }}
          />
        </div>
      </div>
    </dialog>
  );
}
