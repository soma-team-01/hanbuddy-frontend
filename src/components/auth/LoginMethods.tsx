"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { GoogleIcon } from "@/components/ui/icons";
import { EmailLoginForm } from "./EmailLoginForm";

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
  const t = useTranslations("Auth");
  const emailT = useTranslations("EmailAuth");
  return (
    <div className="w-full">
      <EmailLoginForm locale={locale} returnTo={returnTo} buddy={buddy} />
      <div className="my-4 flex items-center gap-4 text-xs text-muted">
        <span aria-hidden="true" className="h-px flex-1 bg-line-soft" />
        <span>{emailT("socialDivider")}</span>
        <span aria-hidden="true" className="h-px flex-1 bg-line-soft" />
      </div>
      <Link
        href={googleHref}
        prefetch={false}
        aria-label={t("continueWithGoogle")}
        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-line-strong bg-white px-4 py-3 text-sm font-semibold text-ink transition-colors hover:border-muted hover:bg-panel-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
      >
        <GoogleIcon aria-hidden className="size-5 shrink-0" />
        <span>Google</span>
      </Link>
    </div>
  );
}
