import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
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
} as const;

export async function SiteFooter({ locale }: SiteFooterProps) {
  const [authT, landingT] = await Promise.all([
    getTranslations({ locale, namespace: "Auth" }),
    getTranslations({ locale, namespace: "Landing" }),
  ]);

  return (
    <footer className="border-t border-line-soft bg-canvas-soft py-8 text-sm text-muted">
      <PageContainer className="flex flex-col gap-3">
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
            <p>© 2026 HanBuddy</p>
            <span>{authT("privacyPolicy")}</span>
            <span>{authT("termsOfService")}</span>
          </div>

          <div className="flex items-center gap-4 sm:justify-end">
            <LocaleSwitcher labelStyle="nameWithCode" variant="footer" />
            <a
              href={`mailto:${CONTACT_DETAILS.email}`}
              aria-label={landingT("contact.emailIconLabel")}
              className="text-muted transition-colors hover:text-primary"
            >
              <MailIcon className="size-[18px]" />
            </a>
            <a
              href={CONTACT_DETAILS.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={landingT("contact.whatsappIconLabel")}
              className="text-muted transition-colors hover:text-primary"
            >
              <WhatsAppIcon className="size-[18px]" />
            </a>
            <a
              href={CONTACT_DETAILS.facebookUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={landingT("contact.facebookIconLabel")}
              className="text-muted transition-colors hover:text-primary"
            >
              <FacebookIcon className="size-[18px]" />
            </a>
            <a
              href={CONTACT_DETAILS.kakaoUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={landingT("contact.kakaoIconLabel")}
              className="text-muted transition-colors hover:text-primary"
            >
              <KakaoTalkIcon className="size-[18px]" />
            </a>
            <a
              href={CONTACT_DETAILS.instagramUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={landingT("contact.instagramIconLabel")}
              className="text-muted transition-colors hover:text-primary"
            >
              <InstagramIcon className="size-[18px]" />
            </a>
          </div>
        </div>

        <div className="space-y-1 border-t border-line-soft/70 pt-3 text-[11px] leading-5 text-muted/70">
          <dl className="flex flex-wrap gap-x-5 gap-y-1">
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
          <dl className="flex flex-wrap gap-x-5 gap-y-1">
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
