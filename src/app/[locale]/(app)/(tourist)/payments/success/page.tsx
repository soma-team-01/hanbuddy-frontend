import { PaymentSuccessContent } from "./payment-success-content";

interface PaymentSuccessPageProps {
  searchParams: Promise<{
    applicationId?: string | string[];
    paymentKey?: string | string[];
    orderId?: string | string[];
    amount?: string | string[];
  }>;
}

function normalizeParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function PaymentSuccessPage({
  searchParams,
}: Readonly<PaymentSuccessPageProps>) {
  const { applicationId, paymentKey, orderId, amount } = await searchParams;
  const normalizedApplicationId =
    typeof applicationId === "string" && /^\d+$/.test(applicationId) ? applicationId : "";
  const normalizedAmount = normalizeParam(amount);

  return (
    <PaymentSuccessContent
      applicationId={normalizedApplicationId}
      paymentKey={normalizeParam(paymentKey)}
      orderId={normalizeParam(orderId)}
      amount={/^\d+$/.test(normalizedAmount) ? Number(normalizedAmount) : null}
    />
  );
}
