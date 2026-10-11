import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { getActivityPricingPreview } from "@/lib/api/activities";
import { createApiClientError } from "@/lib/api/errors";
import {
  ActivityBasePayout,
  ActivityPriceTierEditor,
  ActivityPricingTable,
} from "./ActivityQuantityPricing";
import type { ActivityPricingPreviewRow } from "@/types/activity-pricing";
import ko from "@/messages/ko.json";
vi.mock("@/lib/api/activities", () => ({ getActivityPricingPreview: vi.fn() }));
vi.mock("next/navigation", async (original) => ({
  ...(await original<typeof import("next/navigation")>()),
  useRouter: () => ({ replace: vi.fn() }),
}));
const draft = {
  pricePerPerson: "45000",
  maxGuests: "2",
  discountType: "none",
  discountPercent: "",
  discountEndsAt: "",
};
const tableDraft = {
  ...draft,
  quantityPricingEnabled: true,
  priceTiers: [{ minGuests: "2", maxGuests: "3", unitPrice: "40000" }],
};
const result = {
  status: "success" as const,
  preview: {
    currency: "KRW" as const,
    commissionRate: 0.15,
    rows: [
      {
        guestCount: 2,
        quantityUnitPriceKrw: 40000,
        finalUnitPriceKrw: 36000,
        finalAmountKrw: 72000,
        totalDeductionAmountKrw: 10800,
        estimatedGuidePayoutAmountKrw: 61200,
        estimatedGuidePayoutPerGuestKrw: 30600,
      } as ActivityPricingPreviewRow,
    ],
  },
};
beforeEach(() => {
  vi.mocked(getActivityPricingPreview).mockReset();
});
it("uses quantity-specific translations instead of period-discount labels", () => {
  renderWithQueryClient(<ActivityPriceTierEditor draft={draft} onChange={vi.fn()} />, {
    locale: "ko",
    messages: {
      ...ko,
      QuantityPricing: {
        ...ko.QuantityPricing,
        options: { none: "기본 요금만", enabled: "인원별 요금 설정" },
      },
    },
  });
  expect(screen.getByRole("button", { name: "기본 요금만" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("button", { name: "인원별 요금 설정" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "할인 적용" })).not.toBeInTheDocument();
});
it("shows original rates, red discounted rates and final server per-person payouts in four columns", async () => {
  vi.mocked(getActivityPricingPreview).mockResolvedValue(result);
  renderWithQueryClient(<ActivityPricingTable draft={tableDraft} />, { locale: "ko" });
  expect(await screen.findByText("₩30,600")).toBeInTheDocument();
  expect(screen.getByText("₩36,000")).toBeInTheDocument();
  expect(screen.getByText("₩40,000")).toBeInTheDocument();
  expect(screen.getByText("₩36,000")).toHaveClass("text-primary");
  expect(screen.getAllByRole("columnheader")).toHaveLength(4);
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  expect(screen.queryByText("₩10,800")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "전체 인원별 정산표 보기" })).not.toBeInTheDocument();
  expect(screen.queryByText(/총 공제율/)).not.toBeInTheDocument();
  expect(getActivityPricingPreview).toHaveBeenCalledWith(
    expect.objectContaining({
      priceTiers: [{ minGuests: 2, maxGuests: 3, unitPrice: 40000 }],
      discountPercent: null,
    }),
    expect.any(AbortSignal),
  );
});
it("prompts for the end date and percentage before requesting the final preview", () => {
  renderWithQueryClient(<ActivityPricingTable draft={{ ...draft, discountType: "limited" }} />, {
    locale: "ko",
  });
  expect(screen.getByRole("status")).toHaveTextContent(
    "할인 종료일과 할인율을 입력하면 최종 요금이 표시돼요.",
  );
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(getActivityPricingPreview).not.toHaveBeenCalled();
});
it("keeps configured ranges beyond capacity and uses each range's minimum for server payouts", async () => {
  vi.mocked(getActivityPricingPreview).mockResolvedValue({
    ...result,
    preview: {
      ...result.preview,
      rows: [1, 2, 3, 4, 5, 6].map((count) => ({
        ...result.preview.rows[0],
        guestCount: count,
        finalUnitPriceKrw: count >= 6 ? 26600 : 33250,
        estimatedGuidePayoutPerGuestKrw: count === 2 ? 28263 : count === 3 ? 28262 : 22610,
      })),
    },
  });
  const ranges = [
    { minGuests: "2", maxGuests: "3", unitPrice: "35000" },
    { minGuests: "4", maxGuests: "5", unitPrice: "30000" },
    { minGuests: "6", maxGuests: "", unitPrice: "28000" },
  ];
  const configured = {
    ...draft,
    maxGuests: "3",
    quantityPricingEnabled: true,
    priceTiers: ranges,
    discountType: "limited",
    discountEndsAt: "2099-12-31",
    discountPercent: "5",
  };
  renderWithQueryClient(<ActivityPricingTable draft={configured} />, { locale: "ko" });
  await screen.findByRole("rowheader", { name: "6명 이상" });
  expect(screen.getAllByRole("rowheader").map((row) => row.textContent)).toEqual([
    "1명",
    "2~3명",
    "4~5명",
    "6명 이상",
  ]);
  expect(screen.getByRole("row", { name: /2~3명/ })).toHaveTextContent("₩28,263");
  expect(screen.queryByText("₩28,262")).not.toBeInTheDocument();
  expect(getActivityPricingPreview).toHaveBeenCalledWith(
    expect.objectContaining({ maxGuestCount: 6 }),
    expect.any(AbortSignal),
  );
  expect(configured.maxGuests).toBe("3");
});
it("sends both discount rules and clears the table when the end date is removed", async () => {
  vi.mocked(getActivityPricingPreview).mockResolvedValue(result);
  const periodDraft = {
    ...draft,
    discountType: "limited",
    discountEndsAt: "2099-12-31",
    discountPercent: "10",
    quantityPricingEnabled: true,
    priceTiers: [{ minGuests: "2", maxGuests: "", unitPrice: "40000" }],
  };
  const view = renderWithQueryClient(<ActivityPricingTable draft={periodDraft} />, {
    locale: "ko",
  });
  await screen.findByText("₩30,600");
  expect(getActivityPricingPreview).toHaveBeenCalledWith(
    expect.objectContaining({
      discountPercent: 10,
      discountEndDate: "2099-12-31",
      priceTiers: [{ minGuests: 2, maxGuests: null, unitPrice: 40000 }],
    }),
    expect.any(AbortSignal),
  );
  view.rerender(<ActivityPricingTable draft={{ ...periodDraft, discountEndsAt: "" }} />);
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent(
    "할인 종료일과 할인율을 입력하면 최종 요금이 표시돼요.",
  );
});
it("updates the one-line base payout with no quantity or period discount and clears stale values", async () => {
  vi.mocked(getActivityPricingPreview).mockImplementation(async (request) => ({
    ...result,
    preview: {
      ...result.preview,
      rows: [
        {
          ...result.preview.rows[0],
          guestCount: 1,
          quantityUnitPriceKrw: request.price,
          finalUnitPriceKrw: request.price,
          finalAmountKrw: request.price,
          totalDeductionAmountKrw: request.price * 0.15,
          estimatedGuidePayoutAmountKrw: request.price * 0.85,
        },
      ],
    },
  }));
  const view = renderWithQueryClient(<ActivityBasePayout price="40000" />, { locale: "ko" });
  await screen.findByText("1인 예상 정산 ₩34,000");
  expect(getActivityPricingPreview).toHaveBeenLastCalledWith(
    {
      price: 40000,
      currency: "KRW",
      maxGuestCount: 1,
      discountPercent: null,
      discountEndDate: null,
      priceTiers: [],
    },
    expect.any(AbortSignal),
  );
  view.rerender(<ActivityBasePayout price="50000" />);
  expect(screen.queryByText("1인 예상 정산 ₩34,000")).not.toBeInTheDocument();
  await screen.findByText("1인 예상 정산 ₩42,500");
  view.rerender(<ActivityBasePayout price="100" />);
  expect(screen.getByText("1인 예상 정산 —")).toBeInTheDocument();
});
it("hides stale results immediately and ignores late responses after input changes", async () => {
  let resolveOld!: (value: typeof result) => void;
  vi.mocked(getActivityPricingPreview)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    )
    .mockResolvedValue(result);
  const view = renderWithQueryClient(<ActivityPricingTable draft={tableDraft} />, { locale: "ko" });
  await waitFor(() => expect(getActivityPricingPreview).toHaveBeenCalledTimes(1));
  view.rerender(<ActivityPricingTable draft={{ ...tableDraft, pricePerPerson: "50000" }} />);
  expect(vi.mocked(getActivityPricingPreview).mock.calls[0][1]?.aborted).toBe(true);
  await act(async () =>
    resolveOld({
      ...result,
      preview: {
        ...result.preview,
        rows: [{ ...result.preview.rows[0], estimatedGuidePayoutPerGuestKrw: 123 }],
      },
    }),
  );
  expect(screen.queryByText("₩123")).not.toBeInTheDocument();
  await screen.findByText("₩30,600");
  view.rerender(<ActivityPricingTable draft={{ ...tableDraft, pricePerPerson: "" }} />);
  expect(screen.queryByText("₩30,600")).not.toBeInTheDocument();
});
it("shows errors without an invented 20% fallback and supports retry", async () => {
  vi.mocked(getActivityPricingPreview)
    .mockResolvedValueOnce({
      status: "error",
      error: createApiClientError(500, null, "Unavailable"),
    })
    .mockResolvedValue(result);
  renderWithQueryClient(<ActivityPricingTable draft={tableDraft} />, { locale: "ko" });
  expect(await screen.findByRole("alert")).toBeInTheDocument();
  expect(screen.queryByText(/20%/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
  await screen.findByText("₩30,600");
});
it("uses border-only input focus, turns tiers off explicitly and only allows digits in tier prices", () => {
  const onChange = vi.fn();
  renderWithQueryClient(
    <ActivityPriceTierEditor
      draft={{
        ...draft,
        quantityPricingEnabled: true,
        priceTiers: [{ minGuests: "2", maxGuests: "", unitPrice: "40000" }],
      }}
      onChange={onChange}
    />,
    { locale: "ko" },
  );
  fireEvent.change(screen.getByLabelText("1인 가격 (KRW)"), { target: { value: "30,000-" } });
  for (const input of screen.getAllByRole("textbox")) {
    expect(input).toHaveClass("focus-border-only", "focus:border-primary");
  }
  expect(screen.getByLabelText("1인 가격 (KRW)")).toHaveValue("30,000");
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "할인 없음" }));
  expect(onChange).toHaveBeenLastCalledWith(false, expect.any(Array));
});

it("only reveals a single base row when enabled and adds a range on request", () => {
  const onChange = vi.fn();
  const view = renderWithQueryClient(
    <ActivityPriceTierEditor draft={draft} onChange={onChange} />,
    { locale: "ko" },
  );
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "할인 없음" }));
  expect(onChange).toHaveBeenLastCalledWith(false, []);
  fireEvent.click(screen.getByRole("button", { name: "할인 적용" }));
  expect(onChange).toHaveBeenLastCalledWith(true, []);
  view.rerender(
    <ActivityPriceTierEditor
      draft={{ ...draft, quantityPricingEnabled: true, priceTiers: [] }}
      onChange={onChange}
    />,
  );
  expect(screen.getAllByRole("row")).toHaveLength(2);
  expect(screen.getByRole("columnheader", { name: "1인 정산액" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "추가" })).toBeDisabled();
  enterGuests("2", "4");
  fireEvent.change(screen.getByLabelText("1인 가격 (KRW)"), { target: { value: "40000" } });
  expect(within(screen.getByRole("table")).queryByRole("textbox")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "추가" }));
  expect(onChange).toHaveBeenLastCalledWith(true, [
    { minGuests: "2", maxGuests: "4", unitPrice: "40000" },
  ]);
  expect(screen.getByLabelText("몇 명부터")).toHaveFocus();
  expect(screen.getByLabelText("1인 가격 (KRW)")).toHaveValue("");
  view.rerender(
    <ActivityPriceTierEditor
      draft={{
        ...draft,
        quantityPricingEnabled: true,
        priceTiers: [{ minGuests: "2", maxGuests: "4", unitPrice: "40000" }],
      }}
      onChange={onChange}
    />,
  );
  expect(screen.getAllByRole("row")).toHaveLength(3);
  expect(screen.getByText("2~4명")).toBeInTheDocument();
  expect(screen.getAllByRole("textbox")).toHaveLength(3);
  expect(screen.queryByText(/기간 할인 전 예상액/)).not.toBeInTheDocument();
});

function enterGuests(min: string, max = "") {
  fireEvent.change(screen.getByLabelText("몇 명부터"), { target: { value: min } });
  fireEvent.change(screen.getByLabelText("몇 명까지"), { target: { value: max } });
}

it.each([
  ["1", ""],
  ["101", ""],
  ["4", "2"],
  ["2", "3"],
  ["2", ""],
  ["0", "2"],
])("rejects invalid or overlapping bounds %s to %s", (min, max) => {
  const onChange = vi.fn();
  renderWithQueryClient(
    <ActivityPriceTierEditor
      draft={{
        ...draft,
        quantityPricingEnabled: true,
        priceTiers: [{ minGuests: "3", maxGuests: "4", unitPrice: "40000" }],
      }}
      onChange={onChange}
    />,
    { locale: "ko" },
  );
  enterGuests(min, max);
  fireEvent.change(screen.getByLabelText("1인 가격 (KRW)"), { target: { value: "30000" } });
  fireEvent.click(screen.getByRole("button", { name: "추가" }));
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toBeInTheDocument();
});

it.each([
  ["2", "2"],
  ["5", ""],
  ["2", "4"],
])("adds numeric bounds %s to %s without requiring punctuation", (minGuests, maxGuests) => {
  const onChange = vi.fn();
  renderWithQueryClient(
    <ActivityPriceTierEditor
      draft={{ ...draft, quantityPricingEnabled: true, priceTiers: [] }}
      onChange={onChange}
    />,
    { locale: "ko" },
  );
  enterGuests(minGuests, maxGuests);
  fireEvent.change(screen.getByLabelText("1인 가격 (KRW)"), { target: { value: "30000" } });
  fireEvent.keyDown(screen.getByLabelText("1인 가격 (KRW)"), { key: "Enter" });
  expect(onChange).toHaveBeenLastCalledWith(true, [{ minGuests, maxGuests, unitPrice: "30000" }]);
  expect(screen.getByLabelText("몇 명부터")).toHaveValue("");
  expect(screen.getByLabelText("몇 명까지")).toHaveValue("");
});

it("shows only the applied guest count without redundant guidance and requires the lower bound", () => {
  renderWithQueryClient(
    <ActivityPriceTierEditor
      draft={{ ...draft, quantityPricingEnabled: true }}
      onChange={vi.fn()}
    />,
    { locale: "ko" },
  );
  expect(
    screen.queryByText("같은 숫자는 해당 인원만, ‘까지’를 비우면 그 인원 이상에 적용돼요."),
  ).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("1인 가격 (KRW)"), { target: { value: "30000" } });
  enterGuests("", "4");
  expect(screen.getByRole("button", { name: "추가" })).toBeDisabled();
  enterGuests("5");
  expect(screen.getByRole("status")).toHaveTextContent("적용 인원: 5명 이상");
  expect(screen.getByRole("button", { name: "추가" })).toBeEnabled();
  enterGuests("3", "3");
  expect(screen.getByRole("status")).toHaveTextContent("적용 인원: 3명");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("shows the server per-person payout, not the group payout, in each rate row", async () => {
  vi.mocked(getActivityPricingPreview).mockResolvedValue({
    ...result,
    preview: {
      ...result.preview,
      rows: [{ ...result.preview.rows[0], guestCount: 2, estimatedGuidePayoutPerGuestKrw: 30600 }],
    },
  });
  renderWithQueryClient(
    <ActivityPriceTierEditor
      draft={{
        ...draft,
        quantityPricingEnabled: true,
        priceTiers: [{ minGuests: "2", maxGuests: "4", unitPrice: "40000" }],
      }}
      onChange={vi.fn()}
    />,
    { locale: "ko" },
  );
  expect(await screen.findAllByText("₩30,600")).not.toHaveLength(0);
  expect(screen.queryByText("₩61,200")).not.toBeInTheDocument();
  expect(getActivityPricingPreview).toHaveBeenCalledWith(
    expect.objectContaining({
      maxGuestCount: 2,
      discountPercent: null,
      priceTiers: [{ minGuests: 2, maxGuests: 4, unitPrice: 40000 }],
    }),
    expect.any(AbortSignal),
  );
});
