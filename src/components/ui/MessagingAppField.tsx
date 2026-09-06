"use client";

import { useTranslations } from "next-intl";
import { CountrySelect } from "@/components/ui/CountrySelect";
import { LineIcon, PhoneIcon, WeChatIcon, WhatsAppIcon } from "@/components/ui/icons";
import type { ContactMethod } from "@/lib/auth/types";
import { formatKoreanPhone, toDigits } from "@/lib/phone";

export const MESSAGING_APPS = [
  { key: "whatsapp", label: "WhatsApp", Icon: WhatsAppIcon },
  { key: "line", label: "Line", Icon: LineIcon },
  { key: "wechat", label: "WeChat", Icon: WeChatIcon },
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
  /** 넓은 편집 폼에서는 네 가지 선택지를 한 줄에 배치한다. */
  singleRowOnDesktop?: boolean;
  /** 연락 수단이 정책상 고정된 화면에서는 선택지를 숨기고 입력란만 표시한다. */
  showAppSelector?: boolean;
}

const BRAND_MARK_CLASS: Record<MessagingAppKey, string> = {
  whatsapp: "bg-[#25D366]",
  line: "bg-[#06C755]",
  wechat: "bg-[#07C160]",
  phone: "bg-primary-strong",
};

type MessagingVariant = NonNullable<MessagingAppFieldProps["variant"]>;

function getSelectorClassName(variant: MessagingVariant, singleRowOnDesktop: boolean) {
  if (variant === "cards") {
    return `grid grid-cols-2 gap-2 ${singleRowOnDesktop ? "lg:grid-cols-4" : ""}`;
  }
  return "flex flex-col overflow-hidden rounded-xl border border-line-soft bg-panel";
}

function getOptionClassName(variant: MessagingVariant, isSelected: boolean, index: number) {
  const base =
    "focus-border-only flex items-center gap-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-primary/30";
  if (variant === "cards") {
    const state = isSelected
      ? "border-primary bg-primary-soft text-primary-strong"
      : "border-line-soft bg-canvas-soft text-ink hover:border-line-strong";
    return `${base} min-h-14 gap-2 rounded-xl border px-3 py-2.5 ${state}`;
  }
  const divider = index > 0 ? "border-t border-line-soft" : "";
  return `${base} px-4 py-3.5 hover:bg-primary-soft/60 ${divider}`;
}

interface MessagingAppSelectorProps {
  app: MessagingAppKey;
  onAppChange: (key: MessagingAppKey) => void;
  phoneLabel: string;
  variant: MessagingVariant;
  singleRowOnDesktop: boolean;
}

function MessagingAppSelector({
  app,
  onAppChange,
  phoneLabel,
  variant,
  singleRowOnDesktop,
}: Readonly<MessagingAppSelectorProps>) {
  return (
    <div
      data-testid="messaging-app-options"
      className={getSelectorClassName(variant, singleRowOnDesktop)}
    >
      {MESSAGING_APPS.map(({ key, label, Icon }, index) => {
        const isSelected = app === key;
        const displayLabel = label ?? phoneLabel;
        let appIcon = <Icon data-messaging-icon={key} className="size-5 shrink-0 text-success" />;

        if (variant === "cards") {
          appIcon = (
            <span
              aria-hidden
              data-messaging-brand={key}
              className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-white ${BRAND_MARK_CLASS[key]}`}
            >
              {key === "line" ? (
                <span className="text-[7px] font-black tracking-[-0.04em]">LINE</span>
              ) : (
                <Icon data-messaging-icon={key} className="size-4.5 shrink-0" />
              )}
            </span>
          );
        }

        return (
          <button
            key={key}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onAppChange(key)}
            className={getOptionClassName(variant, isSelected, index)}
          >
            {variant === "list" ? (
              <span
                aria-hidden
                className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                  isSelected ? "border-primary-strong" : "border-line-strong"
                }`}
              >
                {isSelected && <span className="size-2 rounded-full bg-primary-strong" />}
              </span>
            ) : null}
            {appIcon}
            <span className="text-sm font-semibold text-inherit">{displayLabel}</span>
          </button>
        );
      })}
    </div>
  );
}

interface PhoneContactInputProps {
  country: string;
  onCountryChange: (code: string) => void;
  contactValue: string;
  onContactChange: (value: string) => void;
  inputName?: string;
  inputRequired: boolean;
  koreanOnly: boolean;
  variant: MessagingVariant;
  countryCodeLabel: string;
  phoneInputLabel: string;
  phonePlaceholder: string;
  koreanPhonePlaceholder: string;
}

function PhoneContactInput({
  country,
  onCountryChange,
  contactValue,
  onContactChange,
  inputName,
  inputRequired,
  koreanOnly,
  variant,
  countryCodeLabel,
  phoneInputLabel,
  phonePlaceholder,
  koreanPhonePlaceholder,
}: Readonly<PhoneContactInputProps>) {
  const inputBackground = variant === "cards" ? "bg-canvas-soft" : "bg-panel";
  const countryBackground = variant === "cards" ? "bg-canvas-soft" : "bg-panel-raised";

  return (
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
            ariaLabel={countryCodeLabel}
            triggerClassName={`flex items-center gap-2 rounded-xl border border-line-soft py-3 pr-3 pl-4 text-base text-ink transition-colors hover:border-line-strong ${countryBackground}`}
          />
        </div>
      )}
      <input
        name={inputName}
        type="tel"
        required={inputRequired}
        value={koreanOnly ? formatKoreanPhone(contactValue) : contactValue}
        onChange={(event) => {
          const digits = toDigits(event.target.value);
          onContactChange(koreanOnly ? digits.slice(0, 11) : digits);
        }}
        placeholder={koreanOnly ? koreanPhonePlaceholder : phonePlaceholder}
        aria-label={phoneInputLabel}
        className={`focus-border-only w-full rounded-xl border border-line-soft px-4 py-3 text-base text-ink placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary-soft ${inputBackground}`}
      />
    </div>
  );
}

interface AppIdContactInputProps {
  app: MessagingAppKey;
  contactValue: string;
  onContactChange: (value: string) => void;
  inputName?: string;
  inputRequired: boolean;
  variant: MessagingVariant;
  phoneLabel: string;
  inputLabel: string;
  getPlaceholder: (appLabel: string) => string;
}

function AppIdContactInput({
  app,
  contactValue,
  onContactChange,
  inputName,
  inputRequired,
  variant,
  phoneLabel,
  inputLabel,
  getPlaceholder,
}: Readonly<AppIdContactInputProps>) {
  const appLabel = MESSAGING_APPS.find((item) => item.key === app)?.label ?? phoneLabel;
  const inputBackground = variant === "cards" ? "bg-canvas-soft" : "bg-panel";

  return (
    <input
      name={inputName}
      type="text"
      required={inputRequired}
      value={contactValue}
      onChange={(event) => onContactChange(event.target.value)}
      placeholder={getPlaceholder(appLabel)}
      aria-label={inputLabel}
      className={`focus-border-only mt-1 w-full rounded-xl border border-line-soft px-4 py-3 text-base text-ink placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary-soft ${inputBackground}`}
    />
  );
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
  singleRowOnDesktop = false,
  showAppSelector = true,
}: Readonly<MessagingAppFieldProps>) {
  const t = useTranslations("Messaging");
  const usesPhoneNumber = app === "whatsapp" || app === "phone";

  return (
    <>
      {showAppSelector ? (
        <MessagingAppSelector
          app={app}
          onAppChange={onAppChange}
          phoneLabel={t("phoneNumber")}
          variant={variant}
          singleRowOnDesktop={singleRowOnDesktop}
        />
      ) : null}
      {/* WhatsApp·전화번호는 번호 기반, LINE·WeChat은 ID 기반으로 연락처를 교환한다 */}
      {usesPhoneNumber ? (
        <PhoneContactInput
          country={country}
          onCountryChange={onCountryChange}
          contactValue={contactValue}
          onContactChange={onContactChange}
          inputName={inputName}
          inputRequired={inputRequired}
          koreanOnly={koreanOnly}
          variant={variant}
          countryCodeLabel={t("countryCode")}
          phoneInputLabel={t("phoneInputLabel")}
          phonePlaceholder={t("phonePlaceholder")}
          koreanPhonePlaceholder={t("koreanPhonePlaceholder")}
        />
      ) : (
        <AppIdContactInput
          app={app}
          contactValue={contactValue}
          onContactChange={onContactChange}
          inputName={inputName}
          inputRequired={inputRequired}
          variant={variant}
          phoneLabel={t("phoneNumber")}
          inputLabel={t("appIdInputLabel")}
          getPlaceholder={(appLabel) => t("appIdPlaceholder", { app: appLabel })}
        />
      )}
    </>
  );
}
