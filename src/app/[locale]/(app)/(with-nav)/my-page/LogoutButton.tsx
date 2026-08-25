"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LogOutIcon } from "@/components/ui/icons";
import type { UserType } from "@/lib/auth/types";
import { useLogout } from "@/lib/auth/useLogout";

interface LogoutButtonProps {
  userType: UserType;
}

export function LogoutButton({ userType }: Readonly<LogoutButtonProps>) {
  const t = useTranslations("MyPage");
  const [showConfirm, setShowConfirm] = useState(false);
  const { isLoggingOut, logout } = useLogout(userType);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={isLoggingOut}
        className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-base font-semibold text-danger enabled:hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogOutIcon className="size-4" />
        {isLoggingOut ? t("loggingOut") : t("logOut")}
      </button>
      {showConfirm && (
        <ConfirmDialog
          title={t("logoutTitle")}
          description={t("logoutDescription")}
          confirmLabel={t("logOut")}
          pendingLabel={t("loggingOut")}
          isPending={isLoggingOut}
          onConfirm={() => void logout()}
          onClose={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
