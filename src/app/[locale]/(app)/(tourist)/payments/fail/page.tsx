import { resolveTossFailReasonKey } from "@/lib/payments/toss-fail-codes";
import { PaymentFailContent } from "./payment-fail-content";

interface PaymentFailPageProps {
  searchParams: Promise<{ code?: string | string[] }>;
}

export default async function PaymentFailPage({ searchParams }: Readonly<PaymentFailPageProps>) {
  const { code } = await searchParams;

  // 토스가 함께 전달하는 message는 임의 문구가 노출될 수 있어 사용하지 않는다
  return (
    <PaymentFailContent
      reasonKey={resolveTossFailReasonKey(typeof code === "string" ? code : null)}
    />
  );
}
