"use client";
import type { EmailErrorKey } from "@/lib/auth/email";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  EmailAuthError,
  emailErrorKey,
  isValidNewPassword,
  isPasswordResetValidation,
  requestEmailAuth,
} from "@/lib/auth/email";
import { PasswordFields, authButtonClass, authLinkClass } from "./EmailAuthFields";
import { AuthPanel } from "./AuthPanel";

export function ResetPasswordForm() {
  const locale = useLocale();
  const t = useTranslations("EmailAuth");
  const token = useRef<string | null>(null);
  const initialized = useRef(false);
  const busy = useRef(false);
  const validation = useRef<{ promise: Promise<unknown>; startedAt: number } | null>(null);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [stage, setStage] = useState<
    "loading" | "validationError" | "ready" | "missing" | "expired" | "uncertain" | "success"
  >("loading");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<EmailErrorKey | null>(null);
  const invalidLink = stage === "missing" || stage === "expired";
  const title = invalidLink
    ? "resetLinkUnavailableTitle"
    : stage === "success"
      ? "successTitle"
      : stage === "loading" || stage === "validationError"
        ? "checkingResetLinkTitle"
        : "newPassword";
  const expire = useCallback(() => {
    token.current = null;
    setPassword("");
    setConfirmation("");
    setStage("expired");
  }, []);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      token.current = new URLSearchParams(window.location.hash.slice(1)).get("token");
      // The isolated root never loads analytics, including before this effect runs.
      history.replaceState(history.state, "", window.location.pathname);
    }
    let active = true;
    if (!token.current) {
      queueMicrotask(() => {
        if (active) setStage("missing");
      });
    } else {
      // Reuse the same non-consuming check across Strict Mode effect replays.
      validation.current ??= {
        startedAt: Date.now(),
        promise: requestEmailAuth("password/reset/validate", undefined, { token: token.current }),
      };
      const { promise, startedAt } = validation.current;
      void promise
        .then((result) => {
          if (!active) return;
          if (!isPasswordResetValidation(result))
            throw new Error("Invalid reset validation response");
          // Use request start time so network latency never extends the server's remaining lifetime.
          const deadline = startedAt + result.expiresInSeconds * 1000;
          if (deadline <= Date.now()) {
            expire();
            return;
          }
          setExpiresAt(deadline);
          setStage("ready");
        })
        .catch((error: unknown) => {
          if (!active) return;
          if (error instanceof EmailAuthError && error.status === 401) expire();
          else setStage("validationError");
        });
    }
    return () => {
      active = false;
    };
  }, [validationAttempt, expire]);
  useEffect(() => {
    if (stage !== "ready" || expiresAt === null || pending) return;
    const timer = setTimeout(expire, Math.max(0, expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [stage, expiresAt, expire, pending]);
  function retryValidation() {
    validation.current = null;
    setStage("loading");
    setValidationAttempt((attempt) => attempt + 1);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !token.current || stage !== "ready") return;
    if (expiresAt === null || Date.now() >= expiresAt) {
      expire();
      return;
    }
    if (!isValidNewPassword(password)) {
      setError("passwordInvalid");
      return;
    }
    if (password !== confirmation) {
      setError("mismatch");
      return;
    }
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await requestEmailAuth("password/reset", { password }, { token: token.current });
      token.current = null;
      setPassword("");
      setConfirmation("");
      setStage("success");
      // No authenticated providers or socket are mounted in this isolated document.
      // Notify other open HanBuddy tabs so their authenticated caches/connections are dropped too.
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("hanbuddy-auth");
        channel.postMessage("password-reset");
        channel.close();
      }
    } catch (e) {
      if (e instanceof EmailAuthError && e.status < 500 && e.status !== 401)
        setError(emailErrorKey(e.code, e.status));
      else {
        token.current = null;
        setPassword("");
        setConfirmation("");
        setStage(e instanceof EmailAuthError && e.status === 401 ? "expired" : "uncertain");
      }
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <AuthPanel title={t(title)}>
      <div className="grid gap-5">
        {stage === "loading" && (
          <p role="status" className="text-center text-sm text-muted">
            {t("checkingResetLink")}
          </p>
        )}
        {stage === "ready" && (
          <form onSubmit={submit} className="grid gap-5">
            <PasswordFields
              password={password}
              confirmation={confirmation}
              onPassword={(value) => {
                setPassword(value);
                if (error === "passwordInvalid" || error === "mismatch") setError(null);
              }}
              onConfirmation={(value) => {
                setConfirmation(value);
                if (error === "mismatch") setError(null);
              }}
            />
            {error && (
              <p role="alert" className="text-sm text-danger">
                {t(error)}
              </p>
            )}
            <button disabled={pending} className={authButtonClass}>
              {t(pending ? "busy" : "savePassword")}
            </button>
          </form>
        )}
        {stage !== "ready" && stage !== "loading" && (
          <p
            role="status"
            className={`text-sm leading-6 text-muted ${stage === "success" || invalidLink ? "text-center" : ""}`}
          >
            {t(stage)}
          </p>
        )}
        {stage !== "ready" && stage !== "loading" && (
          <>
            {stage === "validationError" && (
              <button type="button" className={authButtonClass} onClick={retryValidation}>
                {t("retryResetLink")}
              </button>
            )}
            {stage !== "success" && stage !== "validationError" && (
              <a
                className={
                  invalidLink
                    ? `${authButtonClass} flex items-center justify-center`
                    : authLinkClass
                }
                href={`/${locale}/forgot-password`}
              >
                {t("requestAgain")}
              </a>
            )}
            <a
              className={
                stage === "success"
                  ? `${authButtonClass} flex items-center justify-center`
                  : "py-2 text-center text-sm font-semibold text-primary hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
              }
              href={`/${locale}/login`}
            >
              {t("back")}
            </a>
          </>
        )}
      </div>
    </AuthPanel>
  );
}
