"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { GoogleIcon } from "@/components/ui/icons";

export function GoogleLoginButton({ href }: Readonly<{ href: string }>) {
  const t = useTranslations("Auth");
  return (
    <Link
      href={href}
      prefetch={false}
      aria-label={t("continueWithGoogle")}
      className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-line-strong bg-white px-4 py-3 text-sm font-semibold text-ink transition-colors hover:border-muted hover:bg-panel-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
    >
      <GoogleIcon aria-hidden className="size-5 shrink-0" />
      <span>Google</span>
    </Link>
  );
}
