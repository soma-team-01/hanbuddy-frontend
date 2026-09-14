import { PaymentSuccessContent } from "../../success/payment-success-content";
import { PayPalReturnContent } from "./paypal-return-content";

interface PayPalSuccessPageProps {
  searchParams: Promise<{
    applicationId?: string | string[];
    captured?: string | string[];
    token?: string | string[];
  }>;
}

export default async function PayPalSuccessPage({
  searchParams,
}: Readonly<PayPalSuccessPageProps>) {
  const { applicationId, captured, token } = await searchParams;
  const normalizedApplicationId =
    typeof applicationId === "string" && /^\d+$/.test(applicationId) ? applicationId : "";

  if (captured === "1" && normalizedApplicationId) {
    return (
      <PaymentSuccessContent
        applicationId={normalizedApplicationId}
        paymentKey=""
        orderId=""
        amount={null}
      />
    );
  }

  return <PayPalReturnContent token={typeof token === "string" ? token : ""} />;
}
