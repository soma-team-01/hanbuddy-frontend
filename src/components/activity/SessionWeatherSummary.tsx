"use client";

import { useLocale, useTranslations } from "next-intl";
import { getIntlLocale } from "@/i18n/routing";
import type { ActivityWeatherResult, Session } from "@/types/activity";
import {
  getSessionWeather,
  getWeatherIconColor,
  WeatherConditionIcon,
  WEATHER_CONDITION_KEYS,
} from "./AvailabilityCalendarDialog";

/** Compact, non-interactive forecast inside a date selector. */
export function SessionWeatherSummary({
  session,
  weather,
}: Readonly<{ session: Session | null; weather?: ActivityWeatherResult }>) {
  const t = useTranslations("ActivityDetail");
  const locale = useLocale();
  const forecast = session ? getSessionWeather(session, weather) : null;
  if (!forecast) return null;
  const condition = t(`weatherConditions.${WEATHER_CONDITION_KEYS[forecast.condition]}`);
  const temperature = new Intl.NumberFormat(getIntlLocale(locale), {
    maximumFractionDigits: 1,
  }).format(forecast.temperatureCelsius);
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-normal whitespace-nowrap text-muted">
      <span
        role="img"
        aria-label={condition}
        className={`inline-flex ${getWeatherIconColor(forecast.condition)}`}
      >
        <WeatherConditionIcon condition={forecast.condition} className="size-3.5" />
      </span>
      {t("weatherTemperature", { temperature })}
    </span>
  );
}
