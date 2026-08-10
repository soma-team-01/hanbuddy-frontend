import { describe, expect, it } from "vitest";
import { getSeoulNowParts } from "@/lib/datetime";
import type { MyActivityDetailResponse } from "@/types/buddy";
import {
  ACTIVITY_CREATE_STEPS,
  EMPTY_ACTIVITY_DRAFT,
  buildDraftFromMyActivityDetail,
  getNextActivityCreateStep,
  getPreviousActivityCreateStep,
  isPastSchedule,
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

/** Asia/Seoul 기준 offsetDays 뒤의 날짜 키 (테스트가 실제 날짜에 좌우되지 않도록 동적으로 계산) */
function seoulDateKey(offsetDays: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
    new Date(Date.now() + offsetDays * 86_400_000),
  );
}

const futureDateA = seoulDateKey(7);
const futureDateB = seoulDateKey(14);

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
      { id: `schedule-${futureDateA}`, date: futureDateA, startTime: "10:00" },
      { id: `schedule-${futureDateB}`, date: futureDateB, startTime: "14:00" },
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
      { schedules: [{ id: `schedule-${futureDateA}`, date: futureDateA, startTime: "" }] },
      "scheduleInvalid",
    ],
    [
      "schedule",
      { schedules: [{ id: "schedule-2020-01-01", date: "2020-01-01", startTime: "10:00" }] },
      "scheduleInPast",
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

  it("rejects a start time that has already passed today in Asia/Seoul", () => {
    const now = getSeoulNowParts();
    const draft = createCompleteDraft({
      schedules: [{ id: `schedule-${now.date}`, date: now.date, startTime: "00:00" }],
    });

    expect(validateActivityCreateStep("schedule", draft)).toBe("scheduleInPast");
  });

  it("judges past schedules against an Asia/Seoul reference time", () => {
    const reference = { date: "2026-08-07", time: "11:30" };

    expect(isPastSchedule({ date: "2026-08-06", startTime: "23:00" }, reference)).toBe(true);
    expect(isPastSchedule({ date: "2026-08-07", startTime: "11:30" }, reference)).toBe(true);
    expect(isPastSchedule({ date: "2026-08-07", startTime: "11:31" }, reference)).toBe(false);
    expect(isPastSchedule({ date: "2026-08-08", startTime: "00:00" }, reference)).toBe(false);
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

  describe("buildDraftFromMyActivityDetail", () => {
    const detail: MyActivityDetailResponse = {
      activityId: 42,
      title: "Seoul market walk",
      description: "Meet local vendors and taste a neighborhood breakfast together.",
      thumbnailImageUrl: "https://cdn.example.test/activities/cover.webp",
      status: "ACTIVE",
      hostIntroduction: "I have guided friends through this market for years.",
      includedItems: ["Equipment rental", "Breakfast tasting"],
      restrictionNotes: ["Not suitable for guests with shellfish allergies"],
      maxCapacity: 4,
      price: 50000,
      currency: "KRW",
      discountPercent: null,
      discountEndDate: null,
      discountedPrice: null,
      meetingPointName: "Gwangjang Market Gate 2",
      meetingPlaceId: "ChIJ-gwangjang",
      images: [
        { imageUrl: "https://cdn.example.test/activities/two.webp", imageOrder: 1 },
        { imageUrl: "https://cdn.example.test/activities/cover.webp", imageOrder: 0 },
      ],
      schedules: [
        {
          scheduleId: 7,
          startAt: `${futureDateA}T10:00:00+09:00`,
          bookedCount: 2,
          status: "OPEN",
        },
        {
          scheduleId: 8,
          startAt: "2020-01-01T10:00:00+09:00",
          bookedCount: 0,
          status: "CLOSED",
        },
      ],
      itineraries: [
        {
          itineraryId: 9,
          title: "Meet market vendors",
          description: "Taste three breakfast dishes with local vendors.",
          durationMinutes: 60,
          imageUrl: "https://cdn.example.test/activities/itinerary.webp",
          itemOrder: 0,
        },
      ],
    };

    it("keeps past schedules out of editing but remembers them for submission", () => {
      const draft = buildDraftFromMyActivityDetail(detail);

      // 편집 목록에는 미래 일정만 남는다 (과거 일정 금지 검증과 충돌하므로)
      expect(draft.schedules.map((schedule) => schedule.date)).toEqual([futureDateA]);
      // 지난 일정을 빼고 제출하면 백엔드가 삭제로 보고 신청 내역이 있으면 거절한다
      expect(draft.retainedScheduleStartAts).toEqual(["2020-01-01T10:00:00+09:00"]);
    });

    it("prefills the draft from the detail response with reusable image keys", () => {
      const draft = buildDraftFromMyActivityDetail(detail);

      expect(draft.experienceName).toBe("Seoul market walk");
      expect(draft.hostIntroduction).toBe("I have guided friends through this market for years.");
      expect(draft.photos.map((photoDraft) => photoDraft.previewUrl)).toEqual([
        "https://cdn.example.test/activities/cover.webp",
        "https://cdn.example.test/activities/two.webp",
      ]);
      expect(draft.photos.map((photoDraft) => photoDraft.existingKey)).toEqual([
        "activities/cover.webp",
        "activities/two.webp",
      ]);
      expect(draft.photos.every((photoDraft) => photoDraft.file === null)).toBe(true);
      expect(draft.itinerary).toHaveLength(1);
      expect(draft.itinerary[0]).toMatchObject({
        title: "Meet market vendors",
        durationMinutes: "60",
      });
      expect(draft.itinerary[0].photo).toMatchObject({
        file: null,
        existingKey: "activities/itinerary.webp",
      });
      expect(draft.meetingPlace).toBe("Gwangjang Market Gate 2");
      expect(draft.meetingPlaceId).toBe("ChIJ-gwangjang");
      expect(draft.meetingAddress).toBe("Gwangjang Market Gate 2");
      expect(draft.maxGuests).toBe("4");
      expect(draft.pricePerPerson).toBe("50000");
      expect(draft.inclusions).toBe("Equipment rental\nBreakfast tasting");
      expect(draft.restrictions).toBe("Not suitable for guests with shellfish allergies");
      expect(draft.hasNoRestrictions).toBe(false);
      expect(draft.discountType).toBe("none");
    });

    it("keeps future schedules only, so past ones cannot block editing", () => {
      const draft = buildDraftFromMyActivityDetail(detail);

      expect(draft.schedules).toEqual([
        {
          id: "existing-schedule-7",
          date: futureDateA,
          startTime: "10:00",
        },
      ]);
      expect(validateActivityCreateStep("schedule", draft)).toBeNull();
    });

    it("prefills a running discount but drops an expired one", () => {
      const running = buildDraftFromMyActivityDetail({
        ...detail,
        discountPercent: 20,
        discountEndDate: "2099-12-31",
        discountedPrice: 40000,
      });
      expect(running.discountType).toBe("limited");
      expect(running.discountPercent).toBe("20");
      expect(running.discountEndsAt).toBe("2099-12-31");

      const expired = buildDraftFromMyActivityDetail({
        ...detail,
        discountPercent: 20,
        discountEndDate: "2020-01-01",
        discountedPrice: null,
      });
      expect(expired.discountType).toBe("none");
      expect(expired.discountPercent).toBe("");
      expect(expired.discountEndsAt).toBe("");
    });

    it("marks no-restrictions when the detail has none", () => {
      const draft = buildDraftFromMyActivityDetail({ ...detail, restrictionNotes: [] });

      expect(draft.restrictions).toBe("");
      expect(draft.hasNoRestrictions).toBe(true);
    });
  });
});
