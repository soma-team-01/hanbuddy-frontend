import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { resolveTossFailReasonKey } from "@/lib/payments/toss-fail-codes";
import { PaymentFailContent } from "./payment-fail-content";

describe("PaymentFailContent", () => {
  it("shows the failure notice with a mapped reason and recovery actions", () => {
    renderWithIntl(<PaymentFailContent reasonKey="exceededLimit" />);

    expect(screen.getByRole("heading", { name: "Payment failed" })).toBeInTheDocument();
    expect(
      screen.getByText("The payment was not completed and nothing has been charged."),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("The payment exceeds your card's limit.");
    expect(screen.getByRole("link", { name: "Try again in My Applications" })).toHaveAttribute(
      "href",
      "/en/applications",
    );
    expect(screen.getByRole("link", { name: "Explore More Activities" })).toHaveAttribute(
      "href",
      "/en/explore",
    );
  });

  it("omits the detail line for an unknown failure code", () => {
    renderWithIntl(<PaymentFailContent reasonKey={null} />, { locale: "ko" });

    expect(screen.getByRole("heading", { name: "결제에 실패했습니다" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "내 신청에서 다시 시도" })).toHaveAttribute(
      "href",
      "/ko/applications",
    );
  });

  it("localizes a mapped cancellation reason in Korean", () => {
    renderWithIntl(<PaymentFailContent reasonKey="cancelled" />, { locale: "ko" });

    expect(screen.getByRole("alert")).toHaveTextContent("결제가 완료되기 전에 취소되었습니다.");
  });
});

describe("resolveTossFailReasonKey", () => {
  it("maps known Toss failure codes and ignores everything else", () => {
    expect(resolveTossFailReasonKey("PAY_PROCESS_CANCELED")).toBe("cancelled");
    expect(resolveTossFailReasonKey("REJECT_CARD_COMPANY")).toBe("rejectedByCardCompany");
    expect(resolveTossFailReasonKey("EXCEED_MAX_PAYMENT_AMOUNT")).toBe("exceededLimit");
    // 임의 문구가 화면에 노출되지 않도록 알 수 없는 코드는 버린다
    expect(resolveTossFailReasonKey("<script>alert(1)</script>")).toBeNull();
    expect(resolveTossFailReasonKey("UNKNOWN_CODE")).toBeNull();
    expect(resolveTossFailReasonKey(null)).toBeNull();
    // 상속 속성 이름도 허용 목록으로 새지 않는다
    expect(resolveTossFailReasonKey("toString")).toBeNull();
    expect(resolveTossFailReasonKey("constructor")).toBeNull();
    expect(resolveTossFailReasonKey("__proto__")).toBeNull();
  });
});
