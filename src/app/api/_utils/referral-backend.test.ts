import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBackend, patchBackend, postBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { handleReferralRoute } from "./referral-backend";
import { GET as notice } from "../activities/[activityId]/referral-notice/route";
import { POST as apply } from "../activities/[activityId]/referral-applications/route";

vi.mock("@/lib/auth/backend", async (original) => ({
  ...(await original<typeof import("@/lib/auth/backend")>()),
  getBackend: vi.fn(),
  patchBackend: vi.fn(),
  postBackend: vi.fn(),
}));
const ok = (result: unknown) => ({
  status: 200,
  payload: { isSuccess: true as const, code: "200", message: "ok", result },
  setCookies: [],
});
const code = "a".repeat(43);
function req(method = "GET", body?: object, query = "", token = true) {
  return new NextRequest(`http://localhost/api/referral${query}`, {
    method,
    headers: token ? { cookie: `${AUTH_COOKIES.accessToken}=token` } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
const context = { params: Promise.resolve({ activityId: "3" }) };
describe("referral BFF", () => {
  beforeEach(() => {
    vi.mocked(getBackend)
      .mockReset()
      .mockResolvedValue(ok({ userType: "ADMIN" }));
    vi.mocked(postBackend)
      .mockReset()
      .mockResolvedValue(ok({ applicationId: 4 }));
    vi.mocked(patchBackend)
      .mockReset()
      .mockResolvedValue(ok({ activityId: 3 }));
  });
  it("rejects unauthenticated and non-admin callers before mutations", async () => {
    expect((await handleReferralRoute(req("POST", {}, "", false), ["activities"])).status).toBe(
      401,
    );
    vi.mocked(getBackend).mockResolvedValue(ok({ userType: "BUDDY" }));
    expect((await handleReferralRoute(req("POST", {}), ["invitations"], true)).status).toBe(403);
    expect(postBackend).not.toHaveBeenCalled();
  });
  it("allows public notice but authenticates applications", async () => {
    expect((await notice(req("GET", undefined, "", false), context)).status).toBe(200);
    const body = {
      activityScheduleId: 12,
      guestCount: 2,
      partnerSharingAgreed: true,
      consentVersion: "live-v2",
    };
    expect((await apply(req("POST", body, "", false), context)).status).toBe(401);
    await apply(req("POST", { ...body, applicantName: "must not pass", price: 5 }), context);
    expect(postBackend).toHaveBeenLastCalledWith("/activities/3/referral-applications", body, {
      bearerToken: "token",
    });
  });
  it.each([false, null])("requires explicit sharing consent (%s)", async (agreed) => {
    expect(
      (
        await apply(
          req("POST", {
            activityScheduleId: 12,
            guestCount: 2,
            partnerSharingAgreed: agreed,
            consentVersion: "v1",
          }),
          context,
        )
      ).status,
    ).toBe(400);
    expect(postBackend).not.toHaveBeenCalled();
  });
  it("uses POST bodies for codes and strips forbidden activity fields", async () => {
    await handleReferralRoute(req("POST", { code }), ["invitations", "validate"]);
    expect(postBackend).toHaveBeenLastCalledWith(
      "/referral/invitations/validate",
      { code },
      { bearerToken: "token" },
    );
    await handleReferralRoute(
      req("POST", {
        code,
        activity: {
          title: "Partner visit",
          price: 3000,
          currency: "USD",
          status: "DRAFT",
          buddyId: 7,
          activityType: "STANDARD",
        },
      }),
      ["activities"],
    );
    expect(postBackend).toHaveBeenLastCalledWith(
      "/referral/activities",
      { code, activity: { title: "Partner visit", status: "ACTIVE" } },
      { bearerToken: "token" },
    );
    await handleReferralRoute(
      req("PATCH", { title: "Edited", price: 50, code, status: "ACTIVE" }),
      ["activities", "3"],
    );
    expect(patchBackend).toHaveBeenLastCalledWith(
      "/referral/activities/3",
      { title: "Edited", status: "ACTIVE" },
      { bearerToken: "token" },
    );
  });
  it("does not log raw code or PII when upstream fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(postBackend).mockRejectedValue(new Error(code));
    const response = await handleReferralRoute(req("POST", { code }), ["invitations", "validate"]);
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain(code);
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
  it("cancels through the bodyless dedicated endpoint", async () => {
    await handleReferralRoute(req("POST"), ["applications", "42", "cancel"]);
    expect(postBackend).toHaveBeenLastCalledWith("/referral/applications/42/cancel", undefined, {
      bearerToken: "token",
    });
  });
  it("does not pass owner filters to partner lists or leak cacheable data", async () => {
    const response = await handleReferralRoute(
      req(
        "GET",
        undefined,
        "?buddyId=7&status=CANCELLED&from=2026-10-01&page=0&size=20&code=secret",
      ),
      ["applications"],
    );
    expect(getBackend).toHaveBeenLastCalledWith(
      "/referral/applications?status=CANCELLED&from=2026-10-01&page=0&size=20",
      { bearerToken: "token" },
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
  it("issues and revokes invitations and lists admin resources", async () => {
    const expiresAt = new Date(Date.now() + 86400000).toISOString();
    await handleReferralRoute(req("POST", { buddyId: 7, expiresAt, code }), ["invitations"], true);
    expect(postBackend).toHaveBeenLastCalledWith(
      "/admin/referral-invitations",
      { buddyId: 7, expiresAt },
      { bearerToken: "token" },
    );
    await handleReferralRoute(req("POST"), ["invitations", "4", "revoke"], true);
    expect(postBackend).toHaveBeenLastCalledWith(
      "/admin/referral-invitations/4/revoke",
      undefined,
      { bearerToken: "token" },
    );
    for (const resource of ["invitations", "activities", "applications"]) {
      await handleReferralRoute(req("GET", undefined, "?page=1&size=20"), [resource], true);
      expect(getBackend).toHaveBeenLastCalledWith(`/admin/referral-${resource}?page=1&size=20`, {
        bearerToken: "token",
      });
    }
    await handleReferralRoute(req(), ["activities", "3"], true);
    expect(getBackend).toHaveBeenLastCalledWith("/admin/referral-activities/3", {
      bearerToken: "token",
    });
  });
  it("rejects unsupported paths, invalid ids and expired invitations", async () => {
    expect((await handleReferralRoute(req(), ["activities", "../users"], true)).status).toBe(400);
    expect(
      (
        await handleReferralRoute(
          req("POST", { buddyId: 7, expiresAt: "2020-01-01T00:00:00Z" }),
          ["invitations"],
          true,
        )
      ).status,
    ).toBe(400);
    expect(postBackend).not.toHaveBeenCalled();
  });
});
