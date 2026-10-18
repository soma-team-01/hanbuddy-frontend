"use client";
import type { EmailErrorKey } from "@/lib/auth/email";

import { useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { EmailAuthError, emailErrorKey, requestEmailAuth } from "@/lib/auth/email";
import { AuthInput, authButtonClass, authLinkClass, useRemainingSeconds } from "./EmailAuthFields";

export function EmailCodeForm({
  locale,
  buddy,
  returnTo,
}: {
  locale: string;
  buddy: boolean;
  returnTo?: string | null;
}) {
  const t = useTranslations("EmailAuth");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [deadline, setDeadline] = useState(0);
  const remaining = useRemainingSeconds(deadline);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState<EmailErrorKey | null>(null);
  async function send() {
    if (busy.current || remaining > 0) return;
    busy.current = true;
    setPending(true);
    setError(null);
    // Even a timeout can mean the mail was delivered. Never automatically resend.
    setDeadline(Date.now() + 60_000);
    try {
      await requestEmailAuth("code", { email, purpose: "SIGNUP" });
      setSentEmail(email);
      setCode("");
    } catch (e) {
      setError(e instanceof EmailAuthError ? emailErrorKey(e.code, e.status) : "unavailable");
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
    if (busy.current) return;
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
      setError(e instanceof EmailAuthError ? emailErrorKey(e.code, e.status) : "unavailable");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <form className="grid gap-5" onSubmit={submit}>
      <AuthInput
        label={t("email")}
        name="email"
        type="email"
        autoComplete="email"
        required
        maxLength={255}
        value={email}
        disabled={pending || Boolean(sentEmail)}
        onChange={(e) => setEmail(e.target.value)}
      />
      {sentEmail && (
        <>
          <button
            type="button"
            className={`${authLinkClass} justify-self-start`}
            disabled={pending}
            onClick={() => {
              setSentEmail("");
              setCode("");
              setError(null);
            }}
          >
            {t("editEmail")}
          </button>
          <p role="status" className="text-sm leading-6 text-muted">
            {t("codeSent")}
          </p>
          <AuthInput
            label={t("code")}
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            minLength={6}
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button
            type="button"
            disabled={pending || remaining > 0}
            className={authLinkClass}
            onClick={send}
          >
            {remaining > 0 ? t("wait", { seconds: remaining }) : t("resend")}
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {t(error)}
        </p>
      )}
      <button className={authButtonClass} disabled={pending || (!sentEmail && remaining > 0)}>
        {pending
          ? t("busy")
          : sentEmail
            ? t("verify")
            : remaining > 0
              ? t("wait", { seconds: remaining })
              : t("sendCode")}
      </button>
    </form>
  );
}
