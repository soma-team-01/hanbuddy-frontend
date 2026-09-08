import { within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/routing";
import { renderWithIntl } from "@/test/render-with-intl";
import { RefundPolicyNotice } from "./RefundPolicyNotice";

describe("RefundPolicyNotice", () => {
  it.each(LOCALES)("shows free cancellation and exceptions in %s", (locale) => {
    const { container } = renderWithIntl(<RefundPolicyNotice />, { locale });
    expect(container.querySelectorAll("dl > div")).toHaveLength(5);
    expect(container.querySelector("#refund-policy-exceptions")).toHaveTextContent(/\S/);
    const summary = container.querySelector("dl")!;
    expect(within(summary).getByText(/30/)).toBeInTheDocument();
    const refundValues = summary.querySelectorAll("dd");
    expect(refundValues[0].textContent).toBe(refundValues[1].textContent);
  });
});
