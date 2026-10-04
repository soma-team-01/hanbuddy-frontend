import type { NextRequest } from "next/server";
import { handleReferralRoute } from "@/app/api/_utils/referral-backend";
type Context = { params: Promise<{ segments?: string[] }> };
async function handle(request: NextRequest, { params }: Context) {
  return handleReferralRoute(request, ["activities", ...((await params).segments ?? [])], true);
}
export { handle as GET };
