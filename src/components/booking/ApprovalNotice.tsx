import { useTranslations } from "next-intl";

export function ApprovalNotice({
  referral = false,
  agreed,
  onAgreedChange,
}: Readonly<{
  referral?: boolean;
  agreed: boolean;
  onAgreedChange: (agreed: boolean) => void;
}>) {
  const t = useTranslations("Approval");
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2.5 px-1 py-1 text-xs leading-5 font-medium text-ink lg:text-[13px]">
      <input
        type="checkbox"
        required
        checked={agreed}
        onChange={(event) => onAgreedChange(event.target.checked)}
        className="size-5 shrink-0 rounded accent-primary"
      />
      <span>{t(referral ? "beforeReferral" : "beforePayment")}</span>
    </label>
  );
}
