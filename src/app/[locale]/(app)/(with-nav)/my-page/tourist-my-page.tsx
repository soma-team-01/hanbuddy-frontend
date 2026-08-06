import { getUserTypeHomePath } from "@/lib/auth/routes";
import { MyPageContent } from "./my-page-content";

export function TouristMyPage() {
  return <MyPageContent backHref={getUserTypeHomePath("TOURIST")} userType="TOURIST" />;
}
