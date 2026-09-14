import { afterEach, expect, it, vi } from "vitest";
import { getMyAgreements, updateMarketingConsent } from "./agreements";

afterEach(() => vi.unstubAllGlobals());

it("reads agreements through the same-origin BFF without a user ID", async () => {
  const data = { userType: "TOURIST", agreements: [] };
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ isSuccess: true, result: data })));
  vi.stubGlobal("fetch", fetcher);
  await expect(getMyAgreements()).resolves.toEqual({ status: "success", data });
  expect(fetcher.mock.calls[0][0]).toBe("/api/users/me/agreements");
});

it.each([{ agreed: true, version: "2026-09-07" }, { agreed: false }] as const)(
  "sends only the marketing decision %j",
  async (request) => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          isSuccess: true,
          result: { type: "MARKETING_COMMUNICATION", ...request },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    await updateMarketingConsent(request);
    expect(fetcher.mock.calls[0][0]).toBe("/api/users/me/marketing-consent");
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      method: "PATCH",
      body: JSON.stringify(request),
    });
  },
);

it("preserves version errors instead of silently retrying ON", async () => {
  const fetcher = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ isSuccess: false, code: "USER400_MARKETING_VERSION" }), {
      status: 400,
    }),
  );
  vi.stubGlobal("fetch", fetcher);
  await expect(updateMarketingConsent({ agreed: true, version: "old" })).resolves.toMatchObject({
    status: "error",
    error: { code: "USER400_MARKETING_VERSION" },
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
