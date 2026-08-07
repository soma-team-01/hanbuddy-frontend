import { describe, expect, it } from "vitest";
import {
  ACTIVITY_CREATE_STEPS,
  EMPTY_ACTIVITY_DRAFT,
  getNextActivityCreateStep,
  getPreviousActivityCreateStep,
  validateActivityCreateStep,
  type ActivityCreateDraft,
  type ActivityCreateErrorKey,
  type ActivityCreateStep,
  type ItineraryDraft,
  type PhotoDraft,
} from "./activity-create-wizard";

const photo = { id: "photo", file: {} as File, previewUrl: "blob:photo" } satisfies PhotoDraft;
const itinerary = {
  id: "itinerary",
  title: "Taste market dishes",
  description: "Taste three dishes with local market vendors.",
  durationMinutes: "60",
  photo,
} satisfies ItineraryDraft;

function createCompleteDraft(overrides: Partial<ActivityCreateDraft> = {}): ActivityCreateDraft {
  return {
    ...EMPTY_ACTIVITY_DRAFT,
    hostIntroduction: "I have hosted neighborhood walks for many years.",
    photos: Array.from({ length: 3 }, (_, index) => ({ ...photo, id: `photo-${index}` })),
    experienceName: "Seoul market walk",
    experienceDescription: "Meet vendors and share a local breakfast together.",
    meetingAddress: "88 Changgyeonggung-ro, Jongno-gu, Seoul",
    meetingPlace: "Gwangjang Market Gate 2",
    schedules: [
      { id: "schedule-2026-08-15", date: "2026-08-15", startTime: "10:00" },
      { id: "schedule-2026-08-22", date: "2026-08-22", startTime: "14:00" },
    ],
    itinerary: [itinerary],
    maxGuests: "6",
    pricePerPerson: "50000",
    inclusions: "Three tastings",
    restrictions: "Guests must be 19 or older",
    ...overrides,
  };
}

describe("activity creation wizard", () => {
  it("keeps the requested fields in twelve focused steps", () => {
    expect(ACTIVITY_CREATE_STEPS).toEqual([
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
    ]);
  });

  const validationCases: Array<
    [ActivityCreateStep, Partial<ActivityCreateDraft>, ActivityCreateErrorKey]
  > = [
    ["host", { hostIntroduction: "" }, "hostIntroductionRequired"],
    ["host", { hostIntroduction: "A".repeat(29) }, "hostIntroductionRequired"],
    ["host", { hostIntroduction: "A".repeat(201) }, "hostIntroductionRequired"],
    ["name", { experienceName: "" }, "experienceNameRequired"],
    ["name", { experienceName: "A".repeat(21) }, "experienceNameRequired"],
    ["description", { experienceDescription: "" }, "experienceDescriptionRequired"],
    ["description", { experienceDescription: "A".repeat(29) }, "experienceDescriptionRequired"],
    ["description", { experienceDescription: "A".repeat(201) }, "experienceDescriptionRequired"],
    ["photos", { photos: [photo] }, "photosMinimum"],
    [
      "photos",
      { photos: Array.from({ length: 11 }, (_, index) => ({ ...photo, id: `photo-${index}` })) },
      "photosMinimum",
    ],
    [
      "itinerary",
      { itinerary: [{ ...itinerary, title: "A".repeat(21) }] },
      "itineraryTitleRequired",
    ],
    [
      "itinerary",
      { itinerary: [{ ...itinerary, description: "Tiny".slice(0, 4) }] },
      "itineraryDescriptionTooShort",
    ],
    [
      "itinerary",
      { itinerary: [{ ...itinerary, description: "A".repeat(51) }] },
      "itineraryDescriptionTooShort",
    ],
    ["meeting", { meetingAddress: "" }, "meetingAddressRequired"],
    ["schedule", { schedules: [] }, "scheduleInvalid"],
    [
      "schedule",
      { schedules: [{ id: "schedule-2026-08-15", date: "2026-08-15", startTime: "" }] },
      "scheduleInvalid",
    ],
    ["capacity", { maxGuests: "0" }, "maxGuestsInvalid"],
    ["price", { pricePerPerson: "0" }, "priceInvalid"],
    ["inclusions", { inclusions: "" }, "inclusionsRequired"],
    [
      "discount",
      { discountType: "limited", discountPercent: "10", discountEndsAt: "" },
      "discountInvalid",
    ],
    ["restrictions", { restrictions: "", hasNoRestrictions: false }, "restrictionsRequired"],
  ];

  it.each(validationCases)("validates the %s step", (step, overrides, error) => {
    expect(validateActivityCreateStep(step, createCompleteDraft(overrides))).toBe(error);
  });

  it("accepts a complete draft and clamps step navigation", () => {
    const draft = createCompleteDraft();

    for (const step of ACTIVITY_CREATE_STEPS) {
      expect(validateActivityCreateStep(step, draft)).toBeNull();
    }
    expect(getPreviousActivityCreateStep("host")).toBe("host");
    expect(getNextActivityCreateStep("restrictions")).toBe("restrictions");
  });

  it("allows restrictions to be empty only when the host explicitly selects none", () => {
    const draft = createCompleteDraft({ restrictions: "", hasNoRestrictions: true });

    expect(validateActivityCreateStep("restrictions", draft)).toBeNull();
  });
});
