"use client";
import type { EmailErrorKey } from "@/lib/auth/email";

import { useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { invalidateAnalyticsAccount } from "@/lib/analytics/cookie-runtime";
import { EmailAuthError, emailErrorKey, requestEmailAuth } from "@/lib/auth/email";
import { AuthInput, authButtonClass, authLinkClass } from "./EmailAuthFields";

export function EmailLoginForm({ locale, returnTo }: { locale: string; returnTo?: string | null }) {
  const t = useTranslations("EmailAuth");
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState<EmailErrorKey | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const data = new FormData(event.currentTarget);
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const query = new URLSearchParams({ locale });
      if (returnTo) query.set("next", returnTo);
      await invalidateAnalyticsAccount();
      const result = await requestEmailAuth<{ redirectTo: string }>(
        "login",
        { email: data.get("email"), password: data.get("password") },
        { query: query.toString() },
      );
      // A document navigation also clears the previous account's query cache and chat connection.
      if (
        !result.redirectTo.startsWith("/") ||
        result.redirectTo.startsWith("//") ||
        result.redirectTo.includes("\\")
      )
        throw new Error("Invalid destination");
      window.location.assign(result.redirectTo);
    } catch (e) {
      setError(e instanceof EmailAuthError ? emailErrorKey(e.code, e.status) : "unavailable");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  const signupQuery = returnTo ? `?next=${encodeURIComponent(returnTo)}` : "";
  return (
    <section className="w-full text-left" aria-label={t("login")}>
      <form onSubmit={submit} className="grid gap-4">
        <AuthInput
          label={t("email")}
          name="email"
          type="email"
          autoComplete="username"
          maxLength={255}
          required
        />
        <AuthInput
          label={t("password")}
          name="password"
          type="password"
          autoComplete="current-password"
          maxLength={64}
          required
        />
        <Link
          className={`${authLinkClass} -mt-1 justify-self-end`}
          href={`/${locale}/forgot-password`}
        >
          {t("forgot")}
        </Link>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {t(error)}
          </p>
        )}
        <button disabled={pending} className={authButtonClass}>
          {t(pending ? "busy" : "login")}
        </button>
      </form>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm">
        <span className="text-muted">{t("newHere")}</span>
        <Link className={authLinkClass} href={`/${locale}/signup${signupQuery}`}>
          {t("signup")}
        </Link>
      </div>
    </section>
  );
}
