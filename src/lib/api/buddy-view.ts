import type { BuddyApplicationApplicantSummaryResponse, MyActivityStatus } from "@/types/buddy";
import type { Locale } from "@/i18n/routing";

export const DEFAULT_ACTIVITY_THUMBNAIL = "/images/activities/hanok-hero.jpg";

const ACTIVITY_STATUS_LABELS: Record<MyActivityStatus, string> = {
  ACTIVE: "Active",
  DRAFT: "Draft",
  INACTIVE: "Inactive",
};

const CONTACT_METHOD_LABELS: Record<
  Locale,
  Record<BuddyApplicationApplicantSummaryResponse["applicantContactMethod"], string>
> = {
  en: {
    LINE: "Line",
    PHONE: "Phone",
    WECHAT: "WeChat",
    WHATSAPP: "WhatsApp",
  },
  ko: {
    LINE: "Line",
    PHONE: "전화",
    WECHAT: "WeChat",
    WHATSAPP: "WhatsApp",
  },
};

function createRegionDisplayNames(locale: string) {
  return typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames([locale], { type: "region" })
    : null;
}

const regionDisplayNames: Record<Locale, Intl.DisplayNames | null> = {
  en: createRegionDisplayNames("en-US"),
  ko: createRegionDisplayNames("ko-KR"),
};

export function getActivityThumbnail(thumbnailImageUrl: string | null) {
  return thumbnailImageUrl || DEFAULT_ACTIVITY_THUMBNAIL;
}

export function getMyActivityStatusLabel(status: MyActivityStatus) {
  return ACTIVITY_STATUS_LABELS[status];
}

export function formatNationalityCode(countryCode: string, locale: Locale) {
  return regionDisplayNames[locale]?.of(countryCode) ?? countryCode;
}

export function formatApplicantContact(
  applicant: BuddyApplicationApplicantSummaryResponse,
  locale: Locale,
) {
  const methodLabel = CONTACT_METHOD_LABELS[locale][applicant.applicantContactMethod];
  const contactValue = [applicant.applicantContactCountryCode, applicant.applicantContactIdentifier]
    .filter(Boolean)
    .join(" ");

  return `${methodLabel} ${contactValue}`.trim();
}
