import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";
import { getBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { GET } from "./route";

vi.mock("@/lib/auth/backend", async (original) => ({
  ...(await original<typeof import("@/lib/auth/backend")>()),
  getBackend: vi.fn(),
}));
beforeEach(() => vi.mocked(getBackend).mockReset());
it("requires authentication", async () => {
  expect(
    (await GET(new NextRequest("http://localhost/api/applications/buddy/pending-approvals")))
      .status,
  ).toBe(401);
  expect(getBackend).not.toHaveBeenCalled();
});
it("forwards only pagination and preserves the server total", async () => {
  const result = {
    content: [],
    totalElements: 25,
    totalPages: 2,
    page: 1,
    size: 20,
    hasNext: false,
  };
  vi.mocked(getBackend).mockResolvedValue({
    status: 200,
    payload: { isSuccess: true, code: "200", message: "ok", result },
    setCookies: [],
  });
  const response = await GET(
    new NextRequest(
      "http://localhost/api/applications/buddy/pending-approvals?page=1&size=20&date=2026-10-01&buddyId=999",
      { headers: { cookie: `${AUTH_COOKIES.accessToken}=token` } },
    ),
  );
  expect(getBackend).toHaveBeenCalledWith("/applications/buddy/pending-approvals?page=1&size=20", {
    bearerToken: "token",
  });
  expect((await response.json()).result).toEqual(result);
});
it.each(["page=-1", "page=1.5", "size=101", "size=0", "page=no"])(
  "rejects invalid pagination %s",
  async (query) => {
    expect(
      (
        await GET(
          new NextRequest(`http://localhost/api/applications/buddy/pending-approvals?${query}`),
        )
      ).status,
    ).toBe(400);
    expect(getBackend).not.toHaveBeenCalled();
  },
);
