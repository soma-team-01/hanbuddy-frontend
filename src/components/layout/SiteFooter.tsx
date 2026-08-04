import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { InstagramIcon, MailIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

interface SiteFooterProps {
  readonly locale: Locale;
  readonly showSocial?: boolean;
  readonly showHelpCenter?: boolean;
  readonly email?: string;
  readonly emailLabel?: string;
  readonly instagramUrl?: string;
  readonly instagramLabel?: string;
}

export async function SiteFooter({
  locale,
  showSocial = false,
  showHelpCenter = true,
  email,
  emailLabel,
  instagramUrl,
  instagramLabel,
}: SiteFooterProps) {
  const t = await getTranslations({ locale, namespace: "Auth" });

  return (
    <footer className="border-t border-line-soft bg-canvas-soft py-6 text-sm text-muted">
      <PageContainer className="flex flex-col items-center gap-4 text-center">
        <div className="flex w-full flex-col items-center justify-between gap-4 sm:flex-row">
          <Link href="/" aria-label="HanBuddy" className="flex items-center gap-2">
            <Image
              src="/images/brand/logo-borderless.webp"
              alt=""
              width={28}
              height={28}
              className="size-7"
            />
            <span className="font-display font-bold text-ink">HanBuddy</span>
          </Link>

          {showSocial && email && instagramUrl && emailLabel && instagramLabel ? (
            <div className="flex items-center gap-2">
              <a
                href={`mailto:${email}`}
                aria-label={emailLabel}
                className="flex size-11 items-center justify-center rounded-full border border-line-soft text-muted transition-colors hover:border-primary hover:text-primary"
              >
                <MailIcon className="size-5" />
              </a>
              <a
                href={instagramUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={instagramLabel}
                className="flex size-11 items-center justify-center rounded-full border border-line-soft text-muted transition-colors hover:border-primary hover:text-primary"
              >
                <InstagramIcon className="size-5" />
              </a>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted">
          <span className="underline">{t("privacyPolicy")}</span>
          <span className="underline">{t("termsOfService")}</span>
          {showHelpCenter ? <span className="underline">{t("helpCenter")}</span> : null}
        </div>
        <p className="text-xs text-muted">{t("copyright")}</p>
      </PageContainer>
    </footer>
  );
}
