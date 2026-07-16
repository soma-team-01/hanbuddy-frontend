import { SERVICE_TIME_ZONE } from "@/lib/datetime";

export { SERVICE_TIME_ZONE };

export const formats = {
  dateTime: {
    serviceDate: { year: "numeric", month: "short", day: "numeric", timeZone: SERVICE_TIME_ZONE },
    serviceTime: { hour: "numeric", minute: "2-digit", timeZone: SERVICE_TIME_ZONE },
  },
  number: {
    krw: {
      style: "currency",
      currency: "KRW",
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0,
    },
  },
} as const;
