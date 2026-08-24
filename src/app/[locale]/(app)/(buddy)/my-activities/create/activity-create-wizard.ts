import type { Locale } from "@/i18n/routing";
import {
  formatSeoulDate,
  formatSeoulTime,
  getSeoulDateTimeParts,
  getSeoulNowParts,
  toSeoulStartAt,
} from "@/lib/datetime";
import { extractImageKeyFromUrl } from "@/lib/images/presigned";
import type { Activity, Session } from "@/types/activity";
import type { MyActivityDetailResponse } from "@/types/buddy";

export const ACTIVITY_CREATE_STEPS = [
  "host",
  "name",
  "description",
  "photos",
  "itinerary",
  "meeting",
  "schedule",
  "capacity",
  "price",
  "discount",
  "inclusions",
  "restrictions",
] as const;

export const ACTIVITY_CREATE_LIMITS = {
  hostIntroduction: { min: 30, max: 200 },
  experienceName: { min: 1, max: 20 },
  experienceDescription: { min: 30, max: 200 },
  photos: { min: 3, max: 10 },
  itineraryTitle: { min: 1, max: 20 },
  itineraryDescription: { min: 5, max: 50 },
  // 백엔드 ActivityUpsertRequest 계약 상한
  maxGuests: { max: 100 },
  schedules: { max: 30 },
  itineraryItems: { max: 20 },
} as const;

export type ActivityCreateStep = (typeof ACTIVITY_CREATE_STEPS)[number];
export type DiscountType = "none" | "limited";

export interface PhotoDraft {
  id: string;
  /** 새로 선택한 파일. 서버에 이미 올라간 기존 이미지는 null */
  file: File | null;
  previewUrl: string;
  /** 기존 이미지 유지 시 재사용할 S3 key */
  existingKey?: string;
}

export interface ItineraryDraft {
  id: string;
  title: string;
  description: string;
  durationMinutes: string;
  photo: PhotoDraft | null;
}

export interface ScheduleDraft {
  id: string;
  date: string;
  startTime: string;
}

export interface ActivityCreateDraft {
  category: string;
  hostIntroduction: string;
  photos: PhotoDraft[];
  experienceName: string;
  experienceDescription: string;
  meetingAddress: string;
  meetingPlaceId: string;
  meetingPlace: string;
  meetingLatitude: number | null;
  meetingLongitude: number | null;
  schedules: ScheduleDraft[];
  /**
   * 편집 화면에 띄우지 않지만 그대로 유지해야 하는 지난 일정의 시작 시각.
   * 제출에서 빠지면 백엔드가 삭제로 보고, 신청 내역이 있으면 수정 자체가 거절된다.
   */
  retainedScheduleStartAts: string[];
  itinerary: ItineraryDraft[];
  maxGuests: string;
  pricePerPerson: string;
  inclusions: string;
  discountType: DiscountType;
  discountPercent: string;
  discountEndsAt: string;
  restrictions: string;
  hasNoRestrictions: boolean;
}

export type ActivityCreateErrorKey =
  | "hostIntroductionRequired"
  | "photosMinimum"
  | "experienceNameRequired"
  | "experienceDescriptionRequired"
  | "meetingAddressRequired"
  | "meetingPlaceRequired"
  | "scheduleInvalid"
  | "scheduleInPast"
  | "itineraryRequired"
  | "itineraryTitleRequired"
  | "itineraryDescriptionTooShort"
  | "itineraryDurationInvalid"
  | "itineraryPhotoRequired"
  | "itineraryTooMany"
  | "maxGuestsInvalid"
  | "maxGuestsTooMany"
  | "schedulesTooMany"
  | "priceInvalid"
  | "inclusionsRequired"
  | "restrictionsRequired"
  | "discountInvalid";

export const EMPTY_ACTIVITY_DRAFT: ActivityCreateDraft = {
  category: "sports",
  hostIntroduction: "",
  photos: [],
  experienceName: "",
  experienceDescription: "",
  meetingAddress: "",
  meetingPlaceId: "",
  meetingPlace: "",
  meetingLatitude: null,
  meetingLongitude: null,
  schedules: [],
  retainedScheduleStartAts: [],
  itinerary: [],
  maxGuests: "1",
  pricePerPerson: "",
  inclusions: "",
  discountType: "none",
  discountPercent: "",
  discountEndsAt: "",
  restrictions: "",
  hasNoRestrictions: false,
};

function isPositiveInteger(value: string) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0;
}

function isWithinLength(value: string, min: number, max: number) {
  const length = value.trim().length;
  return length >= min && length <= max;
}

/** 일정이 Asia/Seoul 기준 현재보다 과거인지 판단한다 (오늘 날짜는 지나간 시각까지 과거로 본다) */
export function isPastSchedule(
  schedule: Pick<ScheduleDraft, "date" | "startTime">,
  now = getSeoulNowParts(),
) {
  if (schedule.date < now.date) return true;
  return (
    schedule.date === now.date && Boolean(schedule.startTime) && schedule.startTime <= now.time
  );
}

export function validateActivityCreateStep(
  step: ActivityCreateStep,
  draft: ActivityCreateDraft,
): ActivityCreateErrorKey | null {
  switch (step) {
    case "host":
      return isWithinLength(
        draft.hostIntroduction,
        ACTIVITY_CREATE_LIMITS.hostIntroduction.min,
        ACTIVITY_CREATE_LIMITS.hostIntroduction.max,
      )
        ? null
        : "hostIntroductionRequired";
    case "name":
      return isWithinLength(
        draft.experienceName,
        ACTIVITY_CREATE_LIMITS.experienceName.min,
        ACTIVITY_CREATE_LIMITS.experienceName.max,
      )
        ? null
        : "experienceNameRequired";
    case "description":
      return isWithinLength(
        draft.experienceDescription,
        ACTIVITY_CREATE_LIMITS.experienceDescription.min,
        ACTIVITY_CREATE_LIMITS.experienceDescription.max,
      )
        ? null
        : "experienceDescriptionRequired";
    case "photos":
      return draft.photos.length >= ACTIVITY_CREATE_LIMITS.photos.min &&
        draft.photos.length <= ACTIVITY_CREATE_LIMITS.photos.max
        ? null
        : "photosMinimum";
    case "itinerary": {
      if (draft.itinerary.length === 0) return "itineraryRequired";
      if (
        draft.itinerary.some(
          (item) =>
            !isWithinLength(
              item.title,
              ACTIVITY_CREATE_LIMITS.itineraryTitle.min,
              ACTIVITY_CREATE_LIMITS.itineraryTitle.max,
            ),
        )
      ) {
        return "itineraryTitleRequired";
      }
      if (
        draft.itinerary.some(
          (item) =>
            !isWithinLength(
              item.description,
              ACTIVITY_CREATE_LIMITS.itineraryDescription.min,
              ACTIVITY_CREATE_LIMITS.itineraryDescription.max,
            ),
        )
      ) {
        return "itineraryDescriptionTooShort";
      }
      if (draft.itinerary.length > ACTIVITY_CREATE_LIMITS.itineraryItems.max) {
        return "itineraryTooMany";
      }
      if (draft.itinerary.some((item) => !isPositiveInteger(item.durationMinutes))) {
        return "itineraryDurationInvalid";
      }
      return draft.itinerary.some((item) => item.photo === null) ? "itineraryPhotoRequired" : null;
    }
    case "meeting":
      if (!draft.meetingAddress.trim()) return "meetingAddressRequired";
      return draft.meetingPlace.trim() ? null : "meetingPlaceRequired";
    case "schedule": {
      if (
        draft.schedules.length === 0 ||
        draft.schedules.some((schedule) => !schedule.date || !schedule.startTime)
      ) {
        return "scheduleInvalid";
      }
      // startAt 변환에 실패한 일정이 제출 요청에서 조용히 빠지지 않도록 여기서 막는다
      if (
        draft.schedules.some(
          (schedule) => toSeoulStartAt(`${schedule.date}T${schedule.startTime}`) === null,
        )
      ) {
        return "scheduleInvalid";
      }
      if (draft.schedules.length > ACTIVITY_CREATE_LIMITS.schedules.max) {
        return "schedulesTooMany";
      }
      const now = getSeoulNowParts();
      return draft.schedules.some((schedule) => isPastSchedule(schedule, now))
        ? "scheduleInPast"
        : null;
    }
    case "capacity":
      if (!isPositiveInteger(draft.maxGuests)) return "maxGuestsInvalid";
      return Number(draft.maxGuests) <= ACTIVITY_CREATE_LIMITS.maxGuests.max
        ? null
        : "maxGuestsTooMany";
    case "price":
      return isPositiveInteger(draft.pricePerPerson) ? null : "priceInvalid";
    case "inclusions":
      return draft.inclusions.trim() ? null : "inclusionsRequired";
    case "discount": {
      if (draft.discountType !== "none") {
        const discount = Number(draft.discountPercent);
        if (
          !draft.discountEndsAt ||
          // 백엔드 계약: 할인 종료일은 Asia/Seoul 기준 오늘 또는 이후 날짜
          draft.discountEndsAt < getSeoulNowParts().date ||
          !Number.isInteger(discount) ||
          discount <= 0 ||
          discount > 100
        ) {
          return "discountInvalid";
        }
      }
      return null;
    }
    case "restrictions":
      return draft.hasNoRestrictions || draft.restrictions.trim() ? null : "restrictionsRequired";
  }
}

function toExistingPhotoDraft(id: string, imageUrl: string): PhotoDraft {
  return {
    id,
    file: null,
    previewUrl: imageUrl,
    existingKey: extractImageKeyFromUrl(imageUrl),
  };
}

/**
 * 내 활동 상세 응답을 수정용 draft로 변환한다.
 * 지난 일정은 편집 화면 검증(과거 일정 금지)과 충돌해 목록에서 빼되,
 * 제출할 때는 그대로 다시 넣어 삭제로 처리되지 않게 한다.
 */
export function buildDraftFromMyActivityDetail(
  detail: MyActivityDetailResponse,
): ActivityCreateDraft {
  const now = getSeoulNowParts();
  const schedules = detail.schedules
    .map((schedule) => {
      const parts = getSeoulDateTimeParts(schedule.startAt);
      if (!parts) return null;
      return {
        id: `existing-schedule-${schedule.scheduleId}`,
        date: parts.date,
        startTime: parts.time,
      };
    })
    .filter((schedule): schedule is ScheduleDraft => schedule !== null)
    .filter((schedule) => !isPastSchedule(schedule, now))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  const retainedScheduleStartAts = detail.schedules
    .filter((schedule) => {
      const parts = getSeoulDateTimeParts(schedule.startAt);
      return parts !== null && isPastSchedule({ date: parts.date, startTime: parts.time }, now);
    })
    .map((schedule) => schedule.startAt);
  // 종료일이 지난 할인은 그대로 제출하면 백엔드 검증(오늘 이후)에 걸리므로 미적용으로 되돌린다
  const hasDiscount =
    detail.discountPercent !== null &&
    detail.discountEndDate !== null &&
    detail.discountEndDate >= now.date;

  return {
    ...EMPTY_ACTIVITY_DRAFT,
    retainedScheduleStartAts,
    hostIntroduction: detail.hostIntroduction,
    photos: [...detail.images]
      .sort((left, right) => left.imageOrder - right.imageOrder)
      .map((image, index) => toExistingPhotoDraft(`existing-photo-${index}`, image.imageUrl)),
    experienceName: detail.title,
    experienceDescription: detail.description,
    meetingAddress: detail.meetingPointName,
    meetingPlaceId: detail.meetingPlaceId,
    meetingPlace: detail.meetingPointName,
    meetingLatitude: detail.meetingLatitude ?? null,
    meetingLongitude: detail.meetingLongitude ?? null,
    schedules,
    itinerary: [...detail.itineraries]
      .sort((left, right) => left.itemOrder - right.itemOrder)
      .map((item) => ({
        id: `existing-itinerary-${item.itineraryId}`,
        title: item.title,
        description: item.description,
        durationMinutes: String(item.durationMinutes),
        photo: toExistingPhotoDraft(`existing-itinerary-photo-${item.itineraryId}`, item.imageUrl),
      })),
    maxGuests: String(detail.maxCapacity),
    pricePerPerson: String(detail.price),
    inclusions: detail.includedItems.join("\n"),
    discountType: hasDiscount ? "limited" : "none",
    discountPercent: hasDiscount ? String(detail.discountPercent) : "",
    discountEndsAt: hasDiscount ? (detail.discountEndDate ?? "") : "",
    restrictions: detail.restrictionNotes.join("\n"),
    hasNoRestrictions: detail.restrictionNotes.length === 0,
  };
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * 검토 화면에서 실제 상세 화면과 동일한 미리보기를 그리기 위해
 * draft를 게스트 상세 뷰 모델로 변환한다. 서버 계산값은 같은 규칙으로 재현한다.
 */
export function buildPreviewActivityFromDraft(
  draft: ActivityCreateDraft,
  options: Readonly<{
    locale: Locale;
    dateTimeUnavailable: string;
    activityId?: string;
    hostId?: number;
    hostName: string;
    hostBio: string;
    hostAvatarUrl?: string | null;
  }>,
): Activity {
  const {
    locale,
    dateTimeUnavailable,
    activityId,
    hostId,
    hostName,
    hostBio,
    hostAvatarUrl = null,
  } = options;
  const images = draft.photos.map((photo) => photo.previewUrl);
  const maxGuests = Number(draft.maxGuests) || 1;
  const sessions = draft.schedules
    .filter((schedule) => schedule.date && schedule.startTime)
    .map<Session | null>((schedule) => {
      const startAt = toSeoulStartAt(`${schedule.date}T${schedule.startTime}`);
      if (!startAt) return null;
      return {
        id: schedule.id,
        startAt,
        dateKey: schedule.date,
        dateLabel: formatSeoulDate(startAt, locale) ?? dateTimeUnavailable,
        timeLabel: formatSeoulTime(startAt, locale) ?? "",
        spotsLeft: maxGuests,
      };
    })
    .filter((session): session is Session => session !== null);
  const itineraryMinutes = draft.itinerary.reduce(
    (total, item) => total + (Number(item.durationMinutes) || 0),
    0,
  );
  const price = Number(draft.pricePerPerson) || 0;
  const discountPercent = draft.discountType === "limited" ? Number(draft.discountPercent) : 0;
  const hasDiscount = discountPercent > 0;
  const discountedPrice = Math.round(price * (1 - discountPercent / 100));

  return {
    id: activityId ?? "preview",
    title: draft.experienceName,
    description: draft.experienceDescription,
    location: draft.meetingPlace,
    district: draft.meetingPlace,
    imageUrl: images[0] ?? "",
    heroImageUrl: images[0] ?? "",
    images,
    price: hasDiscount ? discountedPrice : price,
    originalPrice: hasDiscount ? price : undefined,
    discountPercent: hasDiscount ? discountPercent : undefined,
    durationMinutes: itineraryMinutes > 0 ? Math.ceil(itineraryMinutes / 30) * 30 : undefined,
    isSoldOut: false,
    host: {
      id: hostId,
      name: hostName,
      bio: hostBio,
      avatarUrl: hostAvatarUrl,
    },
    hostIntroduction: draft.hostIntroduction.trim() || undefined,
    included: splitLines(draft.inclusions).map((label) => ({ label, provided: true })),
    restrictions: draft.hasNoRestrictions ? [] : splitLines(draft.restrictions),
    sessions,
    itinerary: draft.itinerary.map((item, index) => ({
      id: item.id || `preview-itinerary-${index}`,
      title: item.title,
      description: item.description,
      durationMinutes: Number(item.durationMinutes) || 0,
      imageUrl: item.photo?.previewUrl ?? "",
    })),
    meetingPoint: {
      name: draft.meetingPlace,
      area: draft.meetingAddress,
      placeId: draft.meetingPlaceId,
    },
  };
}

export function getStepIndex(step: ActivityCreateStep) {
  return ACTIVITY_CREATE_STEPS.indexOf(step);
}

export function getNextActivityCreateStep(step: ActivityCreateStep) {
  const nextIndex = Math.min(getStepIndex(step) + 1, ACTIVITY_CREATE_STEPS.length - 1);
  return ACTIVITY_CREATE_STEPS[nextIndex];
}

export function getPreviousActivityCreateStep(step: ActivityCreateStep) {
  const previousIndex = Math.max(getStepIndex(step) - 1, 0);
  return ACTIVITY_CREATE_STEPS[previousIndex];
}
