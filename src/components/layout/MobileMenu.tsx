"use client";

import { useEffect, useRef, useState } from "react";
import { MenuIcon, XIcon } from "@/components/ui/icons";

interface MobileMenuProps {
  title: string;
  openLabel: string;
  closeLabel: string;
  children: React.ReactNode;
}

export function MobileMenu({ title, openLabel, closeLabel, children }: Readonly<MobileMenuProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousOverflow = useRef("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      previousOverflow.current = document.body.style.overflow;
      if (!dialog.open) dialog.showModal();
      document.body.style.overflow = "hidden";
      closeRef.current?.focus();
      return;
    }

    if (dialog.open) dialog.close();
    document.body.style.overflow = previousOverflow.current;
  }, [isOpen]);

  useEffect(
    () => () => {
      document.body.style.overflow = previousOverflow.current;
    },
    [],
  );

  function closeMenu() {
    setIsOpen(false);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={openLabel}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
        className="flex size-11 cursor-pointer items-center justify-center rounded-full text-ink transition-colors hover:bg-primary-soft lg:hidden"
      >
        <MenuIcon className="size-6" />
      </button>
      <dialog
        ref={dialogRef}
        aria-label={title}
        onCancel={(event) => {
          event.preventDefault();
          closeMenu();
        }}
        onClose={() => {
          setIsOpen(false);
          document.body.style.overflow = previousOverflow.current;
          triggerRef.current?.focus();
        }}
        onClick={(event) => {
          const target = event.target as Element;
          if (event.target === event.currentTarget || target.closest("a,[data-menu-dismiss]")) {
            closeMenu();
          }
        }}
        className="fixed inset-y-0 right-0 left-auto m-0 h-dvh w-[min(88vw,360px)] max-w-none translate-x-0 overflow-y-auto border-l border-line-soft bg-panel p-0 text-ink shadow-2xl backdrop:bg-ink/45 open:flex open:flex-col lg:hidden"
      >
        <div className="flex min-h-18 items-center justify-between border-b border-line-soft px-5">
          <span className="font-display text-lg font-bold">{title}</span>
          <button
            ref={closeRef}
            type="button"
            aria-label={closeLabel}
            onClick={closeMenu}
            className="flex size-11 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-primary-soft"
          >
            <XIcon className="size-6" />
          </button>
        </div>
        <div className="flex flex-1 flex-col p-5">{children}</div>
      </dialog>
    </>
  );
}
