import { describe, expect, it } from "vitest";
import type { ActivityWeatherResult, Session } from "@/types/activity";
import { getSessionWeather } from "./AvailabilityCalendarDialog";

const weather: ActivityWeatherResult = {
  available: true,
  unavailableReason: null,
  provider: "GOOGLE",
  timeZone: "Asia/Seoul",
  baseDate: "2026-08-24",
  forecasts: [
    {
      date: "2026-08-24",
      minTemperatureCelsius: 22,
      maxTemperatureCelsius: 29,
      daytime: {
        condition: "PARTLY_CLOUDY",
        description: "Partly cloudy",
        iconUrl: "https://maps.gstatic.com/weather/v1/partly_cloudy.svg",
        precipitationProbability: 20,
      },
      nighttime: {
        condition: "CLEAR",
        description: "Clear",
        iconUrl: "https://maps.gstatic.com/weather/v1/clear.svg",
        precipitationProbability: 10,
      },
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
  it("uses daytime from 07:00 through 18:59 and nighttime otherwise", () => {
    expect(
      getSessionWeather(session("2026-08-24T07:00:00+09:00"), weather)?.dayPart.condition,
    ).toBe("PARTLY_CLOUDY");
    expect(
      getSessionWeather(session("2026-08-24T18:59:00+09:00"), weather)?.dayPart.condition,
    ).toBe("PARTLY_CLOUDY");
    expect(
      getSessionWeather(session("2026-08-24T19:00:00+09:00"), weather)?.dayPart.condition,
    ).toBe("CLEAR");
    expect(
      getSessionWeather(session("2026-08-24T06:59:00+09:00"), weather)?.dayPart.condition,
    ).toBe("CLEAR");
  });

  it("hides weather when the forecast is unavailable or outside the returned dates", () => {
    expect(getSessionWeather(session("2026-08-25T10:00:00+09:00"), weather)).toBeNull();
    expect(
      getSessionWeather(session("2026-08-24T10:00:00+09:00"), { ...weather, available: false }),
    ).toBeNull();
  });
});
