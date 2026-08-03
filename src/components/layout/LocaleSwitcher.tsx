"use client";

import { useLocale, useTranslations } from "next-intl";
import { GlobeIcon } from "@/components/ui/icons";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LocaleSwitcher({
  className,
  dismissMenu = false,
}: Readonly<{ className?: string; dismissMenu?: boolean }>) {
  const locale = useLocale();
  const t = useTranslations("Navigation");
  const pathname = usePathname();
  const router = useRouter();
  const nextLocale = locale === "ko" ? "en" : "ko";
  const label = locale === "ko" ? t("changeLanguageToEnglish") : t("changeLanguageToKorean");

  return (
    <button
      type="button"
      aria-label={label}
      data-menu-dismiss={dismissMenu || undefined}
      onClick={() => router.replace(pathname, { locale: nextLocale })}
      className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-3 text-sm font-semibold text-ink transition-colors hover:bg-primary-soft ${className ?? ""}`}
    >
      <GlobeIcon className="size-4" />
      <span aria-hidden>{locale.toUpperCase()}</span>
      <span aria-hidden className="text-muted">
        {nextLocale.toUpperCase()}
      </span>
    </button>
  );
}
