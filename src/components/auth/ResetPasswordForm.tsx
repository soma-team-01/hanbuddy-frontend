"use client";
import type { EmailErrorKey } from "@/lib/auth/email";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import {
  EmailAuthError,
  emailErrorKey,
  isValidNewPassword,
  requestEmailAuth,
} from "@/lib/auth/email";
import { PasswordFields, authButtonClass, authLinkClass } from "./EmailAuthFields";

export function ResetPasswordForm({ locale }: { locale: string }) {
  const t = useTranslations("EmailAuth");
  const token = useRef<string | null>(null);
  const initialized = useRef(false);
  const busy = useRef(false);
  const [stage, setStage] = useState<
    "loading" | "ready" | "missing" | "expired" | "uncertain" | "success"
  >("loading");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<EmailErrorKey | null>(null);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      token.current = new URLSearchParams(window.location.hash.slice(1)).get("token");
      // The isolated root never loads analytics, including before this effect runs.
      history.replaceState(history.state, "", window.location.pathname);
    }
    const ready = Boolean(token.current);
    queueMicrotask(() => setStage(ready ? "ready" : "missing"));
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !token.current) return;
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
    <div className="grid gap-5">
      {stage === "loading" && <p role="status">{t("busy")}</p>}
      {stage === "ready" && (
        <form onSubmit={submit} className="grid gap-5">
          <PasswordFields
            password={password}
            confirmation={confirmation}
            onPassword={setPassword}
            onConfirmation={setConfirmation}
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
        <p role="status" className="text-sm leading-6 text-muted">
          {t(stage)}
        </p>
      )}
      {stage !== "success" && (
        <a className={authLinkClass} href={`/${locale}/forgot-password`}>
          {t("requestAgain")}
        </a>
      )}
      <a className={authLinkClass} href={`/${locale}/login`}>
        {t("back")}
      </a>
    </div>
  );
}
