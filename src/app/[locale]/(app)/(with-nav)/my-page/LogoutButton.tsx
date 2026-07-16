"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LogOutIcon } from "@/components/ui/icons";
import { useRouter } from "@/i18n/navigation";

export function LogoutButton() {
  const t = useTranslations("MyPage");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {
      // Logout is best-effort; still return the user to the signed-out screen.
    } finally {
      queryClient.clear();
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={isLoggingOut}
        className="mx-auto mt-6 flex cursor-pointer items-center gap-2 text-base font-medium text-danger enabled:hover:underline disabled:cursor-not-allowed disabled:opacity-60"
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
          onConfirm={() => void handleLogout()}
          onClose={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
