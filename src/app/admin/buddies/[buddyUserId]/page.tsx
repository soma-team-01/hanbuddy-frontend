import { AdminHeader } from "../../admin-header";
import { BuddyApplicationReview } from "./buddy-application-review";

export default async function BuddyApplicationPage({
  params,
}: {
  params: Promise<{ buddyUserId: string }>;
}) {
  const { buddyUserId } = await params;
  return (
    <>
      <AdminHeader />
      <BuddyApplicationReview userId={buddyUserId} />
    </>
  );
}
