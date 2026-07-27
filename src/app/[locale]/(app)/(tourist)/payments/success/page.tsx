import { PaymentSuccessContent } from "./payment-success-content";

interface PaymentSuccessPageProps {
  searchParams: Promise<{ applicationId?: string | string[] }>;
}

export default async function PaymentSuccessPage({
  searchParams,
}: Readonly<PaymentSuccessPageProps>) {
  const { applicationId } = await searchParams;
  const normalizedApplicationId =
    typeof applicationId === "string" && /^\d+$/.test(applicationId) ? applicationId : "";

  return <PaymentSuccessContent applicationId={normalizedApplicationId} />;
}
