import { BuddyShell } from "@/components/layout/BuddyShell";
import { getUserTypeHomePath } from "@/lib/auth/routes";
import { MyPageContent } from "./my-page-content";

export function BuddyMyPage() {
  return (
    <BuddyShell>
      <MyPageContent backHref={getUserTypeHomePath("BUDDY")} />
    </BuddyShell>
  );
}
