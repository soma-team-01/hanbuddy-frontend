import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { AccountStatusContent } from "./AccountStatusContent";

describe("AccountStatusContent", () => {
  it("shows the review timeline and support contact for pending buddy approval", () => {
    renderWithIntl(<AccountStatusContent status="PENDING_APPROVAL" />);

    expect(
      screen.getByRole("heading", { name: "Buddy application under review" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Usually 1–3 business days")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "zeroone.soma@gmail.com" })).toHaveAttribute(
      "href",
      "mailto:zeroone.soma@gmail.com",
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
      />,
    );

    expect(screen.getByText("Reason provided")).toBeInTheDocument();
    expect(
      screen.getByText("The submitted hosting information could not be verified."),
    ).toBeInTheDocument();
  });

  it("localizes the suspended account guidance in Korean", () => {
    renderWithIntl(<AccountStatusContent status="SUSPENDED" />, { locale: "ko" });

    expect(screen.getByRole("heading", { name: "버디 계정 이용 정지" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "버디 페이지로 돌아가기" })).toHaveAttribute(
      "href",
      "/ko/buddy",
    );
  });
});
