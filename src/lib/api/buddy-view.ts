import type { BuddyApplicationApplicantSummaryResponse, MyActivityStatus } from "@/types/buddy";

export const DEFAULT_ACTIVITY_THUMBNAIL = "/images/activities/hanok-hero.jpg";

const ACTIVITY_STATUS_LABELS: Record<MyActivityStatus, string> = {
  ACTIVE: "Active",
  DRAFT: "Draft",
  INACTIVE: "Inactive",
};

const CONTACT_METHOD_LABELS: Record<
  BuddyApplicationApplicantSummaryResponse["applicantContactMethod"],
  string
> = {
  LINE: "Line",
  PHONE: "Phone",
  WECHAT: "WeChat",
  WHATSAPP: "WhatsApp",
};

const regionDisplayNames =
  typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

export function getActivityThumbnail(thumbnailImageUrl: string | null) {
  return thumbnailImageUrl || DEFAULT_ACTIVITY_THUMBNAIL;
}

export function getMyActivityStatusLabel(status: MyActivityStatus) {
  return ACTIVITY_STATUS_LABELS[status];
}

export function formatNationalityCode(countryCode: string) {
  return regionDisplayNames?.of(countryCode) ?? countryCode;
}

export function formatApplicantContact(applicant: BuddyApplicationApplicantSummaryResponse) {
  const methodLabel = CONTACT_METHOD_LABELS[applicant.applicantContactMethod];
  const contactValue = [applicant.applicantContactCountryCode, applicant.applicantContactIdentifier]
    .filter(Boolean)
    .join(" ");

  return `${methodLabel} ${contactValue}`.trim();
}
