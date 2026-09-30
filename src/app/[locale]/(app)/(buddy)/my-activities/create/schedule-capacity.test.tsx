import { useState } from "react";
import { useTranslations } from "next-intl";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { CapacityStep } from "./activity-create-steps";
import type { ScheduleDraft } from "./activity-create-wizard";

function Form() {
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
