import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBackend } from "@/lib/auth/backend";
import { GET } from "./route";

vi.mock("@/lib/auth/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/backend")>();
  return { ...actual, getBackend: vi.fn() };
});

const mockedGetBackend = vi.mocked(getBackend);
const context = { params: Promise.resolve({ activityId: "42" }) };

describe("GET /api/activities/[activityId]", () => {
  beforeEach(() => {
    mockedGetBackend.mockReset();
  });

  it("proxies the public tourist activity detail without an access token", async () => {
    mockedGetBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: { activityId: 42 } },
      setCookies: [],
    });

    const response = await GET(new NextRequest("http://localhost/api/activities/42"), context);

    expect(mockedGetBackend).toHaveBeenCalledWith("/activities/42");
    expect(response.status).toBe(200);
  });

  it("keeps the public tourist activity detail available with an authenticated request", async () => {
    mockedGetBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: { activityId: 42 } },
      setCookies: [],
    });

    const response = await GET(new NextRequest("http://localhost/api/activities/42"), context);

    expect(mockedGetBackend).toHaveBeenCalledWith("/activities/42");
    expect(response.status).toBe(200);
  });

  it("encodes the activity id as a backend path segment", async () => {
    mockedGetBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: { activityId: 42 } },
      setCookies: [],
    });

    const response = await GET(new NextRequest("http://localhost/api/activities/42%3Fdebug=true"), {
      params: Promise.resolve({ activityId: "42?debug=true" }),
    });

    expect(mockedGetBackend).toHaveBeenCalledWith("/activities/42%3Fdebug%3Dtrue");
    expect(response.status).toBe(200);
  });
});
