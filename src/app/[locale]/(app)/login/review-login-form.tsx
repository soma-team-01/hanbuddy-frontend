"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/routing";
import type { ApiResponse, ErrorApiResponse, ReviewLoginRedirect } from "@/lib/auth/types";

type ReviewLoginErrorKey =
  "invalidCredentials" | "tooManyAttempts" | "unavailable" | "invalidRequest" | "serverUnavailable";

export function ReviewLoginForm({
  locale,
  returnTo,
}: Readonly<{ locale: Locale; returnTo?: string | null }>) {
  const t = useTranslations("Auth.reviewLogin");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errorKey, setErrorKey] = useState<ReviewLoginErrorKey | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const params = new URLSearchParams({ locale });
    if (returnTo) params.set("next", returnTo);

    setPending(true);
    setErrorKey(null);
    try {
      const response = await fetch(`/api/auth/review/login?${params.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json().catch(() => null)) as
        ApiResponse<ReviewLoginRedirect> | ErrorApiResponse | null;

      if (response.ok && payload?.isSuccess && isSafeRedirect(payload.result.redirectTo)) {
        router.replace(payload.result.redirectTo);
        router.refresh();
        return;
      }

      setErrorKey(mapErrorCode(payload?.code));
    } catch {
      setErrorKey("serverUnavailable");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-[520px] text-left" aria-labelledby="email-login-title">
      <h2 id="email-login-title" className="font-display text-lg font-bold text-ink">
        {t("title")}
      </h2>
      <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
        <label className="grid gap-1.5 text-sm font-semibold text-ink" htmlFor="review-login-email">
          {t("emailLabel")}
          <input
            id="review-login-email"
            name="email"
            type="email"
            autoComplete="username"
            maxLength={320}
            required
            className="focus-border-only h-12 rounded-xl border border-line-strong bg-white px-4 text-base font-normal text-ink outline-none placeholder:text-muted/60 focus:border-primary"
            placeholder={t("emailPlaceholder")}
          />
        </label>
        <label
          className="grid gap-1.5 text-sm font-semibold text-ink"
          htmlFor="review-login-password"
        >
          {t("passwordLabel")}
          <input
            id="review-login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            maxLength={100}
            required
            className="focus-border-only h-12 rounded-xl border border-line-strong bg-white px-4 text-base font-normal text-ink outline-none placeholder:text-muted/60 focus:border-primary"
            placeholder={t("passwordPlaceholder")}
          />
        </label>
        {errorKey ? (
          <p
            role="alert"
            aria-live="polite"
            className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            {t(`errors.${errorKey}`)}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="motion-press flex h-12 w-full items-center justify-center rounded-full bg-primary px-6 font-display text-sm font-bold text-on-primary transition-colors enabled:hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? t("submitting") : t("submit")}
        </button>
      </form>
    </section>
  );
}

function mapErrorCode(code?: string): ReviewLoginErrorKey {
  if (code === "AUTH401_REVIEW_LOGIN") return "invalidCredentials";
  if (code === "AUTH429_REVIEW_LOGIN") return "tooManyAttempts";
  if (code === "AUTH404_REVIEW_LOGIN") return "unavailable";
  if (code === "AUTH400_REVIEW_LOGIN") return "invalidRequest";
  return "serverUnavailable";
}

function isSafeRedirect(value: string) {
  return value.startsWith("/") && !value.startsWith("//") && !value.includes("\\");
}
