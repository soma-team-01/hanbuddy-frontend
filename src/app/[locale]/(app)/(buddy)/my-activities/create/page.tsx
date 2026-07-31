import { BuddyShell } from "@/components/layout/BuddyShell";
import { CreateActivityForm } from "@/app/[locale]/(app)/(buddy)/my-activities/create/create-activity-form";

export default function CreateActivityPage() {
  return (
    <BuddyShell>
      <CreateActivityForm />
    </BuddyShell>
  );
}
