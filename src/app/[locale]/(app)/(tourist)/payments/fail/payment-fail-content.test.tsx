import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { PaymentFailContent } from "./payment-fail-content";

describe("PaymentFailContent", () => {
  it("shows the failure notice with the Toss error message and recovery actions", () => {
    renderWithIntl(<PaymentFailContent failMessage="카드 한도를 초과했습니다." />);

    expect(screen.getByRole("heading", { name: "Payment failed" })).toBeInTheDocument();
    expect(
      screen.getByText("The payment was not completed and nothing has been charged."),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("카드 한도를 초과했습니다.");
    expect(screen.getByRole("link", { name: "Try again in My Applications" })).toHaveAttribute(
      "href",
      "/en/applications",
    );
    expect(screen.getByRole("link", { name: "Explore More Activities" })).toHaveAttribute(
      "href",
      "/en/explore",
    );
  });

  it("omits the error detail when Toss does not provide a message", () => {
    renderWithIntl(<PaymentFailContent failMessage="" />, { locale: "ko" });

    expect(screen.getByRole("heading", { name: "결제에 실패했습니다" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "내 신청에서 다시 시도" })).toHaveAttribute(
      "href",
      "/ko/applications",
    );
  });
});
