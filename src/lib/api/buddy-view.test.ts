import { describe, expect, it } from "vitest";
import {
  DEFAULT_ACTIVITY_THUMBNAIL,
  formatApplicantContact,
  formatNationalityCode,
  getActivityThumbnail,
  getMyActivityStatusLabel,
} from "./buddy-view";
import type { BuddyApplicationApplicantSummaryResponse } from "@/types/buddy";

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
  });

  it("formats applicant nationality and contact details", () => {
    expect(formatNationalityCode("FR")).toBe("France");
    expect(formatApplicantContact(applicant)).toBe("WhatsApp +33 612345678");
  });

  it("falls back gracefully for unknown nationality and missing country code", () => {
    expect(formatNationalityCode("XX")).toBe("XX");
    expect(
      formatApplicantContact({
        ...applicant,
        applicantContactMethod: "LINE",
        applicantContactCountryCode: null,
        applicantContactIdentifier: "sophie.line",
      }),
    ).toBe("Line sophie.line");
  });
});
