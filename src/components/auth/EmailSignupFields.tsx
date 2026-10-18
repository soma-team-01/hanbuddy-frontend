"use client";
import { useTranslations } from "next-intl";
import { AuthInput, PasswordFields, useRemainingSeconds } from "./EmailAuthFields";
import type { EmailSignupSession } from "@/lib/auth/email";

export function EmailSignupFields({
  session,
  name,
  password,
  confirmation,
  onName,
  onPassword,
  onConfirmation,
}: {
  session: EmailSignupSession;
  name: string;
  password: string;
  confirmation: string;
  onName: (value: string) => void;
  onPassword: (value: string) => void;
  onConfirmation: (value: string) => void;
}) {
  const t = useTranslations("EmailAuth");
  const remaining = useRemainingSeconds(session.expiresAt);
  return (
    <div className="mb-6 grid gap-4 border-b border-line-soft pb-6">
      <p className="text-sm break-all text-muted">{t("verified", { email: session.email })}</p>
      <p className="text-sm text-muted">
        {remaining ? t("remaining", { seconds: remaining }) : t("expired")}
      </p>
      <AuthInput
        label={t("name")}
        name="name"
        autoComplete="name"
        required
        maxLength={100}
        value={name}
        onChange={(e) => onName(e.target.value)}
      />
      <PasswordFields
        password={password}
        confirmation={confirmation}
        onPassword={onPassword}
        onConfirmation={onConfirmation}
      />
    </div>
  );
}
