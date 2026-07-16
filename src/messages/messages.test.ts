import { parse } from "@formatjs/icu-messageformat-parser";
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
      "CreateActivity.activityTitle",
      "CreateActivity.titlePlaceholder",
      "CreateActivity.description",
      "CreateActivity.descriptionPlaceholder",
      "CreateActivity.activityPhotos",
      "CreateActivity.uploadPhotos",
      "CreateActivity.selectedPhotos",
      "CreateActivity.availability",
      "CreateActivity.availableSchedule",
      "CreateActivity.addTimeSlot",
      "CreateActivity.removeTimeSlot",
      "CreateActivity.maxCapacity",
      "CreateActivity.capacityPlaceholder",
      "CreateActivity.pricePerPerson",
      "CreateActivity.pricePlaceholder",
      "CreateActivity.payoutLoading",
      "CreateActivity.payoutError",
      "CreateActivity.payoutSummary",
      "CreateActivity.meetingPoint",
      "CreateActivity.placeSearch",
      "CreateActivity.placeSearchPlaceholder",
      "CreateActivity.placeResults",
      "CreateActivity.placeSearchLoading",
      "CreateActivity.placeSearchUnavailable",
      "CreateActivity.mapFallback",
      "CreateActivity.meetingPointName",
      "CreateActivity.meetingPointNamePlaceholder",
      "CreateActivity.included",
      "CreateActivity.includedItemPlaceholder",
      "CreateActivity.addIncludedItem",
      "CreateActivity.removeIncludedItem",
      "CreateActivity.restrictions",
      "CreateActivity.restrictionPlaceholder",
      "CreateActivity.addRestriction",
      "CreateActivity.removeRestriction",
      "CreateActivity.previous",
      "CreateActivity.next",
      "CreateActivity.registerActivity",
      "CreateActivity.registerTitle",
      "CreateActivity.registerDescription",
      "CreateActivity.register",
      "CreateActivity.discardTitle",
      "CreateActivity.discardDescription",
      "CreateActivity.discard",
      "CreateActivity.uploadingPhotos",
      "CreateActivity.registering",
      "CreateActivity.kstNotice",
      "CreateActivity.errors.titleRequired",
      "CreateActivity.errors.scheduleRequired",
      "CreateActivity.errors.capacityInvalid",
      "CreateActivity.errors.priceInvalid",
      "CreateActivity.errors.meetingPlaceRequired",
      "CreateActivity.errors.imageUploadFailed",
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
      expect(messages["CreateActivity.capacityPlaceholder"]).toContain("plural");
      expect(messages["CreateActivity.selectedPhotos"]).toContain("plural");
      expect(messages["CreateActivity.includedItemsCount"]).toContain("plural");
      expect(messages["CreateActivity.restrictionsCount"]).toContain("plural");
      expect(messages["CreateActivity.payoutSummary"]).toContain("number");
    }
  });
});
