"use client";
import { useTranslations } from "next-intl";
import { AuthInput, PasswordFields, useRemainingSeconds } from "./EmailAuthFields";
import type { EmailSignupSession } from "@/lib/auth/email";

export function EmailSignupFields({
  session,
  password,
  confirmation,
  onPassword,
  onConfirmation,
}: Readonly<{
  session: EmailSignupSession;
  password: string;
  confirmation: string;
  onPassword: (value: string) => void;
  onConfirmation: (value: string) => void;
}>) {
  const t = useTranslations("EmailAuth");
  const remaining = useRemainingSeconds(session.expiresAt);
  return (
    <div className="grid gap-4">
      <AuthInput
        label={t("email")}
        name="email"
        type="email"
        autoComplete="email"
        value={session.email}
        disabled
      />
      {remaining === 0 && <p className="text-sm text-danger">{t("expired")}</p>}
      <PasswordFields
        password={password}
        confirmation={confirmation}
        onPassword={onPassword}
        onConfirmation={onConfirmation}
      />
    </div>
  );
}
