import type {
  BuddyApplicationApplicantSummaryResponse,
  MyActivityDetailResponse,
  MyActivityStatus,
} from "@/types/buddy";
import type { Locale } from "@/i18n/routing";
import { formatSeoulDate, formatSeoulTime, getSeoulDateTimeParts } from "@/lib/datetime";
import type { Activity, Session } from "@/types/activity";

export const DEFAULT_ACTIVITY_THUMBNAIL = "/images/activities/hanok-hero.jpg";

const ACTIVITY_STATUS_LABELS: Record<MyActivityStatus, string> = {
  ACTIVE: "Active",
  DRAFT: "Draft",
  INACTIVE: "Inactive",
  DELETED: "Deleted",
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

export interface PreviewHost {
  name: string;
  avatarUrl: string | null;
}

/**
 * 내 활동 상세 응답을 게스트에게 보이는 상세 화면과 동일한 뷰 모델로 변환한다.
 * 투어리스트 응답에만 있는 값은 같은 규칙으로 재계산한다:
 * - 남은 자리 = maxCapacity - bookedCount (CLOSED 일정은 0)
 * - 총 소요시간 = 일정표 소요시간 합을 30분 단위로 올림
 */
export function mapMyActivityDetailToPreviewActivity(
  detail: MyActivityDetailResponse,
  dateTimeUnavailable: string,
  locale: Locale,
  host: PreviewHost,
  hostBio: string,
): Activity {
  const images = [...detail.images].sort((left, right) => left.imageOrder - right.imageOrder);
  const heroImageUrl = images[0]?.imageUrl ?? getActivityThumbnail(detail.thumbnailImageUrl);
  const hasActiveDiscount = detail.discountedPrice !== null;
  const itineraryMinutes = detail.itineraries.reduce(
    (total, item) => total + item.durationMinutes,
    0,
  );
  const sessions = detail.schedules.map<Session>((schedule) => ({
    id: String(schedule.scheduleId),
    startAt: schedule.startAt,
    dateKey: getSeoulDateTimeParts(schedule.startAt)?.date,
    dateLabel: formatSeoulDate(schedule.startAt, locale) ?? dateTimeUnavailable,
    timeLabel: formatSeoulTime(schedule.startAt, locale) ?? "",
    spotsLeft:
      schedule.status === "CLOSED" ? 0 : Math.max(0, detail.maxCapacity - schedule.bookedCount),
  }));

  return {
    id: String(detail.activityId),
    title: detail.title,
    description: detail.description,
    location: detail.meetingPointName,
    district: detail.meetingPointName,
    imageUrl: detail.thumbnailImageUrl || heroImageUrl,
    heroImageUrl,
    images: images.map(({ imageUrl }) => imageUrl),
    price: detail.discountedPrice ?? detail.price,
    originalPrice: hasActiveDiscount ? detail.price : undefined,
    discountPercent: hasActiveDiscount ? (detail.discountPercent ?? undefined) : undefined,
    durationMinutes: itineraryMinutes > 0 ? Math.ceil(itineraryMinutes / 30) * 30 : undefined,
    isSoldOut: sessions.length > 0 && sessions.every((session) => session.spotsLeft === 0),
    host: {
      name: host.name,
      bio: hostBio,
      avatarUrl: host.avatarUrl,
    },
    hostIntroduction: detail.hostIntroduction?.trim() ? detail.hostIntroduction : undefined,
    included: detail.includedItems.map((label) => ({ label, provided: true })),
    restrictions: detail.restrictionNotes,
    sessions,
    itinerary: [...detail.itineraries]
      .sort((left, right) => left.itemOrder - right.itemOrder)
      .map((item) => ({
        id: String(item.itineraryId),
        title: item.title,
        description: item.description,
        durationMinutes: item.durationMinutes,
        imageUrl: item.imageUrl,
      })),
    meetingPoint: {
      name: detail.meetingPointName,
      area: detail.meetingPointName,
      placeId: detail.meetingPlaceId,
    },
  };
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
