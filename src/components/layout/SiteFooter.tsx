import { AnalyticsSettings } from "@/components/analytics/AnalyticsProvider";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FooterLocaleSwitcher } from "@/components/layout/FooterLocaleSwitcher";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  FacebookIcon,
  InstagramIcon,
  KakaoTalkIcon,
  MailIcon,
  WhatsAppIcon,
} from "@/components/ui/icons";
import type { Locale } from "@/i18n/routing";
import type { SiteNavRole } from "@/lib/auth/routes";
import { getPolicyPath } from "@/lib/policy-routes";
import { CONTACT_DETAILS } from "@/lib/contact-details";
import { TrackedInquiryLink } from "@/components/analytics/TrackedInquiryLink";

interface SiteFooterProps {
  readonly locale: Locale;
  readonly role?: SiteNavRole | null;
}

const BUSINESS_DETAILS = {
  name: "제로원",
  representative: "김민형",
  registrationNumber: "597-05-03957",
  address: "서울특별시 동대문구 전농로34길 15-4 404호",
  phone: "+82 10-8297-0110",
} as const;

export async function SiteFooter({ locale, role = null }: SiteFooterProps) {
  const [authT, landingT, navT] = await Promise.all([
    getTranslations({ locale, namespace: "Auth" }),
    getTranslations({ locale, namespace: "Landing" }),
    getTranslations({ locale, namespace: "Navigation" }),
  ]);

  return (
    <footer className="border-t border-line-soft bg-canvas-soft py-8 text-sm text-muted max-md:py-4">
      <PageContainer className="flex flex-col gap-3 max-md:gap-2">
        <div className="flex w-full flex-col gap-4 max-md:contents sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 text-xs text-muted max-md:contents">
            <p className="max-md:order-4 max-md:pt-1 max-md:text-[11px]">© 2026 HanBuddy</p>
            <div
              data-testid="footer-links"
              className="contents max-md:order-1 max-md:flex max-md:flex-wrap max-md:items-center max-md:gap-x-3 max-md:text-xs max-md:[&>button]:min-h-8"
            >
              <AnalyticsSettings />
              <Link
                href={`/${locale}/about`}
                className="inline-flex min-h-11 items-center transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong max-md:min-h-8"
              >
                {navT("about")}
              </Link>
              <Link
                href={getPolicyPath(locale, "terms-of-service")}
                className="inline-flex min-h-11 items-center transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong max-md:min-h-8"
              >
                {authT("termsOfService")}
              </Link>
              <Link
                href={getPolicyPath(locale, "privacy-policy")}
                className="inline-flex min-h-11 items-center transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong max-md:min-h-8"
              >
                {authT("privacyPolicy")}
              </Link>
              <Link
                href={getPolicyPath(locale, "cancellation-refund-policy")}
                className="inline-flex min-h-11 items-center transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong max-md:min-h-8"
              >
                {authT("cancellationRefundPolicy")}
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-1 max-md:order-2 max-md:justify-between max-md:gap-0 sm:justify-end sm:gap-2 max-md:[&_[role=menu]]:right-auto max-md:[&_[role=menu]]:left-0 max-md:[&_button[aria-haspopup]]:gap-1.5">
            <FooterLocaleSwitcher role={role} />
            <TrackedInquiryLink
              channel="email"
              placement="site_footer"
              locale={locale}
              href={`mailto:${CONTACT_DETAILS.email}`}
              aria-label={landingT("contact.emailIconLabel")}
              className="flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:text-primary max-md:w-8 max-md:shrink-0 max-md:[&>svg]:size-4"
            >
              <MailIcon className="size-[18px]" />
            </TrackedInquiryLink>
            <TrackedInquiryLink
              channel="whatsapp"
              placement="site_footer"
              locale={locale}
              href={CONTACT_DETAILS.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={landingT("contact.whatsappIconLabel")}
              className="flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:text-primary max-md:w-8 max-md:shrink-0 max-md:[&>svg]:size-4"
            >
              <WhatsAppIcon className="size-[18px]" />
            </TrackedInquiryLink>
            <TrackedInquiryLink
              channel="facebook"
              placement="site_footer"
              locale={locale}
              href={CONTACT_DETAILS.facebookUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={landingT("contact.facebookIconLabel")}
              className="flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:text-primary max-md:w-8 max-md:shrink-0 max-md:[&>svg]:size-4"
            >
              <FacebookIcon className="size-[18px]" />
            </TrackedInquiryLink>
            <TrackedInquiryLink
              channel="kakao"
              placement="site_footer"
              locale={locale}
              href={CONTACT_DETAILS.kakaoUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={landingT("contact.kakaoIconLabel")}
              className="flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:text-primary max-md:w-8 max-md:shrink-0 max-md:[&>svg]:size-4"
            >
              <KakaoTalkIcon className="size-[18px]" />
            </TrackedInquiryLink>
            <TrackedInquiryLink
              channel="instagram"
              placement="site_footer"
              locale={locale}
              href={CONTACT_DETAILS.instagramUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={landingT("contact.instagramIconLabel")}
              className="flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:text-primary max-md:w-8 max-md:shrink-0 max-md:[&>svg]:size-4"
            >
              <InstagramIcon className="size-[18px]" />
            </TrackedInquiryLink>
          </div>
        </div>

        <div className="space-y-1 border-t border-line-soft/70 pt-3 text-[11px] leading-5 text-muted/50 max-md:order-3 max-md:space-y-0.5 max-md:pt-2 max-md:leading-4 max-md:text-muted/75">
          <dl className="flex flex-wrap gap-x-5 gap-y-1 max-md:gap-x-3 max-md:gap-y-0.5">
            <div className="flex gap-1.5">
              <dt className="font-medium">상호명</dt>
              <dd>{BUSINESS_DETAILS.name}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="font-medium">대표자명</dt>
              <dd>{BUSINESS_DETAILS.representative}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="font-medium">사업자등록번호</dt>
              <dd>{BUSINESS_DETAILS.registrationNumber}</dd>
            </div>
          </dl>
          <dl className="flex flex-wrap gap-x-5 gap-y-1 max-md:gap-x-3 max-md:gap-y-0.5">
            <div className="flex gap-1.5">
              <dt className="shrink-0 font-medium">사업장 주소</dt>
              <dd>{BUSINESS_DETAILS.address}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="font-medium">전화번호</dt>
              <dd>{BUSINESS_DETAILS.phone}</dd>
            </div>
          </dl>
        </div>
      </PageContainer>
    </footer>
  );
}
