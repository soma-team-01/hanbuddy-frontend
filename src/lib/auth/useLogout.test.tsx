import { act, renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useLogout } from "./useLogout";
import { invalidateAnalyticsAccount } from "@/lib/analytics/cookie-runtime";
vi.mock("@/lib/analytics/cookie-runtime", () => ({ invalidateAnalyticsAccount: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ clear: vi.fn() }) }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
it("invalidates pending linkage before starting logout, including failure", async () => {
  const request = vi.fn(async () => {
    throw new Error("offline");
  });
  vi.stubGlobal("fetch", request);
  const { result } = renderHook(() => useLogout("TOURIST"));
  await act(() => result.current.logout());
  expect(request).toHaveBeenCalled();
  expect(invalidateAnalyticsAccount).toHaveBeenCalled();
  expect(vi.mocked(invalidateAnalyticsAccount).mock.invocationCallOrder[0]).toBeLessThan(
    request.mock.invocationCallOrder[0],
  );
  vi.unstubAllGlobals();
});
