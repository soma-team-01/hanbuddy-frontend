"use client";

import { useTranslations } from "next-intl";
import { EmailLoginForm } from "./EmailLoginForm";
import { GoogleLoginButton } from "./GoogleLoginButton";

/** Shared ordering for the login page, booking prompt and buddy entry. */
export function LoginMethods({
  locale,
  returnTo,
  googleHref,
  buddy = false,
}: Readonly<{
  locale: string;
  returnTo?: string | null;
  googleHref: string;
  buddy?: boolean;
}>) {
  const emailT = useTranslations("EmailAuth");
  return (
    <div className="w-full">
      <EmailLoginForm locale={locale} returnTo={returnTo} buddy={buddy} />
      <div className="my-4 flex items-center gap-4 text-xs text-muted">
        <span aria-hidden="true" className="h-px flex-1 bg-line-soft" />
        <span>{emailT("socialDivider")}</span>
        <span aria-hidden="true" className="h-px flex-1 bg-line-soft" />
      </div>
      <GoogleLoginButton href={googleHref} />
    </div>
  );
}
