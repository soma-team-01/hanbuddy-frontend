import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { SignupAgreementNoticeDialog } from "./SignupAgreementNoticeDialog";

describe("SignupAgreementNoticeDialog", () => {
  it("shows the selected agreement notice directly without a separate document link", () => {
    renderWithIntl(
      <SignupAgreementNoticeDialog
        agreementType="PRIVACY_COLLECTION_USE"
        title="Personal information collection and use"
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "Personal information collection and use" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Version 2026-09-06")).toBeInTheDocument();
    expect(screen.getByText("수집 항목")).toBeInTheDocument();
    expect(screen.getByText("거부 권리와 불이익")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText(/전문 보기/)).not.toBeInTheDocument();
  });

  it("renders the full policy content in the dialog when a document is provided", () => {
    renderWithIntl(
      <SignupAgreementNoticeDialog
        agreementType="TERMS_OF_SERVICE"
        title="HanBuddy Terms of Service"
        document={{
          version: "2026-09-06",
          source: "## 제1조 목적\n\n이 약관은 HanBuddy 서비스 이용 조건을 정합니다.",
        }}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "제1조 목적" })).toBeInTheDocument();
    expect(screen.getByText("이 약관은 HanBuddy 서비스 이용 조건을 정합니다.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText(/전문 보기/)).not.toBeInTheDocument();
  });

  it("describes how a buddy must handle a confirmed tourist's contact details", () => {
    renderWithIntl(
      <SignupAgreementNoticeDialog
        agreementType="BUDDY_PROFILE_CONTACT_PROVISION"
        title="Confirmed guest contact use and protection"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("제공 정보")).toBeInTheDocument();
    expect(screen.getByText("이용 목적")).toBeInTheDocument();
    expect(screen.getByText("금지 사항")).toBeInTheDocument();
    expect(screen.getByText("보관·삭제")).toBeInTheDocument();
    expect(
      screen.getByText(/버디의 연락수단과 연락처는 투어리스트에게 제공되지 않습니다/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/버디 닉네임.*선호 연락수단과 연락처/)).not.toBeInTheDocument();
  });

  it("closes from the accessible close control", () => {
    const onClose = vi.fn();
    renderWithIntl(
      <SignupAgreementNoticeDialog
        agreementType="ADULT_CONFIRMATION"
        title="I confirm that I am 19 years or older."
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
