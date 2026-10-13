import { fireEvent, screen } from "@testing-library/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderWithQueryClient as renderWithIntl } from "@/test/render-with-query-client";
import en from "@/messages/en.json";
import ko from "@/messages/ko.json";
import ja from "@/messages/ja.json";
import zhHans from "@/messages/zh-Hans.json";
import zhHant from "@/messages/zh-Hant.json";
import {
  NameStep,
  HostStep,
  DescriptionStep,
  InclusionsStep,
  RestrictionsStep,
  PriceStep,
} from "./activity-create-steps";
import { EMPTY_ACTIVITY_DRAFT } from "./activity-create-wizard";

vi.mock("next/navigation", async (original) => ({
  ...(await original<typeof import("next/navigation")>()),
  useRouter: () => ({ replace: vi.fn() }),
}));

function Fields() {
  const t = useTranslations("CreateActivity");
  return (
    <>
      <NameStep value="" onChange={vi.fn()} t={t} />
      <HostStep draft={EMPTY_ACTIVITY_DRAFT} onChange={vi.fn()} t={t} />
      <DescriptionStep value="" experienceName="A title" onChange={vi.fn()} t={t} />
      <PriceStep value="" onChange={vi.fn()} t={t} />
    </>
  );
}

function ReferralPriceField() {
  const t = useTranslations("CreateActivity");
  const [value, setValue] = useState("");
  return <PriceStep value={value} onChange={setValue} t={t} referral />;
}

function TierPriceField({
  referral = false,
  enabled = true,
}: {
  referral?: boolean;
  enabled?: boolean;
}) {
  const t = useTranslations("CreateActivity");
  const [value, setValue] = useState("45000");
  return (
    <PriceStep
      value={value}
      onChange={setValue}
      t={t}
      referral={referral}
      priceTiers={enabled ? [{ minGuests: "2", maxGuests: "3", unitPrice: "40000" }] : []}
    />
  );
}

it("immediately explains when the base price falls below an existing group rate and clears on correction", () => {
  renderWithIntl(<TierPriceField />, { locale: "ko" });
  const input = screen.getByRole("textbox");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  fireEvent.change(input, { target: { value: "35000" } });
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(input).toHaveAttribute("aria-describedby", "price-minimum price-tier-warning");
  expect(screen.getByRole("alert")).toHaveTextContent(
    "기본 요금보다 높은 인원별 요금이 있어요. 다음 단계에서 조정해 주세요.",
  );
  fireEvent.change(input, { target: { value: "40000" } });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(input).not.toHaveAttribute("aria-invalid", "true");
});

it.each([{ referral: true }, { enabled: false }])(
  "does not warn for referrals or disabled group rates: %j",
  (props) => {
    renderWithIntl(<TierPriceField {...props} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "35000" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  },
);

function ListHarness({
  kind,
  initial,
}: Readonly<{ kind: "inclusions" | "restrictions"; initial: string }>) {
  const t = useTranslations("CreateActivity");
  const [value, setValue] = useState(initial);
  return (
    <>
      {kind === "inclusions" ? (
        <InclusionsStep value={value} onChange={setValue} t={t} />
      ) : (
        <RestrictionsStep
          value={value}
          onChange={setValue}
          hasNoRestrictions={false}
          onNoRestrictionsChange={vi.fn()}
          t={t}
        />
      )}
      <output data-testid="items">{value}</output>
    </>
  );
}

describe("activity input limits", () => {
  it("uses an activity-neutral Korean placeholder for additional inclusions", () => {
    renderWithIntl(<ListHarness kind="inclusions" initial="" />, { locale: "ko" });
    expect(screen.getByRole("textbox", { name: "기타 포함사항" })).toHaveAttribute(
      "placeholder",
      "그 외 제공되는 항목을 입력해 주세요",
    );
  });
  it.each([
    ["ko", ko, "서비스 이용료"],
    ["en", en, "Service fee"],
  ] as const)(
    "shows the revised inclusion presets and preserves legacy values in %s",
    (locale, messages, feeLabel) => {
      const options = messages.CreateActivity.inclusions.options;
      const legacy = [options.parking, options.snacks, options.drinks];
      renderWithIntl(<ListHarness kind="inclusions" initial={legacy.join("\n")} />, {
        locale,
        messages,
      });
      for (const label of legacy) {
        expect(screen.queryByRole("button", { name: label })).not.toBeInTheDocument();
        expect(screen.getByText(label)).toBeInTheDocument();
      }
      const fee = screen.getByRole("button", { name: feeLabel });
      expect(fee).toHaveAttribute("aria-pressed", "false");
      expect(document.querySelectorAll("button[aria-pressed]")).toHaveLength(6);
      fireEvent.click(fee);
      expect(screen.getByTestId("items").textContent).toBe([...legacy, feeLabel].join("\n"));
      fireEvent.click(fee);
      expect(screen.getByTestId("items").textContent).toBe(legacy.join("\n"));
      const paths = [
        [options.tickets, "M15 5l0 2"],
        [options.transport, "M7 5l0 5"],
        [
          options.equipment,
          "M7 10h3v-3l-3.5 -3.5a6 6 0 0 1 8 8l6 6a2 2 0 0 1 -3 3l-6 -6a6 6 0 0 1 -8 -8l3.5 3.5",
        ],
        [feeLabel, "M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0"],
      ];
      for (const [label, path] of paths) {
        expect(
          screen.getByRole("button", { name: label }).querySelector(`path[d="${path}"]`),
        ).not.toBeNull();
      }
    },
  );

  it("uses the supplied running icon for the physical activity restriction", () => {
    renderWithIntl(<ListHarness kind="restrictions" initial="" />);
    const option = screen.getByRole("button", {
      name: en.CreateActivity.restrictions.options.activity,
    });
    expect(option.querySelector('path[d="M14.007 5a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"]')).not.toBeNull();
  });
  it.each(["Detailed description", "About you"])("left-aligns the %s input", (name) => {
    renderWithIntl(<Fields />);
    const description = screen.getByRole("textbox", { name });
    expect(description).toHaveClass("text-left");
    expect(description).not.toHaveClass("text-center");
  });
  it("explains referral pricing without silently turning negative or decimal input into a different price", () => {
    renderWithIntl(<ReferralPriceField />);
    const input = screen.getByRole("textbox", { name: "Minimum service price" });
    expect(input).toHaveAccessibleDescription("You can enter an amount from ₩0.");
    expect(
      screen.queryByText(
        "The final price is agreed with the provider. No payment is taken when applying.",
      ),
    ).not.toBeInTheDocument();
    for (const value of ["-5000", "12.5", "0", "5000"]) {
      fireEvent.change(input, { target: { value } });
      expect(input).toHaveValue(value === "5000" ? "5,000" : value);
    }
    expect(screen.queryByText("The minimum price per person is ₩15,000.")).not.toBeInTheDocument();
  });
  it.each([
    ["ko", "1인당 최소 금액은 15,000원입니다."],
    ["en", "The minimum price per person is ₩15,000."],
    ["ja", "1人あたりの最低料金は15,000ウォンです。"],
    ["zh-Hans", "每人最低价格为15,000韩元。"],
    ["zh-Hant", "每人最低價格為15,000韓元。"],
  ] as const)("shows accessible minimum price guidance in %s", (locale, guidance) => {
    const messages = { en, ko, ja, "zh-Hans": zhHans, "zh-Hant": zhHant };
    renderWithIntl(<Fields />, { locale, messages: messages[locale] });
    expect(screen.getByText(guidance)).toBeInTheDocument();
    expect(document.getElementById("price-per-person")).toHaveAccessibleDescription(
      expect.stringContaining(guidance),
    );
  });
  it.each([
    ["ko", "반드시 영어로"],
    ["en", "in English"],
  ] as const)("emphasizes the English title requirement in %s", (locale, text) => {
    renderWithIntl(<Fields />, { locale });
    const emphasis = screen.getByText(text, { exact: true });
    expect(emphasis.tagName).toBe("STRONG");
    expect(emphasis).toHaveClass("font-bold", "text-primary");
    expect(emphasis.closest("p")).toHaveClass("text-muted");
  });

  it("uses expanded input limits and accessible English-only title guidance", () => {
    renderWithIntl(<Fields />);
    const title = screen.getByPlaceholderText("e.g. Korean Baseball Fan Night");
    expect(title).toHaveAttribute("maxlength", "100");
    expect(title).toHaveAccessibleDescription(
      "Activity titles are not automatically translated. Please write the title in English.",
    );
    expect(
      screen.getByPlaceholderText("Introduce yourself and why you want to host this experience."),
    ).toHaveAttribute("maxlength", "2000");
    expect(
      screen.getByPlaceholderText(
        "Tell guests what the experience feels like from start to finish.",
      ),
    ).toHaveAttribute("maxlength", "3000");
  });

  it.each(["inclusions", "restrictions"] as const)(
    "counts presets together with custom %s and preserves oversized restored content",
    (kind) => {
      const value = Array.from({ length: 20 }, (_, i) => `Custom ${i}`).join("\n");
      const view = renderWithIntl(<ListHarness kind={kind} initial={value} />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("maxlength", "500");
      fireEvent.change(input, { target: { value: "Extra item" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(screen.getByTestId("items").textContent).toBe(value);
      const preset = screen.getAllByRole("button").find((el) => el.hasAttribute("aria-pressed"))!;
      expect(preset).toBeDisabled();
      fireEvent.click(preset);
      expect(screen.getByTestId("items").textContent).toBe(value);
      view.unmount();
      const tooLong = "A".repeat(501);
      renderWithIntl(<ListHarness kind={kind} initial={tooLong} />);
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Each item must be 500 characters or fewer.",
      );
      expect(screen.getByTestId("items").textContent).toBe(tooLong);
    },
  );
});
