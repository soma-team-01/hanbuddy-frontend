import { getUserTypeHomePath } from "@/lib/auth/routes";
import { MyPageContent } from "./my-page-content";

export function BuddyMyPage() {
  return <MyPageContent backHref={getUserTypeHomePath("BUDDY")} />;
}
