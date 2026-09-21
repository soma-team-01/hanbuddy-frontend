import "server-only";
import { cache } from "react";
import type { Locale } from "@/i18n/routing";
import { getBackend } from "@/lib/auth/backend";
import { getContentLanguage, withContentLanguage } from "@/lib/content-language";
import { getDefaultDisplayCurrency, withDisplayCurrency } from "@/lib/display-currency";
import type { TouristActivityDetail, TouristActivitySummary } from "@/types/activity";
import { isContentLanguage } from "@/types/content-language";

export class PublicActivityError extends Error {
  constructor(readonly kind: "missing" | "unavailable") {
    super(kind === "missing" ? "Public activity not found" : "Public activities unavailable");
    this.name = "PublicActivityError";
  }
}

function unavailable(): never {
  throw new PublicActivityError("unavailable");
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) unavailable();
  return value as Record<string, unknown>;
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) unavailable();
  return value;
}

// Only fields in the public DTO may cross the server/client boundary.
function select(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.fromEntries(
    keys.filter((key) => value[key] !== undefined).map((key) => [key, value[key]]),
  );
}

function requireFields(value: Record<string, unknown>, strings: string[], numbers: string[]) {
  if (strings.some((key) => typeof value[key] !== "string")) unavailable();
  if (numbers.some((key) => typeof value[key] !== "number" || !Number.isFinite(value[key])))
    unavailable();
}

function publicDisplayPrice(value: unknown) {
  const price = record(value);
  requireFields(price, ["currency"], ["price"]);
  if (
    !["KRW", "USD", "JPY", "CNY"].includes(String(price.currency)) ||
    typeof price.estimated !== "boolean" ||
    (price.discountedPrice !== null && typeof price.discountedPrice !== "number") ||
    (price.exchangeRateDate !== null && typeof price.exchangeRateDate !== "string")
  )
    unavailable();
  return select(price, ["price", "discountedPrice", "currency", "exchangeRateDate", "estimated"]);
}

function summary(value: unknown): TouristActivitySummary {
  const item = record(value);
  requireFields(
    item,
    [
      "title",
      "description",
      "thumbnailImageUrl",
      "buddyName",
      "meetingPointName",
      "meetingPlaceId",
      "currency",
    ],
    ["activityId", "buddyId", "totalDurationMinutes", "price"],
  );
  if (
    !Number.isSafeInteger(item.activityId) ||
    Number(item.activityId) <= 0 ||
    !String(item.title).trim()
  )
    unavailable();
  if (item.buddyProfileImageUrl !== null && typeof item.buddyProfileImageUrl !== "string")
    unavailable();
  const result = select(item, [
    "activityId",
    "buddyId",
    "title",
    "description",
    "contentLanguage",
    "averageRating",
    "reviewCount",
    "totalDurationMinutes",
    "thumbnailImageUrl",
    "buddyName",
    "buddyProfileImageUrl",
    "meetingPointName",
    "meetingPlaceId",
    "meetingLatitude",
    "meetingLongitude",
    "price",
    "currency",
    "discountPercent",
    "discountEndDate",
    "discountedPrice",
    "isSoldOut",
  ]);
  const nullableNumbers = [
    "averageRating",
    "reviewCount",
    "meetingLatitude",
    "meetingLongitude",
    "discountPercent",
    "discountedPrice",
  ];
  for (const key of nullableNumbers) {
    const value = item[key];
    if (
      value !== undefined &&
      value !== null &&
      (typeof value !== "number" || !Number.isFinite(value))
    )
      unavailable();
  }
  if (
    item.discountEndDate !== undefined &&
    item.discountEndDate !== null &&
    typeof item.discountEndDate !== "string"
  )
    unavailable();
  if (item.isSoldOut !== undefined && typeof item.isSoldOut !== "boolean") unavailable();
  if (
    item.contentLanguage !== undefined &&
    item.contentLanguage !== "UNKNOWN" &&
    (typeof item.contentLanguage !== "string" || !isContentLanguage(item.contentLanguage))
  )
    unavailable();
  if (item.displayPrice !== undefined) result.displayPrice = publicDisplayPrice(item.displayPrice);
  return result as unknown as TouristActivitySummary;
}

function detail(value: unknown): TouristActivityDetail {
  const item = record(value);
  const result = summary(item);
  const strings = (value: unknown) =>
    array(value).map((entry) => {
      if (typeof entry !== "string") unavailable();
      return entry;
    });
  if (item.hostIntroduction !== undefined && typeof item.hostIntroduction !== "string")
    unavailable();
  if (item.isTranslated !== undefined && typeof item.isTranslated !== "boolean") unavailable();
  return {
    ...result,
    ...(typeof item.isTranslated === "boolean" ? { isTranslated: item.isTranslated } : {}),
    ...(item.hostIntroduction !== undefined
      ? { hostIntroduction: item.hostIntroduction as string }
      : {}),
    includedItems: strings(item.includedItems),
    restrictionNotes: strings(item.restrictionNotes),
    images: array(item.images).map((value) => {
      const image = record(value);
      requireFields(image, ["imageUrl"], ["imageOrder"]);
      return { imageUrl: image.imageUrl as string, imageOrder: image.imageOrder as number };
    }),
    schedules: array(item.schedules).map((value) => {
      const schedule = record(value);
      requireFields(schedule, ["startAt"], ["activityScheduleId", "remainingCapacity"]);
      if (schedule.status !== "OPEN" && schedule.status !== "CLOSED") unavailable();
      return {
        activityScheduleId: schedule.activityScheduleId as number,
        startAt: schedule.startAt as string,
        remainingCapacity: schedule.remainingCapacity as number,
        status: schedule.status,
      };
    }),
    ...(item.itineraries !== undefined
      ? {
          itineraries: array(item.itineraries).map((value) => {
            const entry = record(value);
            requireFields(
              entry,
              ["title", "description", "imageUrl"],
              ["itineraryId", "durationMinutes", "itemOrder"],
            );
            return select(entry, [
              "itineraryId",
              "title",
              "description",
              "imageUrl",
              "durationMinutes",
              "itemOrder",
            ]) as unknown as NonNullable<TouristActivityDetail["itineraries"]>[number];
          }),
        }
      : {}),
  };
}

async function readPublic(path: string, locale: Locale, isDetail: boolean): Promise<unknown> {
  try {
    const backend = await getBackend<unknown>(
      withDisplayCurrency(
        withContentLanguage(path, getContentLanguage(locale)),
        getDefaultDisplayCurrency(locale),
      ),
      { redirect: "error" },
    );
    // Gone confirms a deleted detail even when its body is empty or not an object.
    if (isDetail && backend.status === 410) throw new PublicActivityError("missing");
    const payload = record(backend.payload);
    // A generic upstream 404 can mean a broken API route. Only the activity contract
    // confirms resource absence. Never infer it from a timeout.
    if (isDetail && backend.status === 404 && payload.code === "ACTIVITY404") {
      throw new PublicActivityError("missing");
    }
    if (backend.status !== 200 || payload.isSuccess !== true) unavailable();
    return payload.result;
  } catch (error) {
    if (error instanceof PublicActivityError) throw error;
    unavailable();
  }
}

// React cache deduplicates within this render only. getBackend uses no-store and
// does not receive request headers, cookies or bearer tokens for these public reads.
export const getPublicActivities = cache(async (locale: Locale) =>
  array(await readPublic("/activities", locale, false)).map(summary),
);

export const getPublicActivity = cache(async (id: string, locale: Locale) => {
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id)))
    throw new PublicActivityError("missing");
  const activity = detail(await readPublic(`/activities/${id}`, locale, true));
  if (String(activity.activityId) !== id) unavailable();
  return activity;
});
