import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { AccountStatusContent } from "./AccountStatusContent";

describe("AccountStatusContent", () => {
  it("shows the review timeline and support contact for pending buddy approval", () => {
    renderWithIntl(<AccountStatusContent status="PENDING_APPROVAL" userType="BUDDY" />);

    expect(
      screen.getByRole("heading", { name: "Buddy application under review" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Usually 1–3 business days")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "contact@hanbuddy.kr" })).toHaveAttribute(
      "href",
      "mailto:contact@hanbuddy.kr",
    );
    expect(screen.getByRole("link", { name: "Back to buddy page" })).toHaveAttribute(
      "href",
      "/en/buddy",
    );
    expect(screen.queryByText("Email HanBuddy")).not.toBeInTheDocument();
  });

  it("shows a rejection reason supplied by the backend", () => {
    renderWithIntl(
      <AccountStatusContent
        status="REJECTED"
        reason="The submitted hosting information could not be verified."
        userType="BUDDY"
      />,
    );

    expect(screen.getByText("Reason provided")).toBeInTheDocument();
    expect(
      screen.getByText("The submitted hosting information could not be verified."),
    ).toBeInTheDocument();
  });

  it("localizes the suspended account guidance in Korean", () => {
    renderWithIntl(<AccountStatusContent status="SUSPENDED" userType="BUDDY" />, {
      locale: "ko",
    });

    expect(screen.getByRole("heading", { name: "버디 계정 이용 정지" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "버디 페이지로 돌아가기" })).toHaveAttribute(
      "href",
      "/ko/buddy",
    );
  });

  it("shows tourist-specific suspended account guidance", () => {
    renderWithIntl(<AccountStatusContent status="SUSPENDED" userType="TOURIST" />, {
      locale: "ko",
    });

    expect(screen.getByRole("heading", { name: "관광객 계정 이용 정지" })).toBeInTheDocument();
    expect(
      screen.getByText("HanBuddy 서비스를 이용할 수 없습니다.", { exact: false }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "홈으로 돌아가기" })).toHaveAttribute("href", "/ko");
  });
});
