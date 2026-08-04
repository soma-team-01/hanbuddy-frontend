"use client";

import { useTranslations } from "next-intl";
import { CountrySelect } from "@/components/ui/CountrySelect";
import { MessageSquareIcon, PhoneIcon } from "@/components/ui/icons";
import type { ContactMethod } from "@/lib/auth/types";
import { formatKoreanPhone, toDigits } from "@/lib/phone";

export const MESSAGING_APPS = [
  { key: "whatsapp", label: "WhatsApp", Icon: MessageSquareIcon },
  { key: "line", label: "Line", Icon: MessageSquareIcon },
  { key: "wechat", label: "WeChat", Icon: MessageSquareIcon },
  { key: "phone", label: null, Icon: PhoneIcon },
] as const;

export type MessagingAppKey = (typeof MESSAGING_APPS)[number]["key"];

export const CONTACT_METHOD_BY_APP: Record<MessagingAppKey, ContactMethod> = {
  whatsapp: "WHATSAPP",
  line: "LINE",
  wechat: "WECHAT",
  phone: "PHONE",
};

export const APP_BY_CONTACT_METHOD: Record<ContactMethod, MessagingAppKey> = {
  WHATSAPP: "whatsapp",
  LINE: "line",
  WECHAT: "wechat",
  PHONE: "phone",
};

interface MessagingAppFieldProps {
  app: MessagingAppKey;
  onAppChange: (key: MessagingAppKey) => void;
  /** 전화번호 입력 시 사용할 국가(ISO alpha-2) */
  country: string;
  onCountryChange: (code: string) => void;
  /** 연락처 값 - 전화번호형 앱은 숫자만, ID형 앱은 자유 텍스트 */
  contactValue: string;
  onContactChange: (value: string) => void;
  inputName?: string;
  inputRequired?: boolean;
  /** true면 국가 선택 대신 +82를 고정 표시한다 (버디 - 한국 번호 전제) */
  koreanOnly?: boolean;
  /** 온보딩에서는 한눈에 비교할 수 있는 카드형 선택지를 사용한다. */
  variant?: "list" | "cards";
}

/** 메시징 앱 단일 선택 + 앱 특성에 맞는 연락처 입력(온보딩·프로필 수정 공용) */
export function MessagingAppField({
  app,
  onAppChange,
  country,
  onCountryChange,
  contactValue,
  onContactChange,
  inputName,
  inputRequired = false,
  koreanOnly = false,
  variant = "list",
}: Readonly<MessagingAppFieldProps>) {
  const t = useTranslations("Messaging");

  return (
    <>
      <div
        className={
          variant === "cards"
            ? "grid grid-cols-2 gap-2 md:grid-cols-4"
            : "flex flex-col overflow-hidden rounded-xl border border-line-soft bg-panel"
        }
      >
        {MESSAGING_APPS.map(({ key, label, Icon }, index) => {
          const isSelected = app === key;
          const displayLabel = label ?? t("phoneNumber");
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onAppChange(key)}
              className={`flex items-center gap-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong ${
                variant === "cards"
                  ? `min-h-16 rounded-xl border px-3 py-3 ${
                      isSelected
                        ? "border-primary bg-primary-soft text-primary-strong"
                        : "border-line-soft bg-canvas-soft text-ink hover:border-line-strong"
                    }`
                  : `px-4 py-3.5 hover:bg-primary-soft/60 ${
                      index > 0 ? "border-t border-line-soft" : ""
                    }`
              }`}
            >
              <span
                aria-hidden
                className={`flex size-4 items-center justify-center rounded-full border ${
                  isSelected ? "border-primary-strong" : "border-line-strong"
                }`}
              >
                {isSelected && <span className="size-2 rounded-full bg-primary-strong" />}
              </span>
              <Icon className={`size-5 ${variant === "cards" ? "text-primary" : "text-success"}`} />
              <span className="text-sm font-semibold text-inherit md:text-base">
                {displayLabel}
              </span>
            </button>
          );
        })}
      </div>
      {/* WhatsApp·전화번호는 번호 기반, LINE·WeChat은 ID 기반으로 연락처를 교환한다 */}
      {app === "whatsapp" || app === "phone" ? (
        <div className="mt-1 flex gap-2">
          {koreanOnly ? (
            <span className="flex shrink-0 items-center rounded-xl border border-line-soft bg-panel-raised px-4 py-3.5 text-base text-ink">
              +82
            </span>
          ) : (
            <div className="shrink-0">
              <CountrySelect
                value={country}
                onChange={onCountryChange}
                display="dialCode"
                ariaLabel={t("countryCode")}
                triggerClassName="flex items-center gap-2 rounded-xl border border-line-soft bg-panel-raised py-3.5 pr-3 pl-4 text-base text-ink transition-colors hover:border-line-strong"
              />
            </div>
          )}
          <input
            name={inputName}
            type="tel"
            required={inputRequired}
            value={koreanOnly ? formatKoreanPhone(contactValue) : contactValue}
            onChange={(e) => {
              const digits = toDigits(e.target.value);
              onContactChange(koreanOnly ? digits.slice(0, 11) : digits);
            }}
            placeholder={koreanOnly ? t("koreanPhonePlaceholder") : t("phonePlaceholder")}
            aria-label={t("phoneInputLabel")}
            className="w-full rounded-xl border border-line-soft bg-panel px-4 py-3.5 text-base text-ink placeholder:text-muted/70"
          />
        </div>
      ) : (
        <input
          name={inputName}
          type="text"
          required={inputRequired}
          value={contactValue}
          onChange={(e) => onContactChange(e.target.value)}
          placeholder={t("appIdPlaceholder", {
            app: MESSAGING_APPS.find((item) => item.key === app)?.label ?? t("phoneNumber"),
          })}
          aria-label={t("appIdInputLabel")}
          className="mt-1 w-full rounded-xl border border-line-soft bg-panel px-4 py-3.5 text-base text-ink placeholder:text-muted/70"
        />
      )}
    </>
  );
}
