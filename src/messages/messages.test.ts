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
});
