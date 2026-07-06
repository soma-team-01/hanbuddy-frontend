"use client";

import { CountrySelect } from "@/components/ui/CountrySelect";
import { MessageSquareIcon, PhoneIcon } from "@/components/ui/icons";
import { formatKoreanPhone, toDigits } from "@/lib/phone";

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
  /** 연락처 값 - 전화번호형 앱은 숫자만, ID형 앱은 자유 텍스트 */
  contactValue: string;
  onContactChange: (value: string) => void;
  /** true면 국가 선택 대신 +82를 고정 표시한다 (버디 - 한국 번호 전제) */
  koreanOnly?: boolean;
}

/** 메시징 앱 단일 선택 + 앱 특성에 맞는 연락처 입력(온보딩·프로필 수정 공용) */
export function MessagingAppField({
  app,
  onAppChange,
  country,
  onCountryChange,
  contactValue,
  onContactChange,
  koreanOnly = false,
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
          {koreanOnly ? (
            <span className="flex shrink-0 items-center rounded-xl border border-line bg-chip px-4 py-3.5 text-base text-ink">
              +82
            </span>
          ) : (
            <div className="shrink-0">
              <CountrySelect
                value={country}
                onChange={onCountryChange}
                display="dialCode"
                ariaLabel="Messaging country code"
                triggerClassName="flex items-center gap-2 rounded-xl border border-line bg-chip py-3.5 pr-3 pl-4 text-base text-ink"
              />
            </div>
          )}
          <input
            type="tel"
            value={koreanOnly ? formatKoreanPhone(contactValue) : contactValue}
            onChange={(e) => {
              const digits = toDigits(e.target.value);
              onContactChange(koreanOnly ? digits.slice(0, 11) : digits);
            }}
            placeholder={koreanOnly ? "010-XXXX-XXXX" : "Phone number"}
            aria-label="Messaging phone number"
            className="w-full rounded-xl border border-line bg-white px-4 py-3.5 text-base text-ink placeholder:text-ink-soft/60"
          />
        </div>
      ) : (
        <input
          type="text"
          value={contactValue}
          onChange={(e) => onContactChange(e.target.value)}
          placeholder={`${MESSAGING_APPS.find((item) => item.key === app)?.label} ID`}
          aria-label="Messaging app ID"
          className="mt-1 w-full rounded-xl border border-line bg-white px-4 py-3.5 text-base text-ink placeholder:text-ink-soft/60"
        />
      )}
    </>
  );
}
