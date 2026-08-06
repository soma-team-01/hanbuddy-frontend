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
  description: "Walk through the market and taste three local dishes together.",
  durationMinutes: "60",
  photo,
} satisfies ItineraryDraft;

function createCompleteDraft(overrides: Partial<ActivityCreateDraft> = {}): ActivityCreateDraft {
  return {
    ...EMPTY_ACTIVITY_DRAFT,
    category: "food",
    conceptTitle: "Market breakfast",
    conceptDescription: "Discover a local morning market.",
    hostIntroduction: "I grew up near this market.",
    qualifications: "Local food guide",
    photos: Array.from({ length: 5 }, (_, index) => ({ ...photo, id: `photo-${index}` })),
    experienceName: "Seoul market breakfast walk",
    experienceDescription: "Meet vendors and taste a local breakfast.",
    meetingPlace: "Gwangjang Market Gate 2",
    meetingDetails: "Meet beside the information booth.",
    itinerary: [itinerary],
    maxGuests: "6",
    pricePerPerson: "50000",
    inclusions: "Three tastings",
    restrictions: "Guests must be 19 or older",
    ...overrides,
  };
}

describe("activity creation wizard", () => {
  it("keeps the requested fields in nine focused steps", () => {
    expect(ACTIVITY_CREATE_STEPS).toEqual([
      "category",
      "concept",
      "host",
      "photos",
      "listing",
      "meeting",
      "itinerary",
      "pricing",
      "review",
    ]);
  });

  const validationCases: Array<
    [ActivityCreateStep, Partial<ActivityCreateDraft>, ActivityCreateErrorKey]
  > = [
    ["category", { category: "" }, "categoryRequired"],
    ["concept", { conceptDescription: "" }, "conceptDescriptionRequired"],
    ["host", { qualifications: "" }, "qualificationsRequired"],
    ["photos", { photos: [photo] }, "photosMinimum"],
    ["listing", { experienceName: "" }, "experienceNameRequired"],
    ["meeting", { meetingDetails: "" }, "meetingDetailsRequired"],
    [
      "itinerary",
      { itinerary: [{ ...itinerary, description: "Too short" }] },
      "itineraryDescriptionTooShort",
    ],
    ["pricing", { maxGuests: "0" }, "maxGuestsInvalid"],
    ["pricing", { discountPercent: "101" }, "discountInvalid"],
  ];

  it.each(validationCases)("validates the %s step", (step, overrides, error) => {
    expect(validateActivityCreateStep(step, createCompleteDraft(overrides))).toBe(error);
  });

  it("accepts a complete draft and clamps step navigation", () => {
    const draft = createCompleteDraft();

    for (const step of ACTIVITY_CREATE_STEPS) {
      expect(validateActivityCreateStep(step, draft)).toBeNull();
    }
    expect(getPreviousActivityCreateStep("category")).toBe("category");
    expect(getNextActivityCreateStep("review")).toBe("review");
  });
});
