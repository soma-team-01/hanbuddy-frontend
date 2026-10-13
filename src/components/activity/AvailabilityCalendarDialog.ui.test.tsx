import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import type { ActivityWeatherResult, Session } from "@/types/activity";
import { AvailabilityCalendarDialog } from "./AvailabilityCalendarDialog";
import { SessionWeatherSummary } from "./SessionWeatherSummary";

const dateKey = "2099-10-15";
function slot(id: string, time: string, label: string, spotsLeft = 4): Session {
  return {
    id,
    startAt: `${dateKey}T${time}:00+09:00`,
    dateKey,
    dateLabel: dateKey,
    timeLabel: label,
    spotsLeft,
  };
}
const sessions = [
  slot("afternoon", "13:10", "1:10 PM"),
  slot("late-morning", "10:45", "10:45 AM", 0),
  slot("morning", "08:15", "8:15 AM", 2),
];
const weather: ActivityWeatherResult = {
  available: true,
  unavailableReason: null,
  provider: "KMA",
  timeZone: "Asia/Seoul",
  issuedAt: `${dateKey}T07:00:00+09:00`,
  baseDate: dateKey,
  forecasts: [
    {
      forecastAt: `${dateKey}T08:00:00+09:00`,
      condition: "RAIN",
      temperatureCelsius: 18,
      precipitationProbability: 80,
    },
    {
      forecastAt: `${dateKey}T13:00:00+09:00`,
      condition: "CLOUDY",
      temperatureCelsius: 20,
      precipitationProbability: 20,
    },
  ],
};

describe("availability time cards", () => {
  it("shows just the selected session forecast, and omits unavailable forecasts", () => {
    const { rerender } = renderWithIntl(<SessionWeatherSummary session={null} weather={weather} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    rerender(<SessionWeatherSummary session={sessions[2]} weather={weather} />);
    expect(screen.getByRole("img", { name: "Rain" })).toBeInTheDocument();
    expect(screen.getByText(/18°C/)).toBeInTheDocument();
    expect(screen.queryByText(/Chance of precipitation/)).not.toBeInTheDocument();
    rerender(<SessionWeatherSummary session={sessions[0]} weather={weather} />);
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByRole("img", { name: "Cloudy" })).toBeInTheDocument();
    expect(screen.getByText(/20°C/)).toBeInTheDocument();
    rerender(
      <SessionWeatherSummary session={sessions[0]} weather={{ ...weather, available: false }} />,
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
  it("groups actual sessions into two/three columns with gray end times and no weather", () => {
    const onSelectSession = vi.fn();
    renderWithIntl(
      <AvailabilityCalendarDialog
        sessions={sessions}
        selectedSessionId="morning"
        durationMinutes={45}
        onSelectSession={onSelectSession}
        onClose={vi.fn()}
      />,
    );
    const morning = screen.getByRole("group", { name: "Morning" });
    const afternoon = screen.getByRole("group", { name: "Afternoon" });
    expect(within(morning).getByRole("list")).toHaveClass("grid", "grid-cols-2", "md:grid-cols-3");
    const buttons = within(morning).getAllByRole("button");
    expect(buttons[0]).toHaveAccessibleName(/8:15 AM ~ 9:00 AM.*2 spots left/);
    expect(buttons[0]).toHaveAttribute("aria-pressed", "true");
    expect(buttons[0]).toHaveClass("bg-primary-soft", "border-primary");
    expect(buttons[0]).toHaveClass("items-center", "text-center", "min-h-20");
    expect(within(buttons[0]).queryByRole("img")).not.toBeInTheDocument();
    expect(within(buttons[0]).getByText("~ 9:00 AM")).toHaveClass("text-muted");
    expect(screen.queryByText("Duration · 45min")).not.toBeInTheDocument();
    expect(buttons[1]).toBeDisabled();
    fireEvent.click(buttons[1]);
    expect(onSelectSession).not.toHaveBeenCalled();
    const later = within(afternoon).getByRole("button", { name: /1:10 PM ~ 1:55 PM/ });
    expect(within(later).queryByRole("img")).not.toBeInTheDocument();
    fireEvent.click(later);
    expect(onSelectSession).toHaveBeenCalledExactlyOnceWith("afternoon");
    expect(screen.queryByRole("button", { name: /8:30 AM/ })).not.toBeInTheDocument();
  });

  it("uses Seoul time for grouping UTC timestamps and preserves sessions without timestamps", () => {
    renderWithIntl(
      <AvailabilityCalendarDialog
        sessions={[
          { ...slot("utc", "13:10", "1:10 PM"), startAt: `${dateKey}T04:10:00Z` },
          { ...slot("legacy", "08:15", "8:15 AM"), startAt: undefined },
        ]}
        selectedSessionId={null}
        onSelectSession={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      within(screen.getByRole("group", { name: "Afternoon" })).getByRole("button", {
        name: /1:10 PM/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /8:15 AM/ })).toBeEnabled();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("localizes period headings and seats without inventing unavailable weather", () => {
    renderWithIntl(
      <AvailabilityCalendarDialog
        sessions={[slot("ko", "08:15", "오전 8:15", 2)]}
        selectedSessionId={null}
        durationMinutes={45}
        onSelectSession={vi.fn()}
        onClose={vi.fn()}
      />,
      { locale: "ko" },
    );
    const morning = screen.getByRole("group", { name: "오전" });
    expect(within(morning).getByRole("button", { name: /오전 8:15 ~ 오전 9:00/ })).toBeEnabled();
    expect(within(morning).getByText("~ 오전 9:00")).toHaveClass("text-muted");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
