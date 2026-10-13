import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import type { ActivityWeatherResult, Session } from "@/types/activity";
import { SessionWeatherSummary } from "./SessionWeatherSummary";

const session: Session = {
  id: "1",
  startAt: "2026-10-15T08:30:00+09:00",
  dateKey: "2026-10-15",
  dateLabel: "Oct 15",
  timeLabel: "8:30 AM",
  spotsLeft: 4,
};
const weather: ActivityWeatherResult = {
  available: true,
  unavailableReason: null,
  provider: "KMA",
  timeZone: "Asia/Seoul",
  issuedAt: "2026-10-13T17:00:00+09:00",
  baseDate: "2026-10-13",
  forecasts: [
    {
      forecastAt: "2026-10-15T08:00:00+09:00",
      temperatureCelsius: -2.5,
      condition: "CLEAR",
      precipitationProbability: 0,
    },
    {
      forecastAt: "2026-10-15T09:00:00+09:00",
      temperatureCelsius: 0,
      condition: "CLOUDY",
      precipitationProbability: null,
    },
  ],
};

describe("SessionWeatherSummary", () => {
  it.each(["en", "ko"] as const)(
    "shows a compact forecast and updates with the selected session in %s",
    (locale) => {
      const { container, rerender } = renderWithIntl(
        <SessionWeatherSummary session={session} weather={weather} />,
        { locale },
      );
      expect(screen.getByText("-2.5°C")).toBeInTheDocument();
      expect(
        screen.getByRole("img", { name: locale === "ko" ? "맑음" : "Clear" }),
      ).toBeInTheDocument();
      expect(container.querySelector("details, summary, button")).toBeNull();
      rerender(
        <SessionWeatherSummary
          session={{ ...session, startAt: "2026-10-15T09:00:00+09:00" }}
          weather={weather}
        />,
      );
      expect(screen.getByText("0°C")).toBeInTheDocument();
      expect(screen.queryByText("-2.5°C")).not.toBeInTheDocument();
      rerender(
        <SessionWeatherSummary
          session={{ ...session, startAt: "2026-10-21T08:30:00+09:00" }}
          weather={weather}
        />,
      );
      expect(container).toBeEmptyDOMElement();
    },
  );

  it("omits unavailable forecasts and unselected sessions", () => {
    const { container, rerender } = renderWithIntl(
      <SessionWeatherSummary session={null} weather={weather} />,
    );
    expect(container).toBeEmptyDOMElement();
    rerender(
      <SessionWeatherSummary session={session} weather={{ ...weather, available: false }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
