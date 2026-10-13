import { screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { StatusBadge } from "./StatusBadge";
import ko from "@/messages/ko.json";
import ja from "@/messages/ja.json";
import zhHans from "@/messages/zh-Hans.json";
import zhHant from "@/messages/zh-Hant.json";

it.each(["rejected", "expired"] as const)("displays %s as Declined", (status) => {
  renderWithIntl(<StatusBadge status={status} />);
  expect(screen.getByText("Declined")).toBeInTheDocument();
  expect(screen.queryByText("Cancelled")).not.toBeInTheDocument();
});

it.each(["ko", "ja", "zh-Hans", "zh-Hant"] as const)(
  "localizes both declined states in %s",
  (locale) => {
    const labels = {
      ko: "거절",
      ja: "お断り",
      "zh-Hans": "已拒绝",
      "zh-Hant": "已拒絕",
    };
    renderWithIntl(
      <>
        <StatusBadge status="rejected" />
        <StatusBadge status="expired" />
      </>,
      {
        locale,
        messages: { ko, ja, "zh-Hans": zhHans, "zh-Hant": zhHant }[locale],
      },
    );
    expect(screen.getAllByText(labels[locale])).toHaveLength(2);
  },
);

it("preserves the cancelled label", () => {
  renderWithIntl(<StatusBadge status="cancelled" />);
  expect(screen.getByText("Cancelled")).toBeInTheDocument();
});
