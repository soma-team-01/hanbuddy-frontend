"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Avatar } from "@/components/ui/Avatar";
import { ChevronDownIcon, GlobeIcon, LogOutIcon, UserIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import type { UserType } from "@/lib/auth/types";
import { useLogout } from "@/lib/auth/useLogout";
import type { MyProfile } from "@/types/user";
import { LocaleDialog } from "./LocaleDialog";

export function HeaderAccountMenu({
  accountTitle,
  compact = false,
  profile,
  userType,
}: Readonly<{
  accountTitle: string;
  compact?: boolean;
  profile: MyProfile | null;
  userType: UserType;
}>) {
  const t = useTranslations("Navigation");
  const tMyPage = useTranslations("MyPage");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { isLoggingOut, logout } = useLogout(userType);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <>
      <div ref={rootRef} className="relative inline-flex">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label={t("openAccountMenu")}
          title={accountTitle}
          onClick={() => setIsOpen((open) => !open)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full text-ink transition-colors hover:text-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span
            className={`inline-flex items-center justify-center rounded-full border border-line-strong bg-canvas-soft transition-colors hover:border-primary ${
              compact ? "size-10" : "size-11"
            }`}
          >
            {profile ? (
              <Avatar
                name={accountTitle}
                src={profile.profileImageUrl}
                size={compact ? 32 : 36}
                eagerImage
              />
            ) : (
              <UserIcon className="size-5 text-primary-strong" />
            )}
          </span>
          <ChevronDownIcon
            aria-hidden
            className={`size-3.5 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isOpen ? (
          <div
            role="menu"
            aria-label={t("accountMenu")}
            className="absolute top-[calc(100%+8px)] right-0 z-50 w-52 overflow-hidden rounded-xl border border-line-soft bg-white p-1.5 shadow-[0_14px_36px_rgba(38,27,24,0.14)]"
          >
            <Link
              href="/my-page/profile"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-primary-soft/60 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <UserIcon className="size-4 text-muted" />
              {t("viewProfile")}
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                setShowLanguageDialog(true);
              }}
              className="flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] font-semibold text-ink transition-colors hover:bg-primary-soft/60 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <GlobeIcon className="size-4 text-muted" />
              {t("language")}
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={isLoggingOut}
              onClick={() => {
                setIsOpen(false);
                setShowLogoutConfirm(true);
              }}
              className="flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] font-semibold text-danger transition-colors enabled:hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOutIcon className="size-4" />
              {isLoggingOut ? tMyPage("loggingOut") : tMyPage("logOut")}
            </button>
          </div>
        ) : null}
      </div>

      {showLanguageDialog ? (
        <LocaleDialog
          onClose={() => {
            setShowLanguageDialog(false);
            triggerRef.current?.focus();
          }}
        />
      ) : null}

      {showLogoutConfirm ? (
        <ConfirmDialog
          title={tMyPage("logoutTitle")}
          description={tMyPage("logoutDescription")}
          confirmLabel={tMyPage("logOut")}
          pendingLabel={tMyPage("loggingOut")}
          isPending={isLoggingOut}
          onConfirm={() => void logout()}
          onClose={() => setShowLogoutConfirm(false)}
        />
      ) : null}
    </>
  );
}
