export const ACTIVITY_CREATE_STEPS = [
  "category",
  "concept",
  "host",
  "photos",
  "listing",
  "meeting",
  "itinerary",
  "pricing",
  "review",
] as const;

export type ActivityCreateStep = (typeof ACTIVITY_CREATE_STEPS)[number];

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

export interface ActivityCreateDraft {
  category: string;
  conceptTitle: string;
  conceptDescription: string;
  hostIntroduction: string;
  qualifications: string;
  pressHistory: string;
  photos: PhotoDraft[];
  experienceName: string;
  experienceDescription: string;
  meetingPlace: string;
  meetingDetails: string;
  itinerary: ItineraryDraft[];
  maxGuests: string;
  pricePerPerson: string;
  inclusions: string;
  discountPercent: string;
  restrictions: string;
}

export type ActivityCreateErrorKey =
  | "categoryRequired"
  | "conceptTitleRequired"
  | "conceptDescriptionRequired"
  | "hostIntroductionRequired"
  | "qualificationsRequired"
  | "photosMinimum"
  | "experienceNameRequired"
  | "experienceDescriptionRequired"
  | "meetingPlaceRequired"
  | "meetingDetailsRequired"
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
  category: "",
  conceptTitle: "",
  conceptDescription: "",
  hostIntroduction: "",
  qualifications: "",
  pressHistory: "",
  photos: [],
  experienceName: "",
  experienceDescription: "",
  meetingPlace: "",
  meetingDetails: "",
  itinerary: [],
  maxGuests: "",
  pricePerPerson: "",
  inclusions: "",
  discountPercent: "",
  restrictions: "",
};

function isPositiveInteger(value: string) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0;
}

export function validateActivityCreateStep(
  step: ActivityCreateStep,
  draft: ActivityCreateDraft,
): ActivityCreateErrorKey | null {
  switch (step) {
    case "category":
      return draft.category ? null : "categoryRequired";
    case "concept":
      if (!draft.conceptTitle.trim()) return "conceptTitleRequired";
      return draft.conceptDescription.trim() ? null : "conceptDescriptionRequired";
    case "host":
      if (!draft.hostIntroduction.trim()) return "hostIntroductionRequired";
      return draft.qualifications.trim() ? null : "qualificationsRequired";
    case "photos":
      return draft.photos.length >= 5 ? null : "photosMinimum";
    case "listing":
      if (!draft.experienceName.trim()) return "experienceNameRequired";
      return draft.experienceDescription.trim() ? null : "experienceDescriptionRequired";
    case "meeting":
      if (!draft.meetingPlace.trim()) return "meetingPlaceRequired";
      return draft.meetingDetails.trim() ? null : "meetingDetailsRequired";
    case "itinerary": {
      if (draft.itinerary.length === 0) return "itineraryRequired";
      if (draft.itinerary.some((item) => !item.title.trim())) return "itineraryTitleRequired";
      if (draft.itinerary.some((item) => item.description.trim().length < 30)) {
        return "itineraryDescriptionTooShort";
      }
      if (draft.itinerary.some((item) => !isPositiveInteger(item.durationMinutes))) {
        return "itineraryDurationInvalid";
      }
      return draft.itinerary.some((item) => item.photo === null) ? "itineraryPhotoRequired" : null;
    }
    case "pricing": {
      if (!isPositiveInteger(draft.maxGuests)) return "maxGuestsInvalid";
      if (!isPositiveInteger(draft.pricePerPerson)) return "priceInvalid";
      if (!draft.inclusions.trim()) return "inclusionsRequired";
      if (!draft.restrictions.trim()) return "restrictionsRequired";
      if (draft.discountPercent) {
        const discount = Number(draft.discountPercent);
        if (!Number.isInteger(discount) || discount < 0 || discount > 100) {
          return "discountInvalid";
        }
      }
      return null;
    }
    case "review":
      return null;
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
