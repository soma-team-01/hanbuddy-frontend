import { expect, it } from "vitest";
import { referralNoticeMessage } from "./referral-notice";

it("localizes only the recognized, versioned platform notice", () => {
  expect(
    referralNoticeMessage(
      "referral-v1",
      "serviceNotice",
      "실제 서비스 요금과 예약은 업체 상담 후 별도로 확정됩니다.",
    ),
  ).toBe("notice");
  expect(referralNoticeMessage("referral-v1", "purpose", "업체의 상담 연락 및 신청 확인")).toBe(
    "sharingPurpose",
  );
});
it("preserves new policy versions and custom server text", () => {
  expect(
    referralNoticeMessage("referral-v2", "purpose", "업체의 상담 연락 및 신청 확인"),
  ).toBeNull();
  expect(referralNoticeMessage("referral-v1", "purpose", "A new consent purpose")).toBeNull();
});
