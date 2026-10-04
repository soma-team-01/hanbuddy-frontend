import { expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { ReferralActivityPreview } from "./referral-activity-preview";
import { getAdminReferralActivity } from "@/lib/api/referral";
import { getReferralActivityOwner } from "@/lib/api/referral-reporting";
import { ActivityDetailView } from "@/components/activity/ActivityDetailView";
import type { MyActivityDetailResponse } from "@/types/buddy";
vi.mock("@/lib/api/referral", () => ({ getAdminReferralActivity: vi.fn() }));
vi.mock("@/lib/api/referral-reporting", () => ({ getReferralActivityOwner: vi.fn() }));
vi.mock("@/components/activity/ActivityDetailView", () => ({
  ActivityDetailView: vi.fn(() => <div>활동 본문</div>),
}));
it("previews the registered activity with its actual owner and no edit controls", async () => {
  vi.mocked(getAdminReferralActivity).mockResolvedValue({
    status: "success",
    data: {
      activityId: 42,
      activityType: "REFERRAL",
      title: "서울 공방",
      images: [],
      schedules: [],
      itineraries: [],
      includedItems: [],
      restrictionNotes: [],
      hostIntroduction: "공방 소개",
      discountedPrice: null,
    } as unknown as MyActivityDetailResponse,
  });
  vi.mocked(getReferralActivityOwner).mockResolvedValue({
    partnerUserId: 7,
    partnerName: "공방 버디",
    activity: { activityId: 42 } as MyActivityDetailResponse,
  });
  renderWithQueryClient(<ReferralActivityPreview activityId={42} />, { locale: "ko" });
  await screen.findByText("활동 본문");
  expect(vi.mocked(ActivityDetailView).mock.lastCall?.[0]).toMatchObject({
    preview: true,
    bottomBar: "inline",
    activity: { title: "서울 공방", activityType: "REFERRAL", host: { id: 7, name: "공방 버디" } },
  });
  expect(screen.getByRole("link", { name: /신청 현황/ })).toHaveAttribute(
    "href",
    "/admin/referrals?activityId=42",
  );
  expect(screen.queryByRole("button", { name: "활동 수정" })).not.toBeInTheDocument();
});
