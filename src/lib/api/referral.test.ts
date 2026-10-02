import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createReferralActivity,
  updateReferralActivity,
  submitReferralApplication,
} from "./referral";
import type { ReferralActivityRequest } from "@/types/referral";

const activity: ReferralActivityRequest = {
  sourceLanguage: "EN",
  title: "Seoul pottery workshop",
  description: "Explore pottery techniques with a local studio host.",
  hostIntroduction: "We run a pottery studio in Seoul and welcome first-time visitors.",
  imageKeys: ["one", "two", "three"],
  includedItems: ["Consultation"],
  restrictionNotes: [],
  maxCapacity: 4,
  price: 5000,
  meetingPointName: "Studio entrance",
  meetingPlaceId: "studio",
  status: "ACTIVE",
  schedules: [{ startAt: "2027-01-02T14:00:00+09:00" }],
  itineraries: [
    { title: "Pottery", description: "Meet the studio host", durationMinutes: 60, imageKey: "one" },
  ],
};

describe("referral activity API", () => {
  afterEach(() => vi.unstubAllGlobals());
  it.each([undefined, 7])(
    "sends only explicit reapplication IDs (%s) through the same-origin BFF",
    async (reapplyFromApplicationId) => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            isSuccess: true,
            code: "200",
            message: "OK",
            result: { applicationId: 8, status: "CONFIRMED" },
          }),
          { headers: { "Content-Type": "application/json" } },
        ),
      );
      vi.stubGlobal("fetch", fetchMock);
      const body = {
        activityScheduleId: 12,
        guestCount: 2,
        partnerSharingAgreed: true,
        consentVersion: "v1",
        ...(reapplyFromApplicationId === undefined ? {} : { reapplyFromApplicationId }),
      };
      const result = await submitReferralApplication("3", body);
      expect(result).toMatchObject({ status: "success", data: { applicationId: 8 } });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toBe("/api/activities/3/referral-applications");
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(body);
    },
  );
  it("sends the starting price through the BFF for creation and editing", async () => {
    const fetchMock = vi.fn().mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            isSuccess: true,
            code: "200",
            message: "OK",
            result: { activityId: 42 },
          }),
          { headers: { "Content-Type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    await createReferralActivity("a".repeat(43), activity);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/referral/activities");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ code: "a".repeat(43), activity });
    await updateReferralActivity("42", { ...activity, price: 0 });
    expect(fetchMock.mock.calls[1][0]).toBe("/api/referral/activities/42");
    expect(fetchMock.mock.calls[1][1].method).toBe("PATCH");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ ...activity, price: 0 });
  });
});
