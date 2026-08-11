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
const createRequest = { activityScheduleId: 101, guestCount: 2, specialRequest: "No pork" };

describe("POST /api/applications", () => {
  beforeEach(() => {
    mockedPostBackend.mockReset();
  });

  it("returns 401 without calling the backend when the access token cookie is missing", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/applications", {
        method: "POST",
        body: JSON.stringify(createRequest),
      }),
    );

    expect(response.status).toBe(401);
    expect(mockedPostBackend).not.toHaveBeenCalled();
  });

  it("proxies the application creation with the access token as bearer", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 201,
      payload: {
        isSuccess: true,
        code: "201",
        message: "created",
        result: { paymentId: 7, paypalOrderId: "5O190127TN364715T" },
      },
      setCookies: [],
    });

    const response = await POST(
      new NextRequest("http://localhost/api/applications", {
        method: "POST",
        body: JSON.stringify(createRequest),
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
    );

    expect(mockedPostBackend).toHaveBeenCalledWith("/applications", createRequest, {
      bearerToken: "access-token",
    });
    expect(response.status).toBe(201);
  });
});
