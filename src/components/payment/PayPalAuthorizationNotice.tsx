import { useTranslations } from "next-intl";
import { paypalAuthorizationMessage } from "@/lib/payments/paypal-authorization";
import type { Application } from "@/types/application";

/** Payment hold/release information is independent from the application status and refunds. */
export function PayPalAuthorizationNotice({
  application,
}: Readonly<{ application: Pick<Application, "paypalAuthorization" | "paymentStatus"> }>) {
  const t = useTranslations("PayPalAuthorization");
  const message = paypalAuthorizationMessage(application);
  if (!message) return null;
  return (
    <p
      role="status"
      className="border-l-2 border-primary pl-3 text-sm leading-6 [overflow-wrap:anywhere] text-muted max-md:text-xs max-md:leading-5"
    >
      {t(message === "processing" ? "processingShort" : message)}
    </p>
  );
}
