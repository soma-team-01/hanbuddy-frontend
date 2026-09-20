"use client";

import type { AnchorHTMLAttributes } from "react";
import type { Locale } from "@/i18n/routing";
import { useMeasurementEvents } from "./AnalyticsProvider";

export type InquiryChannel = "email" | "whatsapp" | "facebook" | "kakao" | "instagram";
export type InquiryPlacement = "landing_contact" | "site_footer" | "payment_inquiry";

export function TrackedInquiryLink({
  channel,
  placement,
  locale,
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  channel: InquiryChannel;
  placement: InquiryPlacement;
  locale: Locale;
}) {
  const { trackInquiry } = useMeasurementEvents();
  return (
    <a
      {...props}
      onClick={(event) => {
        trackInquiry({ channel, placement, locale });
        onClick?.(event);
      }}
    />
  );
}
