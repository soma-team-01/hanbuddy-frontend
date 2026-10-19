"use client";
import { useEffect } from "react";
import { useLocale } from "next-intl";

/** Invalidate live caches and sockets in other tabs after a successful password change. */
export function AuthSessionResetListener({
  mayHaveSession,
}: Readonly<{ mayHaveSession: boolean }>) {
  const locale = useLocale();
  useEffect(() => {
    if (!mayHaveSession || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("hanbuddy-auth");
    channel.onmessage = (event) => {
      if (event.data === "password-reset") window.location.replace(`/${locale}/login`);
    };
    return () => channel.close();
  }, [locale, mayHaveSession]);
  return null;
}
