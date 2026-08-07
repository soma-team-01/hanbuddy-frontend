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
} as const;

export type ActivityCreateStep = (typeof ACTIVITY_CREATE_STEPS)[number];
export type DiscountType = "none" | "limited";

export interface PhotoDraft {
  id: string;
  file: File;
  previewUrl: string;
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
  schedules: ScheduleDraft[];
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
  | "itineraryRequired"
  | "itineraryTitleRequired"
  | "itineraryDescriptionTooShort"
  | "itineraryDurationInvalid"
  | "itineraryPhotoRequired"
  | "maxGuestsInvalid"
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
  schedules: [],
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
      if (draft.itinerary.some((item) => !isPositiveInteger(item.durationMinutes))) {
        return "itineraryDurationInvalid";
      }
      return draft.itinerary.some((item) => item.photo === null) ? "itineraryPhotoRequired" : null;
    }
    case "meeting":
      if (!draft.meetingAddress.trim()) return "meetingAddressRequired";
      return draft.meetingPlace.trim() ? null : "meetingPlaceRequired";
    case "schedule":
      return draft.schedules.length > 0 &&
        draft.schedules.every((schedule) => schedule.date && schedule.startTime)
        ? null
        : "scheduleInvalid";
    case "capacity":
      return isPositiveInteger(draft.maxGuests) ? null : "maxGuestsInvalid";
    case "price":
      return isPositiveInteger(draft.pricePerPerson) ? null : "priceInvalid";
    case "inclusions":
      return draft.inclusions.trim() ? null : "inclusionsRequired";
    case "discount": {
      if (draft.discountType !== "none") {
        const discount = Number(draft.discountPercent);
        if (
          !draft.discountEndsAt ||
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
