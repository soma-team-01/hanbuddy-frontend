import { useState } from "react";
import { useTranslations } from "next-intl";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { CapacityStep } from "./activity-create-steps";
import type { ScheduleDraft } from "./activity-create-wizard";

function Form({ many = false }: { many?: boolean }) {
  const t = useTranslations("CreateActivity");
  const [value, setValue] = useState("8");
  const [schedules, setSchedules] = useState<ScheduleDraft[]>([
    {
      id: "one",
      date: "2099-10-10",
      startTime: "10:00",
      maxCapacity: "6",
      bookedCount: 3,
      heldSeats: 1,
      remainingCapacity: 2,
    },
    { id: "two", date: "2099-10-11", startTime: "14:00", maxCapacity: "10" },
    ...(many
      ? Array.from({ length: 10 }, (_, i) => ({
          id: `extra-${i}`,
          date: `2099-10-${String(i + 12).padStart(2, "0")}`,
          startTime: "14:00",
          maxCapacity: "8",
        }))
      : []),
  ]);
  return (
    <CapacityStep
      t={t}
      value={value}
      onChange={setValue}
      schedules={schedules}
      onScheduleCapacityChange={(id, maxCapacity) =>
        setSchedules((current) => current.map((s) => (s.id === id ? { ...s, maxCapacity } : s)))
      }
    />
  );
}

describe("capacity editor", () => {
  it("shows Korean weekdays and color-coded confirmed and pending participant counts", () => {
    renderWithIntl(<Form />, { locale: "ko" });
    fireEvent.click(screen.getByRole("button", { name: "날짜별 상세 설정" }));
    expect(screen.getByText("예약 확정 3명")).toHaveClass("text-success");
    expect(screen.getByText("결제 대기 1명")).toHaveClass("text-danger");
    expect(
      screen.queryByText(/새 회차의 기본값|각 회차는|저장된 잔여|KST/),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "2099-10-10 (토) · 10:00" })).toHaveAttribute(
      "min",
      "4",
    );
  });
  it("keeps the original counter UI without custom counts and preserves collapsed edits", () => {
    renderWithIntl(<Form />);
    const toggle = screen.getByRole("button", { name: "Date-specific settings" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(screen.queryByText(/Custom sessions/)).not.toBeInTheDocument();
    expect(screen.queryByText("Default capacity")).not.toBeInTheDocument();
    expect(screen.getByText("8")).toHaveClass("text-5xl", "sm:text-6xl");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const first = screen.getByRole("spinbutton", { name: "2099-10-10 (Sat) · 10:00" });
    fireEvent.change(first, { target: { value: "8" } });
    fireEvent.click(toggle);
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(toggle).toHaveTextContent("Date-specific settings");
    fireEvent.click(toggle);
    expect(screen.getByRole("spinbutton", { name: "2099-10-10 (Sat) · 10:00" })).toHaveValue(8);
  });
  it("limits long lists to five sessions per page and preserves edits between pages", () => {
    renderWithIntl(<Form many />);
    fireEvent.click(screen.getByRole("button", { name: "Date-specific settings" }));
    expect(screen.getAllByRole("spinbutton")).toHaveLength(5);
    fireEvent.change(screen.getByRole("spinbutton", { name: "2099-10-10 (Sat) · 10:00" }), {
      target: { value: "7" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next sessions" }));
    expect(screen.getAllByRole("spinbutton")).toHaveLength(5);
    expect(
      screen.queryByRole("spinbutton", { name: "2099-10-10 (Sat) · 10:00" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous sessions" }));
    expect(screen.getByRole("spinbutton", { name: "2099-10-10 (Sat) · 10:00" })).toHaveValue(7);
  });
  it("edits individual capacities without changing existing sessions when the default changes", () => {
    renderWithIntl(<Form />);
    fireEvent.click(screen.getByRole("button", { name: "Date-specific settings" }));
    const first = screen.getByRole("spinbutton", { name: "2099-10-10 (Sat) · 10:00" });
    const second = screen.getByRole("spinbutton", { name: "2099-10-11 (Sun) · 14:00" });
    expect(first).toHaveValue(6);
    expect(first).toHaveAttribute("min", "4");
    expect(first).toHaveAttribute("max", "100");
    expect(second).toHaveValue(10);
    fireEvent.click(screen.getByRole("button", { name: "Increase maximum guests" }));
    expect(first).toHaveValue(6);
    expect(second).toHaveValue(10);
    fireEvent.change(first, { target: { value: "7" } });
    expect(first).toHaveValue(7);
    expect(second).toHaveValue(10);
  });
});
