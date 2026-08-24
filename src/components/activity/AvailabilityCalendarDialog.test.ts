import { describe, expect, it } from "vitest";
import type { ActivityWeatherResult, Session } from "@/types/activity";
import { getSessionWeather } from "./AvailabilityCalendarDialog";

const weather: ActivityWeatherResult = {
  available: true,
  unavailableReason: null,
  provider: "KMA",
  timeZone: "Asia/Seoul",
  issuedAt: "2026-08-24T14:00:00+09:00",
  baseDate: "2026-08-24",
  forecasts: [
    {
      forecastAt: "2026-08-24T14:00:00+09:00",
      temperatureCelsius: 28,
      condition: "PARTLY_CLOUDY",
      precipitationProbability: 20,
    },
    {
      forecastAt: "2026-08-24T15:00:00+09:00",
      temperatureCelsius: 29,
      condition: "RAIN",
      precipitationProbability: 60,
    },
    {
      forecastAt: "2026-08-25T14:00:00+09:00",
      temperatureCelsius: 27,
      condition: "CLOUDY",
      precipitationProbability: null,
    },
  ],
};

function session(startAt: string): Session {
  return {
    id: startAt,
    startAt,
    dateKey: startAt.slice(0, 10),
    dateLabel: "Aug 24",
    timeLabel: startAt.slice(11, 16),
    spotsLeft: 2,
  };
}

describe("activity schedule weather matching", () => {
  it("selects the nearest forecast on the same Seoul date", () => {
    expect(getSessionWeather(session("2026-08-24T14:20:00+09:00"), weather)?.condition).toBe(
      "PARTLY_CLOUDY",
    );
    expect(getSessionWeather(session("2026-08-24T14:40:00+09:00"), weather)?.condition).toBe(
      "RAIN",
    );
  });

  it("selects the earlier forecast when two forecasts are equally close", () => {
    expect(getSessionWeather(session("2026-08-24T14:30:00+09:00"), weather)?.condition).toBe(
      "PARTLY_CLOUDY",
    );
  });

  it("hides weather when the forecast is unavailable or absent on the schedule date", () => {
    expect(getSessionWeather(session("2026-08-26T10:00:00+09:00"), weather)).toBeNull();
    expect(
      getSessionWeather(session("2026-08-24T10:00:00+09:00"), { ...weather, available: false }),
    ).toBeNull();
  });
});
