"use client";

import { useTranslations } from "next-intl";
import { InstagramIcon, KakaoTalkIcon, MailIcon, WhatsAppIcon } from "@/components/ui/icons";
import { CONTACT_DETAILS } from "@/lib/contact-details";

/** Keep support destinations consistent across activity and payment inquiries. */
export function ContactChannelLinks({
  message,
  onChannelClick,
}: Readonly<{ message?: string; onChannelClick?: (channel: string) => void }>) {
  const t = useTranslations("AlternativePayment");
  const channels = [
    {
      name: "WhatsApp",
      channel: "whatsapp",
      Icon: WhatsAppIcon,
      href: message
        ? `${CONTACT_DETAILS.whatsappUrl}?text=${encodeURIComponent(message)}`
        : CONTACT_DETAILS.whatsappUrl,
    },
    { name: "KakaoTalk", channel: "kakao", Icon: KakaoTalkIcon, href: CONTACT_DETAILS.kakaoUrl },
    {
      name: "Instagram",
      channel: "instagram",
      Icon: InstagramIcon,
      href: CONTACT_DETAILS.instagramUrl,
    },
    { name: t("email"), channel: "email", Icon: MailIcon, href: `mailto:${CONTACT_DETAILS.email}` },
  ];

  return (
    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {channels.map(({ name, channel, Icon, href }) => (
        <a
          key={name}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onChannelClick?.(channel)}
          className="flex min-h-20 min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-line-soft px-1 py-3 text-xs font-medium text-ink transition-colors hover:border-primary hover:text-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Icon aria-hidden className="size-6 text-primary" />
          <span>{name}</span>
        </a>
      ))}
    </div>
  );
}
