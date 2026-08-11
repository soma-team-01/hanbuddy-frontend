import { EditActivityForm } from "./edit-activity-form";

export default async function EditActivityPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;

  return <EditActivityForm activityId={id} />;
}
