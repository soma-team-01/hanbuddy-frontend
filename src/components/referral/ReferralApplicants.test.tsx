import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { getReferralApplicants } from "@/lib/api/referral";
import { ReferralApplicants } from "./ReferralApplicants";
vi.mock("@/lib/api/referral", () => ({ getReferralApplicants: vi.fn() }));
describe("referral applicant reporting", () => {
  beforeEach(() => {
    vi.mocked(getReferralApplicants)
      .mockReset()
      .mockResolvedValue({
        status: "success",
        data: {
          content: [
            {
              applicationId: 8,
              activityId: 3,
              activityTitle: "서울 공방 방문",
              partnerUserId: 7,
              applicantUserId: 4,
              applicantName: "신청 당시 이름",
              contactMethod: "WHATSAPP",
              contactCountryCode: "+82",
              contactIdentifier: "1012345678",
              status: "CONFIRMED",
              createdAt: "2026-10-01T10:00:00+09:00",
              consentVersion: "live-v2",
              consentedAt: "2026-10-01T10:00:00+09:00",
              scheduleId: 12,
              startAt: "2026-10-10T14:00:00+09:00",
              guestCount: 3,
            },
          ],
          page: 0,
          size: 20,
          totalElements: 42,
          totalPages: 3,
          hasNext: true,
        },
      });
  });
  it("counts applications rather than guests and displays the contact snapshot", async () => {
    renderWithQueryClient(<ReferralApplicants admin />, { locale: "ko" });
    expect(await screen.findByText("신청 당시 이름")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /신청 42건/ })).toBeInTheDocument();
    expect(screen.getByText(/WHATSAPP · \+82 1012345678/)).toBeInTheDocument();
    expect(screen.queryByText("동의 기록 · 신청 당시 정보")).not.toBeInTheDocument();
    expect(screen.queryByText(/live-v2|신청 번호 #8/)).not.toBeInTheDocument();
    expect(vi.mocked(getReferralApplicants).mock.calls[0][0]).toBe(true);
    expect(vi.mocked(getReferralApplicants).mock.calls[0][1].get("status")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "다음 페이지" }));
    await waitFor(() =>
      expect(vi.mocked(getReferralApplicants).mock.lastCall?.[1].get("page")).toBe("1"),
    );
  });
  it("uses creation-date filters, permits explicit all-status selection, and resets pagination", async () => {
    renderWithQueryClient(<ReferralApplicants />, { locale: "ko" });
    await screen.findByText("신청 당시 이름");
    expect(screen.getByText("동의 기록 · 신청 당시 정보")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("신청 상태"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("신청일 시작 (한국 시간)"), {
      target: { value: "2026-10-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() =>
      expect(vi.mocked(getReferralApplicants).mock.lastCall?.[1].get("from")).toBe("2026-10-01"),
    );
    expect(vi.mocked(getReferralApplicants).mock.lastCall?.[1].has("status")).toBe(false);
    expect(vi.mocked(getReferralApplicants).mock.lastCall?.[1].has("buddyId")).toBe(false);
  });
});
