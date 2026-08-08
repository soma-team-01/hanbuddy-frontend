import { PaymentFailContent } from "./payment-fail-content";

interface PaymentFailPageProps {
  searchParams: Promise<{ message?: string | string[] }>;
}

export default async function PaymentFailPage({ searchParams }: Readonly<PaymentFailPageProps>) {
  const { message } = await searchParams;

  return <PaymentFailContent failMessage={typeof message === "string" ? message : ""} />;
}
