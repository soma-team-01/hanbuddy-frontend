import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { InstagramIcon, MailIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

interface SiteFooterProps {
  readonly locale: Locale;
}

const CONTACT_DETAILS = {
  email: "zeroone.soma@gmail.com",
  instagramUrl: "https://www.instagram.com/hanbuddy_kr/",
} as const;

export async function SiteFooter({ locale }: SiteFooterProps) {
  const [authT, landingT] = await Promise.all([
    getTranslations({ locale, namespace: "Auth" }),
    getTranslations({ locale, namespace: "Landing" }),
  ]);

  return (
    <footer className="border-t border-line-soft bg-canvas-soft py-6 text-sm text-muted">
      <PageContainer className="flex flex-col gap-4">
        <div className="relative flex w-full flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
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

          <div className="flex flex-col items-center gap-2 text-center sm:absolute sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-2">
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted">
              <span className="underline">{authT("privacyPolicy")}</span>
              <span className="underline">{authT("termsOfService")}</span>
            </div>
            <p className="text-xs text-muted">{authT("copyright")}</p>
          </div>

          <div className="flex items-center gap-2 sm:ml-auto">
            <a
              href={`mailto:${CONTACT_DETAILS.email}`}
              aria-label={landingT("contact.emailIconLabel")}
              className="flex size-11 items-center justify-center rounded-full border border-line-soft text-muted transition-colors hover:border-primary hover:text-primary"
            >
              <MailIcon className="size-5" />
            </a>
            <a
              href={CONTACT_DETAILS.instagramUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={landingT("contact.instagramIconLabel")}
              className="flex size-11 items-center justify-center rounded-full border border-line-soft text-muted transition-colors hover:border-primary hover:text-primary"
            >
              <InstagramIcon className="size-5" />
            </a>
          </div>
        </div>
      </PageContainer>
    </footer>
  );
}
