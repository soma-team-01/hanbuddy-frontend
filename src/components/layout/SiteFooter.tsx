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

const BUSINESS_DETAILS = {
  name: "제로원",
  representative: "김민형",
  registrationNumber: "597-05-03957",
  address: "서울특별시 동대문구 전농로34길 15-4 404호",
  phone: "+82 10-8297-0110",
  phoneHref: "tel:+821082970110",
} as const;

export async function SiteFooter({ locale, role }: SiteFooterProps) {
  // 버디의 홈은 대시보드다 — 헤더 로고와 같은 규칙
  const logoHref = role === "buddy" ? "/dashboard" : "/";
  const [authT, landingT] = await Promise.all([
    getTranslations({ locale, namespace: "Auth" }),
    getTranslations({ locale, namespace: "Landing" }),
  ]);

  return (
    <footer className="border-t border-line-soft bg-canvas-soft py-8 text-sm text-muted">
      <PageContainer className="flex flex-col gap-6">
        <div className="grid w-full items-center gap-5 text-center sm:grid-cols-[auto_1fr_auto] sm:text-left">
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

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted">
            <span className="underline">{authT("privacyPolicy")}</span>
            <span className="underline">{authT("termsOfService")}</span>
          </div>

          <div className="flex items-center justify-center gap-2 sm:justify-end">
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

        <div className="grid gap-4 border-t border-line-soft pt-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <section aria-labelledby="business-information-heading" className="min-w-0 text-xs">
            <h2
              id="business-information-heading"
              className="font-semibold tracking-[-0.01em] text-ink"
            >
              사업자 정보
            </h2>
            <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 leading-5">
              <div className="flex gap-1.5">
                <dt className="font-medium text-ink/70">상호명</dt>
                <dd>{BUSINESS_DETAILS.name}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="font-medium text-ink/70">대표자명</dt>
                <dd>{BUSINESS_DETAILS.representative}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="font-medium text-ink/70">사업자등록번호</dt>
                <dd>{BUSINESS_DETAILS.registrationNumber}</dd>
              </div>
              <div className="flex basis-full gap-1.5">
                <dt className="shrink-0 font-medium text-ink/70">사업장 주소</dt>
                <dd>{BUSINESS_DETAILS.address}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="font-medium text-ink/70">전화번호</dt>
                <dd>
                  <a
                    href={BUSINESS_DETAILS.phoneHref}
                    className="underline decoration-line-strong underline-offset-2 transition-colors hover:text-primary"
                  >
                    {BUSINESS_DETAILS.phone}
                  </a>
                </dd>
              </div>
            </dl>
          </section>

          <p className="text-xs lg:text-right">© 2026 HanBuddy. {authT("rightsReserved")}</p>
        </div>
      </PageContainer>
    </footer>
  );
}
