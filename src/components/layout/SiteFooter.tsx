import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  FacebookIcon,
  InstagramIcon,
  KakaoTalkIcon,
  MailIcon,
  WhatsAppIcon,
} from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { SiteNavRole } from "@/lib/auth/routes";

interface SiteFooterProps {
  readonly locale: Locale;
  readonly role?: SiteNavRole | null;
}

const CONTACT_DETAILS = {
  email: "contact@hanbuddy.kr",
  instagramUrl: "https://www.instagram.com/hanbuddy_kr/",
  facebookUrl: "https://www.facebook.com/profile.php?id=61593105057939",
  whatsappUrl: "https://wa.me/821082970110",
  kakaoUrl: "https://open.kakao.com/me/hanbuddy",
} as const;

export async function SiteFooter({ locale, role }: SiteFooterProps) {
  // 버디의 홈은 대시보드다 — 헤더 로고와 같은 규칙
  const logoHref = role === "buddy" ? "/dashboard" : "/";
  const [authT, landingT] = await Promise.all([
    getTranslations({ locale, namespace: "Auth" }),
    getTranslations({ locale, namespace: "Landing" }),
  ]);

  return (
    <footer className="border-t border-line-soft bg-canvas-soft py-6 text-sm text-muted">
      <PageContainer className="flex flex-col gap-4">
        <div className="relative flex w-full flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <Link href={logoHref} aria-label="HanBuddy" className="flex items-center gap-2">
            <Image
              src="/images/brand/logo-borderless.webp"
              alt=""
              width={28}
              height={28}
              className="size-7"
            />
            <span className="font-display font-bold text-ink">HanBuddy</span>
          </Link>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center text-xs text-muted sm:absolute sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2">
            <p>{authT("copyright")}</p>
            <span className="underline">{authT("privacyPolicy")}</span>
            <span className="underline">{authT("termsOfService")}</span>
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
              href={CONTACT_DETAILS.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={landingT("contact.whatsappIconLabel")}
              className="flex size-11 items-center justify-center rounded-full border border-line-soft text-muted transition-colors hover:border-primary hover:text-primary"
            >
              <WhatsAppIcon className="size-5" />
            </a>
            <a
              href={CONTACT_DETAILS.facebookUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={landingT("contact.facebookIconLabel")}
              className="flex size-11 items-center justify-center rounded-full border border-line-soft text-muted transition-colors hover:border-primary hover:text-primary"
            >
              <FacebookIcon className="size-5" />
            </a>
            <a
              href={CONTACT_DETAILS.kakaoUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={landingT("contact.kakaoIconLabel")}
              className="flex size-11 items-center justify-center rounded-full border border-line-soft text-muted transition-colors hover:border-primary hover:text-primary"
            >
              <KakaoTalkIcon className="size-5" />
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
