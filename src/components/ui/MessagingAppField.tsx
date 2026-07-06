"use client";

import { CountrySelect } from "@/components/ui/CountrySelect";
import { MessageSquareIcon, PhoneIcon } from "@/components/ui/icons";

export const MESSAGING_APPS = [
  { key: "whatsapp", label: "WhatsApp", Icon: MessageSquareIcon },
  { key: "line", label: "Line", Icon: MessageSquareIcon },
  { key: "wechat", label: "WeChat", Icon: MessageSquareIcon },
  { key: "phone", label: "Phone Number", Icon: PhoneIcon },
] as const;

interface MessagingAppFieldProps {
  app: string;
  onAppChange: (key: string) => void;
  /** 전화번호 입력 시 사용할 국가(ISO alpha-2) */
  country: string;
  onCountryChange: (code: string) => void;
}

/** 메시징 앱 단일 선택 + 앱 특성에 맞는 연락처 입력(온보딩·프로필 수정 공용) */
export function MessagingAppField({
  app,
  onAppChange,
  country,
  onCountryChange,
}: Readonly<MessagingAppFieldProps>) {
  return (
    <>
      <div className="flex flex-col rounded-xl border border-line bg-white">
        {MESSAGING_APPS.map(({ key, label, Icon }, index) => {
          const isSelected = app === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onAppChange(key)}
              className={`flex items-center gap-3 px-4 py-3.5 text-left ${
                index > 0 ? "border-t border-line" : ""
              }`}
            >
              <span
                aria-hidden
                className={`flex size-4 items-center justify-center rounded-full border ${
                  isSelected ? "border-forest" : "border-line-strong"
                }`}
              >
                {isSelected && <span className="size-2 rounded-full bg-forest" />}
              </span>
              <Icon className="size-5 text-success" />
              <span className="text-base text-ink">{label}</span>
            </button>
          );
        })}
      </div>
      {/* WhatsApp·전화번호는 번호 기반, LINE·WeChat은 ID 기반으로 연락처를 교환한다 */}
      {app === "whatsapp" || app === "phone" ? (
        <div className="mt-1 flex gap-2">
          <div className="shrink-0">
            <CountrySelect
              value={country}
              onChange={onCountryChange}
              display="dialCode"
              ariaLabel="Messaging country code"
              triggerClassName="flex items-center gap-2 rounded-xl border border-line bg-chip py-3.5 pr-3 pl-4 text-base text-ink"
            />
          </div>
          <input
            type="tel"
            placeholder="Phone number"
            aria-label="Messaging phone number"
            className="w-full rounded-xl border border-line bg-white px-4 py-3.5 text-base text-ink placeholder:text-ink-soft/60"
          />
        </div>
      ) : (
        <input
          type="text"
          placeholder={`${MESSAGING_APPS.find((item) => item.key === app)?.label} ID`}
          aria-label="Messaging app ID"
          className="mt-1 w-full rounded-xl border border-line bg-white px-4 py-3.5 text-base text-ink placeholder:text-ink-soft/60"
        />
      )}
    </>
  );
}
