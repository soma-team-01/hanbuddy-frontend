import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { ApplicantProfileDialog } from "./ApplicantProfileDialog";

vi.mock("@/components/chat/StartChatButton", () => ({ StartChatButton: () => null }));
vi.mock("@/components/activity/CancellationReasonText", () => ({
  CancellationReasonText: ({ originalText }: { originalText: string }) => (
    <span>{originalText}</span>
  ),
}));

const applicant = {
  applicationId: 1,
  applicantUserId: 2,
  applicantName: "Sophie",
  applicantProfileImageUrl: null,
  applicantNationalityCode: "FR",
  guestCount: 2,
  applicantContactMethod: "WHATSAPP" as const,
  applicantContactCountryCode: "+33",
  applicantContactIdentifier: "123456789",
  appliedAt: "2026-10-13T13:30:00+09:00",
  cancelledAt: "2026-10-13T14:51:00+09:00",
};

describe("ApplicantProfileDialog", () => {
  it("enlarges an applicant photo while retaining their profile", () => {
    const onClose = vi.fn();
    renderWithQueryClient(
      <ApplicantProfileDialog
        applicant={{ ...applicant, applicantProfileImageUrl: "/profile.jpg" }}
        locale="en"
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Enlarge photo: Sophie" }));
    const dialogs = screen.getAllByRole("dialog");
    expect(dialogs).toHaveLength(2);
    fireEvent.click(within(dialogs[1]).getByRole("button", { name: "Close dialog" }));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(onClose).not.toHaveBeenCalled();
  });
  it.each([
    ["CANCELLED", "OTHER", "취소됨"],
    ["REJECTED", "BUDDY_OTHER", "거절"],
  ] as const)(
    "shows %s contact and translated reason above timestamps in the dialog",
    (status, cancellationReason, label) => {
      renderWithQueryClient(
        <ApplicantProfileDialog
          applicant={{
            ...applicant,
            status,
            cancellationReason,
            cancellationDetail: "Changed travel plans",
          }}
          locale="ko"
          onClose={vi.fn()}
        />,
        { locale: "ko" },
      );
      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText("WhatsApp")).toBeVisible();
      expect(within(dialog).getByText("+33 123456789")).toBeVisible();
      expect(within(dialog).getByText(label)).toBeVisible();
      const reason = within(dialog).getByText("Changed travel plans");
      expect(reason).toBeVisible();
      expect(
        reason.compareDocumentPosition(within(dialog).getByText(/신청 시각:/)) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    },
  );
  it.each([
    ["CONFIRMED", null],
    ["CANCELLED", "취소 시각"],
    ["SUPERSEDED", null],
    ["REJECTED", "거절 시각"],
    ["EXPIRED", "자동 만료 시각"],
  ] as const)("shows accurate application timestamps for %s", (status, label) => {
    const close = vi.fn();
    renderWithQueryClient(
      <ApplicantProfileDialog applicant={{ ...applicant, status }} locale="ko" onClose={close} />,
      { locale: "ko" },
    );
    const dialog = screen.getByRole("dialog", { name: "Sophie" });
    expect(within(dialog).getByText("신청 시각: 2026. 10. 13. 오후 1:30")).toBeVisible();
    if (label) expect(within(dialog).getByText(`${label}: 2026. 10. 13. 오후 2:51`)).toBeVisible();
    else
      expect(
        within(dialog).queryByText(/취소 시각|거절 시각|자동 만료 시각/),
      ).not.toBeInTheDocument();
    expect(dialog).toHaveClass("max-h-[90dvh]", "overflow-y-auto");
    fireEvent.click(within(dialog).getByRole("button", { name: "대화상자 닫기" }));
    expect(close).toHaveBeenCalledOnce();
  });

  it("does not label a superseded attempt as a guest cancellation", () => {
    renderWithQueryClient(
      <ApplicantProfileDialog
        applicant={{
          ...applicant,
          status: "SUPERSEDED",
          cancellationReason: "OTHER",
          cancellationDetail: "Old attempt",
        }}
        locale="ko"
        onClose={vi.fn()}
      />,
      { locale: "ko" },
    );
    expect(screen.queryByText("취소됨")).not.toBeInTheDocument();
    expect(screen.queryByText("Old attempt")).not.toBeInTheDocument();
    expect(screen.queryByText(/취소 시각:/)).not.toBeInTheDocument();
  });

  it.each([null, undefined, "invalid"])(
    "omits unavailable timestamps (%s) without using other dates",
    (value) => {
      renderWithQueryClient(
        <ApplicantProfileDialog
          applicant={{
            ...applicant,
            status: "REJECTED",
            appliedAt: value ?? undefined,
            cancelledAt: value,
          }}
          locale="ko"
          onClose={vi.fn()}
        />,
        { locale: "ko" },
      );
      expect(
        screen.queryByText(/신청 시각|취소 시각|거절 시각|자동 만료 시각/),
      ).not.toBeInTheDocument();
    },
  );
});
