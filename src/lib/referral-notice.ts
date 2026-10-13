/** Translate only known platform copy; never replace an unknown consent policy. */
export function referralNoticeMessage(
  version: string,
  field: "serviceNotice" | "purpose",
  text: string,
): "notice" | "sharingPurpose" | null {
  if (version !== "referral-v1") return null;
  if (
    field === "serviceNotice" &&
    text === "실제 서비스 요금과 예약은 업체 상담 후 별도로 확정됩니다."
  )
    return "notice";
  if (field === "purpose" && text === "업체의 상담 연락 및 신청 확인") return "sharingPurpose";
  return null;
}
