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
    expect(screen.getByText("Version 2026-09-07")).toBeInTheDocument();
    expect(screen.getByText("Data collected")).toBeInTheDocument();
    expect(screen.getByText("Right to refuse and consequences")).toBeInTheDocument();
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

  it("shows buddy-specific collection and review purposes under the common privacy title", () => {
    renderWithIntl(
      <SignupAgreementNoticeDialog
        agreementType="PRIVACY_COLLECTION_USE"
        userType="BUDDY"
        title="Personal information collection and use"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/Buddy application review and results/)).toBeInTheDocument();
    expect(screen.getByText(/operational communication/)).toBeInTheDocument();
    expect(screen.getByText(/phone number for application review/)).toBeInTheDocument();
    expect(screen.getByText("Purpose")).toBeInTheDocument();
    expect(screen.queryByText(/preferred contact method/)).not.toBeInTheDocument();
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
