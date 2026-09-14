import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";
import { getBackend, patchBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { GET } from "@/app/api/users/me/agreements/route";
import { PATCH } from "@/app/api/users/me/marketing-consent/route";

vi.mock("@/lib/auth/backend", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/backend")>()),
  getBackend: vi.fn(),
  patchBackend: vi.fn(),
}));
const payload = {
  isSuccess: true as const,
  code: "200",
  message: "ok",
  result: { agreements: [] },
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getBackend).mockResolvedValue({ status: 200, payload, setCookies: [] });
  vi.mocked(patchBackend).mockResolvedValue({ status: 200, payload, setCookies: [] });
});
const request = (body?: string) =>
  new NextRequest("http://localhost/api/users/me/agreements", {
    method: body === undefined ? "GET" : "PATCH",
    headers: { cookie: `${AUTH_COOKIES.accessToken}=token` },
    body,
  });

it("requires an authenticated cookie for both routes", async () => {
  expect((await GET(new NextRequest("http://localhost/api/users/me/agreements"))).status).toBe(401);
  expect(
    (
      await PATCH(
        new NextRequest("http://localhost/api/users/me/marketing-consent", { method: "PATCH" }),
      )
    ).status,
  ).toBe(401);
  expect(getBackend).not.toHaveBeenCalled();
  expect(patchBackend).not.toHaveBeenCalled();
});
it("proxies the exact agreements path and preserves cookies", async () => {
  vi.mocked(getBackend).mockResolvedValue({
    status: 200,
    payload,
    setCookies: ["test=updated; Path=/; HttpOnly"],
  });
  const response = await GET(request());
  expect(getBackend).toHaveBeenCalledWith("/users/me/agreements", { bearerToken: "token" });
  expect(response.headers.get("set-cookie")).toContain("test=updated");
  await expect(response.json()).resolves.toEqual(payload);
});
it.each([{ agreed: true, version: "2026-09-07" }, { agreed: false }])(
  "proxies only the supported marketing payload %j",
  async (body) => {
    await PATCH(request(JSON.stringify({ ...body, userId: 99, type: "TERMS_OF_SERVICE" })));
    expect(patchBackend).toHaveBeenCalledWith("/users/me/marketing-consent", body, {
      bearerToken: "token",
    });
  },
);
it.each([
  "{",
  "null",
  "{}",
  '{"agreed":null}',
  '{"agreed":"true"}',
  '{"agreed":true}',
  '{"agreed":true,"version":""}',
])("rejects malformed decisions %s", async (body) => {
  expect((await PATCH(request(body))).status).toBe(400);
  expect(patchBackend).not.toHaveBeenCalled();
});
it("allows OFF without validating a stale version", async () => {
  await PATCH(request('{"agreed":false,"version":"old"}'));
  expect(patchBackend).toHaveBeenCalledWith(
    "/users/me/marketing-consent",
    { agreed: false },
    { bearerToken: "token" },
  );
});
it.each([400, 401, 403, 404])("preserves backend status %i for both routes", async (status) => {
  const error = {
    status,
    payload: { isSuccess: false as const, code: "USER400_MARKETING_VERSION", message: "error" },
    setCookies: [],
  };
  vi.mocked(getBackend).mockResolvedValue(error);
  vi.mocked(patchBackend).mockResolvedValue(error);
  for (const response of [await GET(request()), await PATCH(request('{"agreed":false}'))]) {
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual(error.payload);
  }
});
it("reports connection failures as 502", async () => {
  vi.mocked(getBackend).mockRejectedValue(new Error("offline"));
  vi.mocked(patchBackend).mockRejectedValue(new Error("offline"));
  expect((await GET(request())).status).toBe(502);
  expect((await PATCH(request('{"agreed":false}'))).status).toBe(502);
});
