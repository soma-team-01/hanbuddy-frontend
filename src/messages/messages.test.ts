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
      "Explore.perPersonLabel",
      "Explore.durationHours",
      "Explore.durationMinutes",
      "Explore.discountBadge",
      "Explore.soldOut",
      "ActivityDetail.loading",
      "ActivityDetail.loadError",
      "ActivityDetail.notFound",
      "ActivityDetail.perPerson",
      "ActivityDetail.bookNow",
      "ActivityDetail.included",
      "ActivityDetail.cannotJoin",
      "ActivityDetail.availability",
      "ActivityDetail.remaining",
      "ActivityDetail.weatherAttribution",
      "ActivityDetail.weatherTemperatureRange",
      "ActivityDetail.weatherRainChance",
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
      "Booking.processing",
      "Booking.kstNotice",
      "Booking.scheduleRequired",
      "Applications.title",
      "Applications.upcoming",
      "Applications.past",
      "Applications.loading",
      "Applications.empty",
      "Applications.paidAmount",
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
      "Payment.paidAmount",
      "Payment.confirming",
      "Payment.failTitle",
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
      // 신청 가격 상세는 라벨과 금액을 각 칸에 따로 두므로 문구에 금액을 끼우지 않는다
      expect(messages.Applications.paidAmount).not.toContain("{");
      expect(messages.Applications.total).not.toContain("{");
      expect(messages.Payment.totalApplicationAmount).toContain("{amount}");
      expect(messages.Payment.paidAmount).toContain("{amount}");
    }
  });

  it("contains the complete Buddy message contract", () => {
    const requiredKeys = [
      "BuddyDashboard.createActivity",
      "Settlement.title",
      "Settlement.expectedThisMonth",
      "BuddyDashboard.previousWeek",
      "BuddyDashboard.nextWeek",
      "BuddyDashboard.openCalendar",
      "BuddyDashboard.today",
      "BuddyDashboard.scheduleDates",
      "BuddyDashboard.loadingApplicants",
      "BuddyDashboard.applicantCount",
      "BuddyDashboard.myActivitiesHeading",
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
      "CreateActivity.steps.host.title",
      "CreateActivity.steps.name.title",
      "CreateActivity.steps.description.title",
      "CreateActivity.steps.photos.title",
      "CreateActivity.steps.itinerary.title",
      "CreateActivity.steps.meeting.title",
      "CreateActivity.steps.schedule.title",
      "CreateActivity.steps.capacity.title",
      "CreateActivity.steps.price.title",
      "CreateActivity.steps.inclusions.title",
      "CreateActivity.steps.discount.title",
      "CreateActivity.steps.restrictions.title",
      "CreateActivity.groups.intro",
      "CreateActivity.groups.activity",
      "CreateActivity.groups.operation",
      "CreateActivity.groups.pricing",
      "CreateActivity.groups.policy",
      "CreateActivity.categories.food",
      "CreateActivity.categories.culture",
      "CreateActivity.categories.sports",
      "CreateActivity.categories.nature",
      "CreateActivity.categories.nightlife",
      "CreateActivity.categories.wellness",
      "CreateActivity.fields.hostIntroduction",
      "CreateActivity.fields.experienceName",
      "CreateActivity.fields.experienceDescription",
      "CreateActivity.fields.meetingAddress",
      "CreateActivity.fields.meetingPlace",
      "CreateActivity.fields.scheduleDate",
      "CreateActivity.fields.scheduleStartTime",
      "CreateActivity.fields.itineraryTitle",
      "CreateActivity.fields.itineraryDescription",
      "CreateActivity.fields.duration",
      "CreateActivity.fields.itineraryPhoto",
      "CreateActivity.fields.maxGuests",
      "CreateActivity.fields.pricePerPerson",
      "CreateActivity.fields.inclusions",
      "CreateActivity.fields.discount",
      "CreateActivity.fields.discountEndsAt",
      "CreateActivity.fields.restrictions",
      "CreateActivity.hints.hostIntroductionCharacters",
      "CreateActivity.hints.experienceNameCharacters",
      "CreateActivity.hints.experienceDescriptionCharacters",
      "CreateActivity.photos.label",
      "CreateActivity.photos.upload",
      "CreateActivity.photos.count",
      "CreateActivity.photos.cover",
      "CreateActivity.photos.makeCover",
      "CreateActivity.itinerary.add",
      "CreateActivity.itinerary.titleCount",
      "CreateActivity.itinerary.descriptionCount",
      "CreateActivity.itinerary.photoLabel",
      "CreateActivity.itinerary.editor.photoTitle",
      "CreateActivity.itinerary.editor.descriptionTitle",
      "CreateActivity.itinerary.editor.durationTitle",
      "CreateActivity.itinerary.editor.titleTitle",
      "CreateActivity.meeting.searching",
      "CreateActivity.meeting.selecting",
      "CreateActivity.meeting.searchError",
      "CreateActivity.meeting.apiUnavailable",
      "CreateActivity.meeting.mapTitle",
      "CreateActivity.schedule.notice",
      "CreateActivity.schedule.calendarLabel",
      "CreateActivity.schedule.previousMonth",
      "CreateActivity.schedule.nextMonth",
      "CreateActivity.schedule.selectDate",
      "CreateActivity.schedule.editDate",
      "CreateActivity.schedule.selectedTitle",
      "CreateActivity.schedule.selectedCount",
      "CreateActivity.schedule.sessionCount",
      "CreateActivity.schedule.empty",
      "CreateActivity.schedule.editingDate",
      "CreateActivity.schedule.customTime",
      "CreateActivity.schedule.addTime",
      "CreateActivity.schedule.addedTimes",
      "CreateActivity.schedule.noTimes",
      "CreateActivity.schedule.removeTime",
      "CreateActivity.schedule.applyDateTimesToAll",
      "CreateActivity.schedule.removeDate",
      "CreateActivity.capacity.decrease",
      "CreateActivity.capacity.increase",
      "CreateActivity.capacity.guests",
      "CreateActivity.price.notice",
      "CreateActivity.inclusions.custom",
      "CreateActivity.inclusions.customHint",
      "CreateActivity.inclusions.add",
      "CreateActivity.inclusions.remove",
      "CreateActivity.inclusions.options.tickets",
      "CreateActivity.inclusions.options.meal",
      "CreateActivity.inclusions.options.snacks",
      "CreateActivity.inclusions.options.drinks",
      "CreateActivity.inclusions.options.transport",
      "CreateActivity.inclusions.options.parking",
      "CreateActivity.inclusions.options.equipment",
      "CreateActivity.inclusions.options.souvenir",
      "CreateActivity.discount.options.none.title",
      "CreateActivity.discount.options.limited.title",
      "CreateActivity.restrictions.add",
      "CreateActivity.restrictions.remove",
      "CreateActivity.review.title",
      "CreateActivity.review.description",
      "CreateActivity.review.hostName",
      "CreateActivity.actions.exit",
      "CreateActivity.actions.back",
      "CreateActivity.actions.next",
      "CreateActivity.actions.finish",
      "CreateActivity.errors.categoryRequired",
      "CreateActivity.errors.hostIntroductionRequired",
      "CreateActivity.errors.photosMinimum",
      "CreateActivity.errors.experienceNameRequired",
      "CreateActivity.errors.experienceDescriptionRequired",
      "CreateActivity.errors.meetingAddressRequired",
      "CreateActivity.errors.meetingPlaceRequired",
      "CreateActivity.errors.scheduleInvalid",
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
      expect(messages["CreateActivity.itinerary.descriptionCount"]).toContain("number");
      // 검토 화면이 게스트 상세 뷰를 재사용하므로 세션 잔여석 문구의 plural 계약을 확인한다
      expect(messages["ActivityDetail.remaining"]).toContain("plural");
    }
  });
});
