import { ActivityDetailContent } from "./activity-detail-content";

export default async function ActivityDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;

  return <ActivityDetailContent activityId={id} />;
}
