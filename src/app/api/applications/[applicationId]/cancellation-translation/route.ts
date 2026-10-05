import { NextRequest } from "next/server";
import { proxyCancellationTranslation } from "@/app/api/_utils/cancellation-translation";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ applicationId: string }> },
) {
  const { applicationId } = await context.params;
  return proxyCancellationTranslation(request, "application", applicationId);
}
