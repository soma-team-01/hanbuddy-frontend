import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPublicActivities, getPublicActivity, PublicActivityError } from "./public-activities";

vi.mock("server-only", () => ({}));

const activity = {
  activityId: 42,
  buddyId: 7,
  title: "Public walk",
  description: "Walk with a buddy.",
  totalDurationMinutes: 90,
  thumbnailImageUrl: "/images/activities/hanok-hero.jpg",
  buddyName: "Public host",
  buddyProfileImageUrl: null,
  meetingPlaceId: "place",
  meetingPointName: "Station",
  price: 45000,
  currency: "KRW",
  contentLanguage: "EN",
  includedItems: ["Guide"],
  restrictionNotes: [],
  images: [],
  schedules: [],
};
const fetchMock = vi.fn<typeof fetch>();
function respond(result: unknown, status = 200) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(result), { status }));
}
function success(result: unknown) {
  return { isSuccess: true, code: "SUCCESS", message: "OK", result };
}

beforeEach(() => {
  vi.stubEnv("HANBUDDY_API_BASE_URL", "http://fixture.invalid");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("anonymous public activity documents", () => {
  it.each([
    { averageRating: "4.8" },
    { reviewCount: "1" },
    { isSoldOut: "false" },
    { discountedPrice: "40000" },
    { discountPercent: true },
    { discountEndDate: 20260101 },
    { meetingLatitude: "37" },
    { contentLanguage: "en" },
  ])(
    "rejects optional DTO fields with invalid scalar types before metadata or sitemap use",
    async (invalid) => {
      respond(success({ ...activity, ...invalid }));
      await expect(getPublicActivity("42", "en")).rejects.toMatchObject({ kind: "unavailable" });
    },
  );

  it("requests EN and the existing display currency without session forwarding or persistent caching", async () => {
    respond(success([activity]));
    const result = await getPublicActivities("en");
    expect(result[0].title).toBe("Public walk");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://fixture.invalid/activities?language=EN&displayCurrency=USD");
    expect(init?.cache).toBe("no-store");
    expect(init?.redirect).toBe("error");
    expect(new Headers(init?.headers).get("Authorization")).toBeNull();
    expect(new Headers(init?.headers).get("Cookie")).toBeNull();
  });
  it("only serializes public contract fields, including nested records", async () => {
    respond(
      success({
        ...activity,
        email: "PRIVATE_SENTINEL",
        accessToken: "PRIVATE_SENTINEL",
        images: [{ imageUrl: "/image.jpg", imageOrder: 0, privateNote: "PRIVATE_SENTINEL" }],
        schedules: [
          {
            activityScheduleId: 1,
            startAt: "2030-01-01T10:00:00+09:00",
            remainingCapacity: 3,
            status: "OPEN",
            privateNote: "PRIVATE_SENTINEL",
          },
        ],
      }),
    );
    const result = await getPublicActivity("42", "en");
    expect(result.images[0]).toEqual({ imageUrl: "/image.jpg", imageOrder: 0 });
    expect(JSON.stringify(result)).not.toContain("PRIVATE_SENTINEL");
  });
  it.each([404, 410])("classifies confirmed missing/deleted status %s", async (status) => {
    respond({ isSuccess: false, code: "ACTIVITY404", message: "absent" }, status);
    await expect(getPublicActivity("42", "en")).rejects.toMatchObject({ kind: "missing" });
  });
  it.each([401, 403, 429, 500, 502, 504])(
    "never treats upstream %s as deletion",
    async (status) => {
      respond({ isSuccess: false, code: "ERROR", message: "PRIVATE_SENTINEL" }, status);
      await expect(getPublicActivity("42", "en")).rejects.toMatchObject({
        kind: "unavailable",
        message: "Public activities unavailable",
      });
    },
  );
  it("does not interpret a generic upstream route 404 as an activity deletion", async () => {
    respond({ isSuccess: false, code: "ROUTE404", message: "unknown route" }, 404);
    await expect(getPublicActivity("42", "en")).rejects.toMatchObject({ kind: "unavailable" });
  });
  it("retains ended resources without inventing an availability policy", async () => {
    respond(
      success({
        ...activity,
        isSoldOut: true,
        schedules: [
          {
            activityScheduleId: 1,
            startAt: "2020-01-01T10:00:00+09:00",
            remainingCapacity: 0,
            status: "CLOSED",
          },
        ],
      }),
    );
    const result = await getPublicActivity("42", "en");
    expect(result.activityId).toBe(42);
    expect(result.schedules[0].status).toBe("CLOSED");
  });
  it.each([
    null,
    {},
    { ...activity, activityId: 43 },
    { ...activity, images: null },
    { ...activity, title: null },
  ])("rejects malformed or mismatched detail data", async (result) => {
    respond(success(result));
    await expect(getPublicActivity("42", "en")).rejects.toBeInstanceOf(PublicActivityError);
  });
  it("rejects malformed list data", async () => {
    respond(success({ content: [] }));
    await expect(getPublicActivities("en")).rejects.toMatchObject({ kind: "unavailable" });
  });
  it("recovers on a subsequent request after a transport failure", async () => {
    fetchMock.mockRejectedValueOnce(new Error("PRIVATE_SENTINEL"));
    await expect(getPublicActivity("42", "en")).rejects.toMatchObject({ kind: "unavailable" });
    respond(success(activity));
    expect((await getPublicActivity("42", "en")).title).toBe("Public walk");
  });
});
