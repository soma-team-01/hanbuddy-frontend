import { describe, expect, it } from "vitest";
import {
  DEFAULT_ACTIVITY_THUMBNAIL,
  formatApplicantContact,
  formatNationalityCode,
  getActivityThumbnail,
  getMyActivityStatusLabel,
  mapMyActivityDetailToPreviewActivity,
} from "./buddy-view";
import type {
  BuddyApplicationApplicantSummaryResponse,
  MyActivityDetailResponse,
} from "@/types/buddy";

const applicant: BuddyApplicationApplicantSummaryResponse = {
  applicationId: 11,
  applicantUserId: 3,
  applicantName: "Sophie Martin",
  applicantProfileImageUrl: null,
  applicantNationalityCode: "FR",
  guestCount: 2,
  applicantContactMethod: "WHATSAPP",
  applicantContactCountryCode: "+33",
  applicantContactIdentifier: "612345678",
};

describe("buddy view helpers", () => {
  it("uses the API thumbnail when present and falls back to a local activity image", () => {
    expect(getActivityThumbnail("https://static.hanbuddy.com/activity.webp")).toBe(
      "https://static.hanbuddy.com/activity.webp",
    );
    expect(getActivityThumbnail(null)).toBe(DEFAULT_ACTIVITY_THUMBNAIL);
  });

  it("formats activity statuses for display", () => {
    expect(getMyActivityStatusLabel("ACTIVE")).toBe("Active");
    expect(getMyActivityStatusLabel("DRAFT")).toBe("Draft");
    expect(getMyActivityStatusLabel("INACTIVE")).toBe("Inactive");
    // soft delete된 활동은 목록에서 빠지지만 상태 계약에는 남아 있다
    expect(getMyActivityStatusLabel("DELETED")).toBe("Deleted");
  });

  it("formats applicant nationality and contact details", () => {
    expect(formatNationalityCode("FR", "en")).toBe("France");
    expect(formatApplicantContact(applicant, "en")).toBe("WhatsApp +33 612345678");
  });

  it("localizes region and phone labels without translating messaging brands", () => {
    expect(formatNationalityCode("FR", "ko")).toBe("프랑스");
    expect(
      formatApplicantContact(
        {
          ...applicant,
          applicantContactMethod: "PHONE",
        },
        "ko",
      ),
    ).toBe("전화 +33 612345678");
    expect(formatApplicantContact(applicant, "ko")).toBe("WhatsApp +33 612345678");
    expect(formatNationalityCode("FR", "ja")).toBe("フランス");
    expect(formatNationalityCode("FR", "zh-Hans")).toBe("法国");
    expect(formatNationalityCode("FR", "zh-Hant")).toBe("法國");
  });

  it("keeps the country code off ID-based messengers", () => {
    // LINE·WeChat은 ID 체계라 국가번호가 의미 없다 — 붙이면 엉뚱한 연락처처럼 보인다
    expect(
      formatApplicantContact(
        { ...applicant, applicantContactMethod: "LINE", applicantContactIdentifier: "sophie_m" },
        "en",
      ),
    ).toBe("Line sophie_m");
    expect(
      formatApplicantContact(
        { ...applicant, applicantContactMethod: "WECHAT", applicantContactIdentifier: "sophie-m" },
        "en",
      ),
    ).toBe("WeChat sophie-m");
  });

  it("falls back gracefully for unknown nationality and missing country code", () => {
    expect(formatNationalityCode("XX", "en")).toBe("XX");
    expect(
      formatApplicantContact(
        {
          ...applicant,
          applicantContactMethod: "LINE",
          applicantContactCountryCode: null,
          applicantContactIdentifier: "sophie.line",
        },
        "en",
      ),
    ).toBe("Line sophie.line");
  });

  describe("mapMyActivityDetailToPreviewActivity", () => {
    const detail: MyActivityDetailResponse = {
      activityId: 42,
      title: "Traditional Tea Tasting",
      description: "Learn Korean tea etiquette with a local buddy.",
      thumbnailImageUrl: "https://static.hanbuddy.com/activities/tea.webp",
      status: "ACTIVE",
      hostIntroduction: "I have hosted tea ceremonies in Insadong for five years.",
      includedItems: ["Tea tasting"],
      restrictionNotes: ["Not recommended for children under 5"],
      maxCapacity: 6,
      price: 45000,
      currency: "KRW",
      discountPercent: 20,
      discountEndDate: "2099-08-31",
      discountedPrice: 36000,
      meetingPointName: "Anguk Station Exit 2",
      meetingPlaceId: "ChIJ-bukchon",
      images: [
        { imageUrl: "https://static.hanbuddy.com/activities/tea-1.webp", imageOrder: 1 },
        { imageUrl: "https://static.hanbuddy.com/activities/tea-0.webp", imageOrder: 0 },
      ],
      schedules: [
        {
          scheduleId: 101,
          startAt: "2099-08-20T10:00:00+09:00",
          bookedCount: 2,
          status: "OPEN",
        },
        {
          scheduleId: 102,
          startAt: "2099-08-21T10:00:00+09:00",
          bookedCount: 1,
          status: "CLOSED",
        },
      ],
      itineraries: [
        {
          itineraryId: 12,
          title: "Tea ceremony",
          description: "Brew and taste Korean green tea.",
          durationMinutes: 50,
          imageUrl: "https://static.hanbuddy.com/activities/ceremony.webp",
          itemOrder: 1,
        },
        {
          itineraryId: 11,
          title: "Meet at Anguk",
          description: "Short welcome and introductions.",
          durationMinutes: 15,
          imageUrl: "https://static.hanbuddy.com/activities/anguk.webp",
          itemOrder: 0,
        },
      ],
    };
    const host = { id: 17, name: "Tea Buddy", avatarUrl: null };

    it("maps the buddy detail to the guest-facing view model", () => {
      const activity = mapMyActivityDetailToPreviewActivity(
        detail,
        "Time unavailable.",
        "en",
        host,
        "Local HanBuddy host",
      );

      expect(activity.id).toBe("42");
      expect(activity.heroImageUrl).toBe("https://static.hanbuddy.com/activities/tea-0.webp");
      expect(activity.price).toBe(36000);
      expect(activity.originalPrice).toBe(45000);
      expect(activity.discountPercent).toBe(20);
      expect(activity.host).toEqual({
        id: 17,
        name: "Tea Buddy",
        bio: "Local HanBuddy host",
        avatarUrl: null,
      });
      expect(activity.hostIntroduction).toBe(
        "I have hosted tea ceremonies in Insadong for five years.",
      );
      expect(activity.itinerary?.map((item) => item.title)).toEqual([
        "Meet at Anguk",
        "Tea ceremony",
      ]);
      // 총 소요시간: 65분 합을 30분 단위로 올림 → 90분
      expect(activity.durationMinutes).toBe(90);
      expect(activity.sessions).toEqual([
        {
          id: "101",
          startAt: "2099-08-20T10:00:00+09:00",
          dateKey: "2099-08-20",
          dateLabel: "Aug 20, 2099",
          timeLabel: "10:00 AM",
          spotsLeft: 4,
        },
        {
          id: "102",
          startAt: "2099-08-21T10:00:00+09:00",
          dateKey: "2099-08-21",
          dateLabel: "Aug 21, 2099",
          timeLabel: "10:00 AM",
          spotsLeft: 0,
        },
      ]);
      expect(activity.isSoldOut).toBe(false);
    });

    it("marks the preview as sold out when every schedule is closed or full", () => {
      const activity = mapMyActivityDetailToPreviewActivity(
        {
          ...detail,
          schedules: [
            {
              scheduleId: 101,
              startAt: "2099-08-20T10:00:00+09:00",
              bookedCount: 6,
              status: "OPEN",
            },
            {
              scheduleId: 102,
              startAt: "2099-08-21T10:00:00+09:00",
              bookedCount: 1,
              status: "CLOSED",
            },
          ],
        },
        "Time unavailable.",
        "en",
        host,
        "Local HanBuddy host",
      );

      expect(activity.sessions.map((session) => session.spotsLeft)).toEqual([0, 0]);
      expect(activity.isSoldOut).toBe(true);
    });
  });
});
