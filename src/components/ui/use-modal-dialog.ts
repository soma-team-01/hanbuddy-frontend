"use client";

import { useEffect, useRef } from "react";

/** Opens a mounted native modal and restores its opener and body scrolling on unmount. */
export function useModalDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const dialog = dialogRef.current;
    document.body.style.overflow = "hidden";
    if (dialog && !dialog.open) dialog.showModal();
    closeRef.current?.focus();
    return () => {
      // Strict Mode replays effects while the dialog is still mounted. Closing it
      // there emits a real close event and dismisses the parent's newly opened modal.
      // Only close on actual DOM removal; a replay keeps the same native modal open.
      if (dialog && !dialog.isConnected) dialog.close();
      document.body.style.overflow = previousOverflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  return { dialogRef, closeRef };
}
