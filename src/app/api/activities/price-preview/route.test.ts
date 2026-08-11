import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { postBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { POST } from "./route";

vi.mock("@/lib/auth/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/backend")>();
  return { ...actual, postBackend: vi.fn() };
});

const mockedPostBackend = vi.mocked(postBackend);
const previewRequest = { price: 50000, currency: "KRW" };

describe("POST /api/activities/price-preview", () => {
  beforeEach(() => {
    mockedPostBackend.mockReset();
  });

  it("returns 401 without calling the backend when the access token cookie is missing", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/activities/price-preview", {
        method: "POST",
        body: JSON.stringify(previewRequest),
      }),
    );

    expect(response.status).toBe(401);
    expect(mockedPostBackend).not.toHaveBeenCalled();
  });

  it("proxies the price preview request with the access token as bearer", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      payload: {
        isSuccess: true,
        code: "200",
        message: "ok",
        result: {
          unitPriceKrw: 50000,
          currency: "KRW",
          commissionRate: 0.1,
          platformCommissionAmountKrw: 5000,
          estimatedGuidePayoutAmountKrw: 45000,
        },
      },
      setCookies: [],
    });

    const response = await POST(
      new NextRequest("http://localhost/api/activities/price-preview", {
        method: "POST",
        body: JSON.stringify(previewRequest),
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
    );

    expect(mockedPostBackend).toHaveBeenCalledWith("/activities/price-preview", previewRequest, {
      bearerToken: "access-token",
    });
    expect(response.status).toBe(200);
  });
});
