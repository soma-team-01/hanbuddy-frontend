"use client";
import type { EmailErrorKey } from "@/lib/auth/email";

import { useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { invalidateAnalyticsAccount } from "@/lib/analytics/cookie-runtime";
import { EmailAuthError, emailErrorKey, requestEmailAuth } from "@/lib/auth/email";
import { AuthInput, PasswordInput, authButtonClass } from "./EmailAuthFields";

export function EmailLoginForm({
  locale,
  returnTo,
  buddy = false,
}: {
  locale: string;
  returnTo?: string | null;
  buddy?: boolean;
}) {
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
  const utilityClass =
    "inline-flex min-h-11 items-center text-xs font-normal text-muted underline-offset-4 hover:text-ink hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong";
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
        <PasswordInput
          label={t("password")}
          name="password"
          autoComplete="current-password"
          maxLength={64}
          required
        />
        {error && (
          <p role="alert" className="text-sm text-danger">
            {t(error)}
          </p>
        )}
        <button disabled={pending} className={authButtonClass}>
          {t(pending ? "busy" : "submitLogin")}
        </button>
      </form>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3">
        <Link
          className={utilityClass}
          href={buddy ? "/ko/signup?intent=buddy" : `/${locale}/signup${signupQuery}`}
        >
          {t("signupLink")}
        </Link>
        <span aria-hidden="true" className="h-3 w-px bg-line-strong" />
        <Link className={utilityClass} href={`/${locale}/forgot-password`}>
          {t("forgotLink")}
        </Link>
      </div>
    </section>
  );
}
