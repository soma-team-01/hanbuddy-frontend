"use client";
import type { EmailErrorKey } from "@/lib/auth/email";

import { useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { EmailAuthError, emailErrorKey, requestEmailAuth } from "@/lib/auth/email";
import { AuthInput, authButtonClass, useRemainingSeconds } from "./EmailAuthFields";
import { GoogleLoginButton } from "./GoogleLoginButton";

export function PasswordResetRequestForm() {
  const t = useTranslations("EmailAuth");
  const locale = useLocale();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<EmailErrorKey | null>(null);
  const [deadline, setDeadline] = useState(0);
  const remaining = useRemainingSeconds(deadline);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || remaining > 0) return;
    const email = new FormData(event.currentTarget).get("email");
    busy.current = true;
    setPending(true);
    setError(null);
    setAccepted(false);
    setDeadline(Date.now() + 60_000);
    try {
      await requestEmailAuth("password/reset-link", { email });
      setAccepted(true);
    } catch (e) {
      setError(e instanceof EmailAuthError ? emailErrorKey(e.code, e.status) : "unavailable");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="grid gap-5">
      <AuthInput
        label={t("email")}
        type="email"
        name="email"
        autoComplete="email"
        maxLength={255}
        required
        disabled={pending}
        onChange={() => {
          setError(null);
          setAccepted(false);
        }}
      />
      {accepted && (
        <div role="status" className="rounded-xl bg-primary-soft p-4 text-sm leading-6">
          <p>{t("receipt")}</p>
          <p className="mt-3 text-muted">{t("inbox")}</p>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {t(error)}
        </p>
      )}
      {error === "googleLoginRequired" ? (
        <GoogleLoginButton href={`/api/auth/google/start?locale=${encodeURIComponent(locale)}`} />
      ) : (
        <button disabled={pending || remaining > 0} className={authButtonClass}>
          {pending
            ? t("busy")
            : remaining > 0
              ? t("wait", { seconds: remaining })
              : t("requestLink")}
        </button>
      )}
    </form>
  );
}
