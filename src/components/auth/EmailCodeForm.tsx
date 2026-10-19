"use client";
import type { EmailCodeFailure, EmailErrorKey } from "@/lib/auth/email";

import { useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { EmailAuthError, emailErrorKey, requestEmailAuth } from "@/lib/auth/email";
import { getEmailAuthLinks } from "@/lib/auth/email-navigation";
import { AuthInput, authButtonClass, useRemainingSeconds } from "./EmailAuthFields";

interface CodeFailure {
  key: "codeInvalid" | "codeUnavailable" | "codeAttemptsExceeded";
  details?: EmailCodeFailure;
}

function EmailCodeFeedback({
  id,
  remaining,
  failure,
  resendRequired,
}: Readonly<{
  id: string;
  remaining: number;
  failure: CodeFailure | null;
  resendRequired: boolean;
}>) {
  const t = useTranslations("EmailAuth");
  if (remaining === 0)
    return (
      <output id={id} className="text-sm text-danger">
        {t("codeExpired")}
      </output>
    );
  if (!failure) return null;
  const key = resendRequired && failure.key === "codeInvalid" ? "codeUnavailable" : failure.key;
  return (
    <p id={id} role="alert" className="text-sm text-danger">
      {t(key)}
      {failure.details?.failedAttempts != null && (
        <>
          {" "}
          {t("codeAttemptCount", {
            failedAttempts: failure.details.failedAttempts,
            maxAttempts: failure.details.maxAttempts,
          })}
        </>
      )}
    </p>
  );
}

function EmailCodeAction({
  duplicate,
  hasCode,
  pending,
  remaining,
  codeRemaining,
  resendRequired,
  loginHref,
}: Readonly<{
  duplicate: boolean;
  hasCode: boolean;
  pending: boolean;
  remaining: number;
  codeRemaining: number;
  resendRequired: boolean;
  loginHref: string;
}>) {
  const t = useTranslations("EmailAuth");
  if (duplicate)
    return (
      <Link href={loginHref} className={`${authButtonClass} flex items-center justify-center`}>
        {t("submitLogin")}
      </Link>
    );
  if (hasCode)
    return (
      <button
        type="submit"
        disabled={pending || codeRemaining === 0 || resendRequired}
        className={authButtonClass}
      >
        {t(pending ? "busy" : "verify")}
      </button>
    );
  let label = t("sendCode");
  if (remaining > 0) label = t("wait", { seconds: remaining });
  if (pending) label = t("busy");
  return (
    <button type="submit" className={authButtonClass} disabled={pending || remaining > 0}>
      {label}
    </button>
  );
}

export function EmailCodeForm({
  locale,
  buddy,
  returnTo,
}: Readonly<{
  locale: string;
  buddy: boolean;
  returnTo?: string | null;
}>) {
  const t = useTranslations("EmailAuth");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [deadline, setDeadline] = useState(0);
  const remaining = useRemainingSeconds(deadline);
  const [codeDeadline, setCodeDeadline] = useState(0);
  const codeRemaining = Math.min(600, useRemainingSeconds(codeDeadline));
  const timerId = useId();
  const feedbackId = useId();
  const codeTime = `${Math.floor(codeRemaining / 60)
    .toString()
    .padStart(2, "0")}:${(codeRemaining % 60).toString().padStart(2, "0")}`;
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState<EmailErrorKey | null>(null);
  const [codeFailure, setCodeFailure] = useState<CodeFailure | null>(null);
  const resendRequired = Boolean(
    codeFailure && (codeFailure.key !== "codeInvalid" || codeFailure.details?.resendRequired),
  );
  const loginHref = getEmailAuthLinks(locale, buddy, returnTo).login;
  const codeDescription = [timerId, (codeFailure || codeRemaining === 0) && feedbackId]
    .filter(Boolean)
    .join(" ");
  async function send() {
    if (busy.current || remaining > 0) return;
    busy.current = true;
    setPending(true);
    setError(null);
    // Even a timeout can mean the mail was delivered. Never automatically resend.
    const requestedAt = Date.now();
    setDeadline(requestedAt + 60_000);
    try {
      await requestEmailAuth("code", { email, purpose: "SIGNUP" });
      setSentEmail(email);
      setCode("");
      setCodeFailure(null);
      // The backend stores codes for 600 seconds. Start at request time conservatively.
      setCodeDeadline(requestedAt + 600_000);
    } catch (e) {
      const errorKey =
        e instanceof EmailAuthError ? emailErrorKey(e.code, e.status) : "unavailable";
      setError(errorKey);
      if (errorKey === "duplicate") {
        // A resend can find an account created since the first code; stop the stale verification flow.
        setSentEmail("");
        setCode("");
      }
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sentEmail) {
      await send();
      return;
    }
    if (busy.current || Date.now() >= codeDeadline || resendRequired) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await requestEmailAuth("code/verify", { email: sentEmail, purpose: "SIGNUP", code });
      const path = buddy ? "/ko/buddy/onboarding" : `/${locale}/onboarding`;
      window.location.assign(
        path + (!buddy && returnTo ? `?next=${encodeURIComponent(returnTo)}` : ""),
      );
    } catch (e) {
      const key = e instanceof EmailAuthError ? emailErrorKey(e.code, e.status) : "unavailable";
      if (key === "codeInvalid" || key === "codeUnavailable" || key === "codeAttemptsExceeded") {
        setCodeFailure({ key, details: e instanceof EmailAuthError ? e.codeFailure : undefined });
      } else setError(key);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <form className="grid gap-5" onSubmit={submit}>
      <div className={sentEmail ? "grid grid-cols-[minmax(0,1fr)_6.5rem] items-end gap-2" : ""}>
        <AuthInput
          label={t("email")}
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={255}
          value={email}
          disabled={pending}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
            setSentEmail("");
            setCode("");
            setCodeDeadline(0);
            setCodeFailure(null);
          }}
        />
        {sentEmail && (
          <button
            type="button"
            disabled={pending || remaining > 0}
            className="flex min-h-12 flex-col items-center justify-center rounded-xl border border-primary px-2 py-1 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50"
            onClick={send}
          >
            {t("resendShort")}
            {remaining > 0 && (
              <span className="text-xs font-normal tabular-nums">
                {t("retrySeconds", { seconds: remaining })}
              </span>
            )}
          </button>
        )}
      </div>
      {sentEmail && (
        <>
          <AuthInput
            label={t("code")}
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            minLength={6}
            maxLength={6}
            required
            disabled={pending || resendRequired || codeRemaining === 0}
            aria-invalid={Boolean(codeFailure) || codeRemaining === 0 || undefined}
            aria-describedby={codeDescription}
            endAdornment={
              <span id={timerId} role="timer" aria-label={t("codeTimeRemaining")}>
                {codeTime}
              </span>
            }
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <EmailCodeFeedback
            id={feedbackId}
            remaining={codeRemaining}
            failure={codeFailure}
            resendRequired={resendRequired}
          />
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {t(error)}
        </p>
      )}
      <EmailCodeAction
        duplicate={error === "duplicate"}
        hasCode={Boolean(sentEmail)}
        pending={pending}
        remaining={remaining}
        codeRemaining={codeRemaining}
        resendRequired={resendRequired}
        loginHref={loginHref}
      />
    </form>
  );
}
