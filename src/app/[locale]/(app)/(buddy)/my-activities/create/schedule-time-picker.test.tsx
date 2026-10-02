import { useState } from "react";
import { useTranslations } from "next-intl";
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import type { Locale } from "@/i18n/routing";
import ko from "@/messages/ko.json";
import en from "@/messages/en.json";
import ja from "@/messages/ja.json";
import zhHans from "@/messages/zh-Hans.json";
import zhHant from "@/messages/zh-Hant.json";
import { ScheduleStep } from "./activity-create-steps";
import type { ScheduleDraft } from "./activity-create-wizard";

function Form({ date = "2099-10-10" }: { date?: string }) {
  const t = useTranslations("CreateActivity");
  const [schedules, setSchedules] = useState<ScheduleDraft[]>([
    { id: "one", date, startTime: "" },
    { id: "two", date: "2099-10-11", startTime: "" },
  ]);
  return (
    <ScheduleStep
      schedules={schedules}
      t={t}
      onToggleDate={(date) =>
        setSchedules((current) =>
          current.some((s) => s.date === date)
            ? current.filter((s) => s.date !== date)
            : [...current, { id: date, date, startTime: "" }],
        )
      }
      onSetTimesForDate={(date, times) =>
        setSchedules((current) => [
          ...current.filter((s) => s.date !== date),
          ...(times.length ? times : [""]).map((startTime) => ({
            id: date + startTime,
            date,
            startTime,
          })),
        ])
      }
    />
  );
}

afterEach(() => vi.useRealTimers());

describe("schedule time cards", () => {
  it("shows expanded morning and afternoon cards and toggles multiple times", () => {
    renderWithIntl(<Form />);
    expect(
      within(screen.getByRole("group", { name: "Morning" })).getAllByRole("button"),
    ).toHaveLength(8);
    expect(
      within(screen.getByRole("group", { name: "Afternoon" })).getAllByRole("button"),
    ).toHaveLength(20);
    const morning = screen.getByRole("button", { name: "09:00" });
    const afternoon = screen.getByRole("button", { name: "15:30" });
    fireEvent.click(morning);
    fireEvent.click(afternoon);
    expect(morning).toHaveAttribute("aria-pressed", "true");
    expect(afternoon).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(morning);
    expect(morning).toHaveAttribute("aria-pressed", "false");
    expect(afternoon).toHaveAttribute("aria-pressed", "true");
  });

  it("supports custom times, avoids duplicate presets and applies times across dates", () => {
    renderWithIntl(<Form />);
    fireEvent.click(screen.getByRole("button", { name: "09:00" }));
    const hour = screen.getByRole("textbox", { name: "Hour (1–12)" });
    const minute = screen.getByRole("textbox", { name: "Minute (0–59)" });
    fireEvent.change(hour, { target: { value: "9" } });
    fireEvent.change(minute, { target: { value: "00" } });
    expect(screen.getByRole("button", { name: "Add time" })).toBeDisabled();
    fireEvent.change(hour, { target: { value: "7" } });
    fireEvent.change(minute, { target: { value: "15" } });
    fireEvent.click(screen.getByRole("button", { name: "Add time" }));
    expect(screen.getByTestId("schedule-time-2099-10-10-07:15")).toBeInTheDocument();
    const customCard = screen.getByTestId("schedule-time-2099-10-10-07:15");
    expect(customCard).toHaveClass("bg-primary", "border-primary", "text-white");
    expect(customCard.parentElement).toHaveClass("grid", "grid-cols-3", "lg:grid-cols-4");
    expect(customCard.firstElementChild).toHaveClass("whitespace-nowrap");
    expect(
      customCard.compareDocumentPosition(screen.getByRole("textbox", { name: "Hour (1–12)" })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Use the same times for all selected dates" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit start times for October 11, 2099" }));
    expect(screen.getByRole("button", { name: "09:00" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("schedule-time-2099-10-11-07:15")).toBeInTheDocument();
    expect(
      within(screen.getByRole("group", { name: "Morning" })).queryByText("07:15"),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove AM 07:15 from October 11, 2099" }));
    expect(screen.queryByTestId("schedule-time-2099-10-11-07:15")).not.toBeInTheDocument();
  });

  it.each([
    ["AM", "00:05"],
    ["PM", "12:05"],
  ])("converts 12 %s correctly and adds a separate removable card", (period, expected) => {
    renderWithIntl(<Form />);
    fireEvent.click(screen.getByRole("button", { name: period }));
    fireEvent.change(screen.getByRole("textbox", { name: "Hour (1–12)" }), {
      target: { value: "12" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Minute (0–59)" }), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add time" }));
    const group = screen.getByRole("group", { name: period === "AM" ? "Morning" : "Afternoon" });
    const times = within(group)
      .getAllByRole("button")
      .map((button) => button.textContent);
    expect(times).toEqual([...times].sort());
    expect(within(group).queryByRole("button", { name: expected })).not.toBeInTheDocument();
    const card = screen.getByTestId(`schedule-time-2099-10-10-${expected}`);
    expect(card).toHaveTextContent(`${period} 12:05`);
    fireEvent.click(within(card).getByRole("button", { name: /Remove/ }));
    expect(card).not.toBeInTheDocument();
    expect(
      screen.queryByText("Select one or more start times. Select again to remove."),
    ).not.toBeInTheDocument();
  });

  it("requires valid typed hours and minutes", () => {
    renderWithIntl(<Form />);
    const hour = screen.getByRole("textbox", { name: "Hour (1–12)" });
    const minute = screen.getByRole("textbox", { name: "Minute (0–59)" });
    expect(hour).toHaveAttribute("inputmode", "numeric");
    for (const [h, m] of [
      ["", "00"],
      ["0", "00"],
      ["13", "00"],
      ["5", "60"],
      ["5", ""],
    ]) {
      fireEvent.change(hour, { target: { value: h } });
      fireEvent.change(minute, { target: { value: m } });
      expect(screen.getByRole("button", { name: "Add time" })).toBeDisabled();
    }
  });

  it("distinguishes the active calendar date without a separate date heading", () => {
    renderWithIntl(<Form />);
    const first = screen.getByRole("button", { name: "Edit start times for October 10, 2099" });
    const second = screen.getByRole("button", { name: "Edit start times for October 11, 2099" });
    expect(first).toHaveAttribute("aria-current", "date");
    expect(first.firstElementChild).toHaveClass("bg-primary");
    expect(screen.queryByTestId("schedule-status-2099-10-10")).not.toBeInTheDocument();
    expect(screen.queryByTestId("schedule-status-2099-10-11")).not.toBeInTheDocument();
    expect(second).not.toHaveAttribute("aria-current");
    fireEvent.click(screen.getByRole("button", { name: "09:00" }));
    expect(first.firstElementChild).toHaveClass("bg-primary");
    expect(screen.getByTestId("schedule-status-2099-10-10")).toBeInTheDocument();
    fireEvent.click(second);
    expect(first.firstElementChild).toHaveClass("bg-white", "border");
    expect(first.firstElementChild).not.toHaveClass("bg-primary-soft");
    expect(second.firstElementChild).toHaveClass("bg-primary");
    expect(second).toHaveAttribute("aria-current", "date");
    expect(first).not.toHaveAttribute("aria-current");
    expect(screen.queryByTestId("schedule-status-2099-10-11")).not.toBeInTheDocument();
    fireEvent.click(first);
    fireEvent.click(screen.getByRole("button", { name: "09:00" }));
    expect(screen.queryByTestId("schedule-status-2099-10-10")).not.toBeInTheDocument();
    expect(screen.queryByText("October 11, 2099")).not.toBeInTheDocument();
    expect(screen.queryByText(/Select as many dates as you need/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Bookings and payment requests close 24 hours/),
    ).not.toBeInTheDocument();
  });

  it("keeps dates synchronized while checked, including newly selected dates and clearing all times", () => {
    renderWithIntl(<Form />);
    const checkbox = screen.getByRole("checkbox", {
      name: "Use the same times for all selected dates",
    });
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole("button", { name: "09:00" }));
    fireEvent.click(screen.getByRole("button", { name: "Select October 12, 2099" }));
    expect(screen.getByRole("button", { name: "09:00" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "09:00" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit start times for October 10, 2099" }));
    expect(screen.getByRole("button", { name: "09:00" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole("button", { name: "09:00" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit start times for October 11, 2099" }));
    expect(screen.getByRole("button", { name: "09:00" })).toHaveAttribute("aria-pressed", "false");
  });

  it("removes a selected date with its own calendar-cell close button", () => {
    renderWithIntl(<Form />);
    const date = screen.getByRole("button", { name: "Edit start times for October 10, 2099" });
    const remove = within(date.parentElement!).getByRole("button", {
      name: "Remove October 10, 2099",
    });
    fireEvent.click(remove);
    expect(screen.getByRole("button", { name: "Select October 10, 2099" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(
      screen.queryByRole("button", { name: "Remove October 10, 2099" }),
    ).not.toBeInTheDocument();
  });

  it("disables elapsed presets using Korean time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-02T00:15:00Z"));
    renderWithIntl(<Form date="2026-10-02" />);
    expect(screen.getByRole("button", { name: "09:00" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "09:30" })).toBeEnabled();
  });

  it.each<[Locale, string, string]>([
    ["ko", "오전", "오후"],
    ["en", "Morning", "Afternoon"],
    ["ja", "午前", "午後"],
    ["zh-Hans", "上午", "下午"],
    ["zh-Hant", "上午", "下午"],
  ])("localizes expanded groups in %s", (locale, morning, afternoon) => {
    const messages = { ko, en, ja, "zh-Hans": zhHans, "zh-Hant": zhHant };
    renderWithIntl(<Form />, { locale, messages: messages[locale] });
    expect(screen.getByRole("group", { name: morning })).toBeVisible();
    expect(screen.getByRole("group", { name: afternoon })).toBeVisible();
  });
});
