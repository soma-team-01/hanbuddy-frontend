import type { NextRequest } from "next/server";
import { handleEmailAuth } from "@/lib/auth/email-route";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  return handleEmailAuth(request, "password/reset/validate");
}
