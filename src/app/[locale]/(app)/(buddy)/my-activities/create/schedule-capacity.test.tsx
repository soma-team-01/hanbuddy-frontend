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
  it("limits long lists to five sessions per page and preserves edits between pages", () => {
    renderWithIntl(<Form many />);
    expect(screen.getAllByRole("spinbutton")).toHaveLength(5);
    fireEvent.change(screen.getByRole("spinbutton", { name: "2099-10-10 · 10:00 (KST)" }), {
      target: { value: "7" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next sessions" }));
    expect(screen.getAllByRole("spinbutton")).toHaveLength(5);
    expect(
      screen.queryByRole("spinbutton", { name: "2099-10-10 · 10:00 (KST)" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous sessions" }));
    expect(screen.getByRole("spinbutton", { name: "2099-10-10 · 10:00 (KST)" })).toHaveValue(7);
  });
  it("edits individual capacities without changing existing sessions when the default changes", () => {
    renderWithIntl(<Form />);
    const first = screen.getByRole("spinbutton", { name: "2099-10-10 · 10:00 (KST)" });
    const second = screen.getByRole("spinbutton", { name: "2099-10-11 · 14:00 (KST)" });
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
