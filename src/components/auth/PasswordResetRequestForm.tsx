"use client";
import type { EmailErrorKey } from "@/lib/auth/email";

import { useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { EmailAuthError, emailErrorKey, requestEmailAuth } from "@/lib/auth/email";
import { AuthInput, authButtonClass, useRemainingSeconds } from "./EmailAuthFields";

export function PasswordResetRequestForm() {
  const t = useTranslations("EmailAuth");
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<EmailErrorKey | null>(null);
  const [deadline, setDeadline] = useState(0);
  const remaining = useRemainingSeconds(deadline);
  let submitLabel = t("requestLink");
  if (remaining > 0) submitLabel = t("wait", { seconds: remaining });
  if (pending) submitLabel = t("busy");
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
        <output className="grid gap-1 text-sm leading-6 text-muted">
          <span>{t("receipt")}</span>
          <span>{t("inbox")}</span>
        </output>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {t(error)}
        </p>
      )}
      {error !== "googleLoginRequired" && (
        <button type="submit" disabled={pending || remaining > 0} className={authButtonClass}>
          {submitLabel}
        </button>
      )}
    </form>
  );
}
