import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PolicyDocument } from "./PolicyDocument";

describe("PolicyDocument", () => {
  it("renders GFM content and rewrites links between published policies", () => {
    render(
      <PolicyDocument
        locale="ko"
        source={`## 환불 기준\n\n### [필수] 만 19세 이상 확인\n\n문의: contact@hanbuddy.kr\n\n| 시점 | 환불액 |\n| --- | --- |\n| 48시간 전 | 전액 |\n\n[버디 운영약관](./buddy-operation-terms.ko.md)`}
      />,
    );

    expect(screen.getByRole("heading", { name: "환불 기준" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "[필수] 만 19세 이상 확인" })).toHaveAttribute(
      "id",
      "필수-만-19세-이상-확인",
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("contact@hanbuddy.kr")).toHaveClass("text-ink");
    expect(screen.queryByRole("link", { name: "contact@hanbuddy.kr" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "버디 운영약관" })).toHaveAttribute(
      "href",
      "/ko/policies/buddy-operation-terms",
    );
  });

  it("shows a mobile-only scroll hint and edge fade around wide tables", () => {
    render(
      <PolicyDocument
        locale="ko"
        source={`| 시점 | 환불액 |\n| --- | --- |\n| 48시간 전 | 전액 |`}
        tableScrollHint="옆으로 밀어 전체 표를 확인하세요"
      />,
    );

    const table = screen.getByRole("table");
    const scroller = table.parentElement as HTMLElement;
    expect(scroller).toHaveClass("overflow-x-auto");
    const frame = scroller.parentElement as HTMLElement;
    expect(frame).toHaveClass("relative");
    expect(screen.getByText("옆으로 밀어 전체 표를 확인하세요")).toHaveClass("md:hidden");
    expect(frame.querySelector("[data-testid=table-edge-fade]")).toHaveClass("md:hidden");
  });

  it("renders tables without the hint when none is provided", () => {
    render(<PolicyDocument locale="ko" source={`| a | b |\n| --- | --- |\n| 1 | 2 |`} />);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(document.querySelector("[data-testid=table-edge-fade]")).toBeNull();
  });
});
