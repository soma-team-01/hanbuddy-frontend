import { TopAppBar } from "@/components/layout/TopAppBar";
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

  return (
    <div className="flex flex-1 flex-col">
      <TopAppBar />
      <PaymentSuccessContent applicationId={normalizedApplicationId} />
    </div>
  );
}
