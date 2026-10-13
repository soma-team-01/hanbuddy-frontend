import { buddyActivityApplicationsQueryOptions } from "./buddy";
import type { ContentLanguage } from "@/types/content-language";
import { getBuddyActivityApplications } from "@/lib/api/buddy";
import { unwrapApiResult } from "./result";

/** Date summaries omit cancellations, so check details with bounded concurrency. */
export function createDashboardRequestQueue(concurrency = 4) {
  let running = 0;
  const waiting: (() => void)[] = [];
  return async function run<T>(request: () => Promise<T>, signal: AbortSignal): Promise<T> {
    if (running >= concurrency) await new Promise<void>((resolve) => waiting.push(resolve));
    else running++;
    try {
      signal.throwIfAborted();
      const result = await request();
      signal.throwIfAborted();
      return result;
    } finally {
      const next = waiting.shift();
      if (next) next();
      else running--;
    }
  };
}

export function dashboardSessionQueryOptions(
  id: number,
  language: ContentLanguage,
  run: ReturnType<typeof createDashboardRequestQueue>,
) {
  const options = buddyActivityApplicationsQueryOptions(id, language);
  return {
    ...options,
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      run(
        async () =>
          unwrapApiResult(await getBuddyActivityApplications(id, language), "applications"),
        signal,
      ),
    refetchOnWindowFocus: "always" as const,
  };
}
