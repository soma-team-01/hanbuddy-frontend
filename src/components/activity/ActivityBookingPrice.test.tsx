import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { getActivityPriceQuote } from "@/lib/api/activities";
import { ActivityBookingPrice } from "./ActivityBookingPrice";

vi.mock("@/lib/api/activities", () => ({ getActivityPriceQuote: vi.fn() }));
const quote = {
  activityId: 8,
  guestCount: 2,
  currency: "KRW" as const,
  originalUnitPrice: 45000,
  unitPrice: 36000,
  originalAmount: 90000,
  amount: 72000,
  discountAmount: 18000,
  discountPercent: 10,
  quantityUnitPrice: 40000,
  quantityDiscountAmount: 10000,
  periodDiscountAmount: 8000,
  appliedPriceTier: { minGuests: 2, maxGuests: 2, unitPrice: 40000 },
};
const props = {
  activityId: "8",
  guests: 2,
  maxGuests: 4,
  onGuestsChange: vi.fn(),
  dateControl: <button>Date</button>,
  bookingPath: "/activities/8/book?scheduleId=10&guestCount=2",
  onBookingClick: vi.fn(),
};
beforeEach(() => {
  vi.mocked(getActivityPriceQuote).mockReset();
});
it("shows server unit price and total, with guest count carried into booking", async () => {
  vi.mocked(getActivityPriceQuote).mockResolvedValue({ status: "success", quote });
  renderWithQueryClient(<ActivityBookingPrice {...props} />, { locale: "ko" });
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(await screen.findByText("₩72,000")).toBeInTheDocument();
  expect(screen.getByText("1인 ₩36,000")).toBeInTheDocument();
  expect(screen.getByRole("link")).toHaveAttribute("href", expect.stringContaining("guestCount=2"));
  fireEvent.click(screen.getByRole("button", { name: "인원 늘리기" }));
  expect(props.onGuestsChange).toHaveBeenCalledWith(3);
});
it("hides stale amounts and blocks booking after the guest count changes", async () => {
  vi.mocked(getActivityPriceQuote)
    .mockResolvedValueOnce({ status: "success", quote })
    .mockImplementation(() => new Promise(() => {}));
  const view = renderWithQueryClient(<ActivityBookingPrice {...props} />, { locale: "ko" });
  await screen.findByText("₩72,000");
  view.rerender(<ActivityBookingPrice {...props} guests={3} />);
  expect(screen.queryByText("₩72,000")).not.toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  await waitFor(() =>
    expect(getActivityPriceQuote).toHaveBeenCalledWith("8", 3, expect.any(AbortSignal)),
  );
});
it("does not enable booking without a session and respects the remaining capacity", async () => {
  vi.mocked(getActivityPriceQuote).mockResolvedValue({ status: "success", quote });
  renderWithQueryClient(<ActivityBookingPrice {...props} bookingPath={null} maxGuests={2} />, {
    locale: "ko",
  });
  await screen.findByText("₩72,000");
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "인원 늘리기" })).toBeDisabled();
});
