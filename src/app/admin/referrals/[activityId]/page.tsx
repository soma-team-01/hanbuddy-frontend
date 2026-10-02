import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { AdminShell } from "@/app/admin/admin-shell";
import messages from "@/messages/ko.json";
import { ReferralActivityPreview } from "./referral-activity-preview";

export default async function ReferralActivityPage({
  params,
}: {
  params: Promise<{ activityId: string }>;
}) {
  const { activityId } = await params;
  if (!/^[1-9]\d*$/.test(activityId) || !Number.isSafeInteger(Number(activityId))) notFound();
  return (
    <AdminShell>
      <NextIntlClientProvider locale="ko" messages={messages} timeZone="Asia/Seoul">
        <ReferralActivityPreview activityId={Number(activityId)} />
      </NextIntlClientProvider>
    </AdminShell>
  );
}
