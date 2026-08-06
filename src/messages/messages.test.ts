import { isStructurallySame, parse } from "@formatjs/icu-messageformat-parser";
import { describe, expect, it } from "vitest";
import en from "./en.json";
import ko from "./ko.json";

function flatten(value: unknown, prefix = ""): Record<string, string> {
  if (typeof value === "string") return { [prefix]: value };
  if (!value || typeof value !== "object") throw new TypeError(`Invalid message at ${prefix}`);

  return Object.entries(value).reduce<Record<string, string>>(
    (messages, [key, child]) => ({
      ...messages,
      ...flatten(child, prefix ? `${prefix}.${key}` : key),
    }),
    {},
  );
}

describe("locale messages", () => {
  it("keeps the Korean key contract identical to English", () => {
    expect(Object.keys(flatten(ko)).sort()).toEqual(Object.keys(flatten(en)).sort());
  });

  it.each([
    ["en", flatten(en)],
    ["ko", flatten(ko)],
  ] as const)("contains non-empty valid ICU messages for %s", (_, messages) => {
    for (const [key, message] of Object.entries(messages)) {
      expect(message.trim(), key).not.toBe("");
      expect(() => parse(message), key).not.toThrow();
    }
  });

  it("keeps ICU argument names and types identical across locales", () => {
    const english = flatten(en);
    const korean = flatten(ko);

    for (const [key, englishMessage] of Object.entries(english)) {
      const comparison = isStructurallySame(parse(englishMessage), parse(korean[key]));
      const detail = comparison.error?.message ?? "ICU mismatch";
      expect(comparison.success, `${key}: ${detail}`).toBe(true);
    }
  });

  it("contains the complete Tourist message contract", () => {
    const requiredKeys = [
      "Explore.loading",
      "Explore.empty",
      "Explore.loadError",
      "ActivityDetail.loading",
      "ActivityDetail.loadError",
      "ActivityDetail.notFound",
      "ActivityDetail.perPerson",
      "ActivityDetail.bookNow",
      "ActivityDetail.included",
      "ActivityDetail.cannotJoin",
      "ActivityDetail.availability",
      "ActivityDetail.remaining",
      "ActivityDetail.meetingPoint",
      "ActivityDetail.mapUnavailable",
      "ActivityDetail.mapTitle",
      "ActivityDetail.kstNotice",
      "Booking.loading",
      "Booking.dateTime",
      "Booking.guests",
      "Booking.decreaseGuests",
      "Booking.increaseGuests",
      "Booking.specialRequest",
      "Booking.priceDetails",
      "Booking.subtotal",
      "Booking.totalKrw",
      "Booking.refundPolicy",
      "Booking.agreement",
      "Booking.submit",
      "Booking.choosePaymentMethod",
      "Booking.processing",
      "Booking.kstNotice",
      "Booking.scheduleRequired",
      "Applications.title",
      "Applications.upcoming",
      "Applications.past",
      "Applications.loading",
      "Applications.empty",
      "Applications.paidWithPayPal",
      "Applications.total",
      "Applications.continuePayment",
      "Applications.cancel",
      "Applications.cancellationTitle",
      "Applications.cancellationPrompt",
      "Applications.cancellationReasons.scheduleConflict",
      "Applications.cancellationReasons.illness",
      "Applications.cancellationReasons.foundOther",
      "Applications.cancellationReasons.other",
      "Payment.complete",
      "Payment.confirmed",
      "Payment.totalApplicationAmount",
      "Payment.paidWithPayPal",
      "Payment.paypalUsdNotice",
      "Payment.loading",
    ];

    for (const [locale, messages] of [
      ["en", flatten(en)],
      ["ko", flatten(ko)],
    ] as const) {
      for (const key of requiredKeys) {
        expect(messages[key], `${locale}:${key}`).toBeTypeOf("string");
      }
    }
  });

  it("uses ICU variables and plurals for Tourist amounts and counts", () => {
    for (const messages of [en, ko]) {
      expect(messages.ActivityDetail.perPerson).toContain("{price}");
      expect(messages.ActivityDetail.remaining).toContain("plural");
      expect(messages.Booking.guests).toContain("plural");
      expect(messages.Booking.subtotal).toContain("plural");
      expect(messages.Booking.totalKrw).toContain("{amount}");
      expect(messages.Applications.paidWithPayPal).toContain("{amount}");
      expect(messages.Applications.total).toContain("{amount}");
      expect(messages.Payment.totalApplicationAmount).toContain("{amount}");
      expect(messages.Payment.paidWithPayPal).toContain("{amount}");
    }
  });

  it("contains the complete Buddy message contract", () => {
    const requiredKeys = [
      "BuddyDashboard.quickActions",
      "BuddyDashboard.createActivity",
      "BuddyDashboard.upcoming",
      "BuddyDashboard.loadingSchedule",
      "BuddyDashboard.noUpcoming",
      "BuddyDashboard.previousDates",
      "BuddyDashboard.nextDates",
      "BuddyDashboard.scheduleDates",
      "BuddyDashboard.loadingApplicants",
      "BuddyDashboard.applicantCount",
      "MyActivities.title",
      "MyActivities.description",
      "MyActivities.loading",
      "MyActivities.empty",
      "MyActivities.edit",
      "MyActivities.delete",
      "MyActivities.deleteTitle",
      "MyActivities.deleteDescription",
      "MyActivities.deleting",
      "Applicants.loading",
      "Applicants.empty",
      "Applicants.appliedOn",
      "Applicants.confirmedCount",
      "Applicants.pendingCount",
      "Applicants.status.pendingPayment",
      "Applicants.status.confirmed",
      "Applicants.status.cancelled",
      "Applicants.status.completed",
      "CreateActivity.eyebrow",
      "CreateActivity.title",
      "CreateActivity.progress",
      "CreateActivity.progressLabel",
      "CreateActivity.steps.category.title",
      "CreateActivity.steps.category.description",
      "CreateActivity.steps.concept.title",
      "CreateActivity.steps.host.title",
      "CreateActivity.steps.photos.title",
      "CreateActivity.steps.listing.title",
      "CreateActivity.steps.meeting.title",
      "CreateActivity.steps.itinerary.title",
      "CreateActivity.steps.pricing.title",
      "CreateActivity.steps.review.title",
      "CreateActivity.categories.food",
      "CreateActivity.categories.culture",
      "CreateActivity.categories.sports",
      "CreateActivity.categories.nature",
      "CreateActivity.categories.nightlife",
      "CreateActivity.categories.wellness",
      "CreateActivity.fields.conceptTitle",
      "CreateActivity.fields.conceptDescription",
      "CreateActivity.fields.hostIntroduction",
      "CreateActivity.fields.qualifications",
      "CreateActivity.fields.pressHistory",
      "CreateActivity.fields.experienceName",
      "CreateActivity.fields.experienceDescription",
      "CreateActivity.fields.meetingPlace",
      "CreateActivity.fields.meetingDetails",
      "CreateActivity.fields.itineraryTitle",
      "CreateActivity.fields.itineraryDescription",
      "CreateActivity.fields.duration",
      "CreateActivity.fields.itineraryPhoto",
      "CreateActivity.fields.maxGuests",
      "CreateActivity.fields.pricePerPerson",
      "CreateActivity.fields.inclusions",
      "CreateActivity.fields.discount",
      "CreateActivity.fields.restrictions",
      "CreateActivity.photos.label",
      "CreateActivity.photos.upload",
      "CreateActivity.photos.count",
      "CreateActivity.itinerary.add",
      "CreateActivity.itinerary.descriptionCount",
      "CreateActivity.review.apiNotice",
      "CreateActivity.review.itineraryCount",
      "CreateActivity.review.guestCount",
      "CreateActivity.review.priceValue",
      "CreateActivity.actions.back",
      "CreateActivity.actions.next",
      "CreateActivity.actions.finish",
      "CreateActivity.errors.categoryRequired",
      "CreateActivity.errors.conceptTitleRequired",
      "CreateActivity.errors.conceptDescriptionRequired",
      "CreateActivity.errors.hostIntroductionRequired",
      "CreateActivity.errors.qualificationsRequired",
      "CreateActivity.errors.photosMinimum",
      "CreateActivity.errors.experienceNameRequired",
      "CreateActivity.errors.experienceDescriptionRequired",
      "CreateActivity.errors.meetingPlaceRequired",
      "CreateActivity.errors.meetingDetailsRequired",
      "CreateActivity.errors.itineraryRequired",
      "CreateActivity.errors.itineraryTitleRequired",
      "CreateActivity.errors.itineraryDescriptionTooShort",
      "CreateActivity.errors.itineraryDurationInvalid",
      "CreateActivity.errors.itineraryPhotoRequired",
      "CreateActivity.errors.maxGuestsInvalid",
      "CreateActivity.errors.priceInvalid",
      "CreateActivity.errors.inclusionsRequired",
      "CreateActivity.errors.restrictionsRequired",
      "CreateActivity.errors.discountInvalid",
    ];

    for (const [locale, messages] of [
      ["en", flatten(en)],
      ["ko", flatten(ko)],
    ] as const) {
      for (const key of requiredKeys) {
        expect(messages[key], `${locale}:${key}`).toBeTypeOf("string");
      }
    }
  });

  it("uses ICU numbers and plurals for Buddy counts and payout values", () => {
    for (const messages of [flatten(en), flatten(ko)]) {
      expect(messages["BuddyDashboard.applicantCount"]).toContain("plural");
      expect(messages["Applicants.confirmedCount"]).toContain("plural");
      expect(messages["Applicants.pendingCount"]).toContain("plural");
      expect(messages["CreateActivity.progress"]).toContain("number");
      expect(messages["CreateActivity.photos.count"]).toContain("plural");
      expect(messages["CreateActivity.itinerary.descriptionCount"]).toContain("plural");
      expect(messages["CreateActivity.review.itineraryCount"]).toContain("plural");
      expect(messages["CreateActivity.review.guestCount"]).toContain("plural");
      expect(messages["CreateActivity.review.priceValue"]).toContain("number");
    }
  });
});
