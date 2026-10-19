import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { postBackend } from "./backend";
import { AUTH_COOKIES } from "./cookies";
import { handleEmailAuth } from "./email-route";

vi.mock("./backend", async (original) => ({
  ...(await original<typeof import("./backend")>()),
  postBackend: vi.fn(),
}));
const post = vi.mocked(postBackend);
const ok = (result: unknown) => ({
  status: 200,
  setCookies: [],
  payload: { isSuccess: true as const, code: "OK", message: "OK", result },
});
const request = (body: unknown, cookie = "", authorization = "") =>
  new NextRequest("http://localhost/api/auth/email/login?locale=en&next=https://evil.test", {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie, authorization },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  post.mockReset();
});

describe("email auth BFF", () => {
  it("preserves Google-only reset errors instead of acknowledging a reset email", async () => {
    post.mockResolvedValue({
      status: 409,
      setCookies: [],
      payload: {
        isSuccess: false,
        code: "AUTH409_GOOGLE_LOGIN",
        message: "private backend detail",
      },
    });
    const res = await handleEmailAuth(
      request({ email: "google@example.com" }),
      "password/reset-link",
    );
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      isSuccess: false,
      code: "AUTH409_GOOGLE_LOGIN",
      message: "Authentication request failed.",
    });
  });

  it.each(["signup", "password/reset"] as const)(
    "accepts 8 characters and rejects 7 for %s",
    async (action) => {
      const metadata = Buffer.from(
        JSON.stringify({ email: "test@example.com", expiresAt: Date.now() + 600000 }),
      ).toString("base64url");
      const cookie = `${AUTH_COOKIES.signupToken}=signup; ${AUTH_COOKIES.emailSignup}=${metadata}`;
      post.mockResolvedValue(
        ok({
          registered: true,
          authStatus: "ACTIVE",
          userId: 1,
          userType: "TOURIST",
          accessToken: "access",
        }),
      );
      const body = (password: string) =>
        action === "signup"
          ? { name: "Alice", password, profile: { userType: "TOURIST" } }
          : { password };
      const invalid = await handleEmailAuth(
        request(body("abcdefg"), cookie, "Bearer reset"),
        action,
      );
      expect(invalid.status).toBe(400);
      expect(post).not.toHaveBeenCalled();
      const valid = await handleEmailAuth(
        request(body("abcdefgh"), cookie, "Bearer reset"),
        action,
      );
      expect(valid.status).toBe(200);
      expect(post).toHaveBeenCalledWith(`/auth/email/${action}`, body("abcdefgh"), {
        bearerToken: action === "signup" ? "signup" : "reset",
      });
    },
  );

  it.each([
    [409, "AUTH409"],
    [503, "AUTH503_EMAIL"],
  ])("preserves the signup code error %s/%s for localized feedback", async (status, code) => {
    post.mockResolvedValue({
      status,
      setCookies: [],
      payload: { isSuccess: false, code, message: "private backend detail" },
    });
    const res = await handleEmailAuth(
      request({ email: "test@example.com", purpose: "SIGNUP" }),
      "code",
    );
    expect(res.status).toBe(status);
    const payload = await res.json();
    expect(payload.code).toBe(code);
    expect(payload.message).not.toContain("private backend detail");
  });

  it("forwards nested signup profile and the same signup token used for image upload", async () => {
    const profile = {
      userType: "TOURIST",
      agreements: [{ type: "TERMS_OF_SERVICE", version: "current", agreed: true }],
    };
    const metadata = Buffer.from(
      JSON.stringify({ email: "test@example.com", expiresAt: Date.now() + 600000 }),
    ).toString("base64url");
    post.mockResolvedValue({
      ...ok({
        registered: true,
        authStatus: "ACTIVE",
        userId: 1,
        userType: "TOURIST",
        accessToken: "access",
      }),
      status: 201,
    });
    const body = { name: "Alice", password: " a long password ", profile };
    const res = await handleEmailAuth(
      request(
        body,
        `${AUTH_COOKIES.signupToken}=signup; ${AUTH_COOKIES.emailSignup}=${metadata}; ${AUTH_COOKIES.accessToken}=wrong-token`,
      ),
      "signup",
    );
    expect(post).toHaveBeenCalledWith("/auth/email/signup", body, { bearerToken: "signup" });
    expect(res.status).toBe(201);
    expect(res.cookies.get(AUTH_COOKIES.signupToken)?.value).toBe("");
    expect(res.cookies.get(AUTH_COOKIES.emailSignup)?.value).toBe("");
  });
  it("rejects expired signup metadata without refreshing or using the access token", async () => {
    const metadata = Buffer.from(
      JSON.stringify({ email: "test@example.com", expiresAt: Date.now() - 1 }),
    ).toString("base64url");
    const res = await handleEmailAuth(
      request(
        { name: "Alice", password: "a long password", profile: {} },
        `${AUTH_COOKIES.signupToken}=signup; ${AUTH_COOKIES.emailSignup}=${metadata}`,
      ),
      "signup",
    );
    expect(res.status).toBe(401);
    expect(post).not.toHaveBeenCalled();
  });
  it.each([400, 401, 429, 503])(
    "does not clear the current session on reset error %s",
    async (status) => {
      post.mockResolvedValue({
        status,
        setCookies: [],
        payload: { isSuccess: false, code: "TOKEN401", message: "sensitive backend details" },
      });
      const res = await handleEmailAuth(
        request(
          { password: "a long password" },
          `${AUTH_COOKIES.accessToken}=other`,
          "Bearer reset",
        ),
        "password/reset",
      );
      expect(res.status).toBe(status);
      expect(res.headers.get("set-cookie")).toBeNull();
      expect(JSON.stringify(await res.json())).not.toContain("sensitive backend details");
      expect(post).toHaveBeenCalledTimes(1);
    },
  );
  it("fails closed on unknown login status", async () => {
    post.mockResolvedValue(
      ok({ registered: true, authStatus: "ONBOARDING_REQUIRED", userType: "TOURIST" }),
    );
    const res = await handleEmailAuth(
      request({ email: "test@example.com", password: "a long password" }),
      "login",
    );
    expect(res.status).toBe(502);
    expect(res.headers.get("set-cookie")).toBeNull();
  });
  it("keeps leading zero codes and stores only a short-lived HttpOnly signup token", async () => {
    post.mockResolvedValue(
      ok({ verificationToken: "signup-secret", purpose: "SIGNUP", expiresInSeconds: 123 }),
    );
    const res = await handleEmailAuth(
      request({ email: "test@example.com", purpose: "SIGNUP", code: "012345" }),
      "code/verify",
    );
    expect(post).toHaveBeenCalledWith(
      "/auth/email/code/verify",
      { email: "test@example.com", purpose: "SIGNUP", code: "012345" },
      {},
    );
    expect(res.cookies.get(AUTH_COOKIES.signupToken)?.value).toBe("signup-secret");
    expect(res.headers.get("set-cookie")).toContain("Max-Age=123");
    expect(res.headers.get("set-cookie")).toContain("HttpOnly");
    expect(JSON.stringify(await res.json())).not.toContain("signup-secret");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
  it("never reuses login credentials for reset and never forwards reset tokens in JSON", async () => {
    post.mockResolvedValue(ok("changed"));
    const res = await handleEmailAuth(
      request(
        { password: " a long password " },
        `${AUTH_COOKIES.accessToken}=other-account`,
        "Bearer reset-secret",
      ),
      "password/reset",
    );
    expect(post).toHaveBeenCalledWith(
      "/auth/email/password/reset",
      { password: " a long password " },
      { bearerToken: "reset-secret" },
    );
    expect(res.cookies.get(AUTH_COOKIES.accessToken)?.value).toBe("");
    expect(res.headers.get("Referrer-Policy")).toBe("no-referrer");
  });
  it("rejects password reset without its own token", async () => {
    const res = await handleEmailAuth(
      request({ password: "a long password" }, `${AUTH_COOKIES.accessToken}=access`),
      "password/reset",
    );
    expect(res.status).toBe(401);
    expect(post).not.toHaveBeenCalled();
  });
  it("stores active login cookies without exposing access tokens", async () => {
    post.mockResolvedValue({
      ...ok({
        registered: true,
        authStatus: "ACTIVE",
        userType: "TOURIST",
        userId: 1,
        accessToken: "access-secret",
      }),
      setCookies: ["refresh_token=refresh; Path=/; HttpOnly"],
    });
    const res = await handleEmailAuth(
      request({ email: "test@example.com", password: "a long password" }),
      "login",
    );
    expect(await res.json()).toMatchObject({ result: { redirectTo: "/en", authStatus: "ACTIVE" } });
    expect(res.cookies.get(AUTH_COOKIES.accessToken)?.value).toBe("access-secret");
    expect(res.headers.get("set-cookie")).toContain("refresh_token=refresh");
  });
  it.each(["PENDING_APPROVAL", "REJECTED", "SUSPENDED"])(
    "does not authenticate %s",
    async (authStatus) => {
      post.mockResolvedValue(
        ok({ registered: true, authStatus, userType: "BUDDY", resubmissionToken: "resubmit" }),
      );
      const res = await handleEmailAuth(
        request({ email: "test@example.com", password: "a long password" }),
        "login",
      );
      expect(res.cookies.get(AUTH_COOKIES.accessToken)?.value).toBe("");
      expect(await res.json()).toMatchObject({
        result: { redirectTo: `/ko/buddy/auth/status?status=${authStatus}` },
      });
      expect(res.cookies.get(AUTH_COOKIES.resubmissionToken)?.value).toBe(
        authStatus === "REJECTED" ? "resubmit" : "",
      );
    },
  );
  it("rejects PASSWORD_RESET code purpose", async () => {
    const res = await handleEmailAuth(
      request({ email: "test@example.com", purpose: "PASSWORD_RESET" }),
      "code",
    );
    expect(res.status).toBe(400);
    expect(post).not.toHaveBeenCalled();
  });
  it("returns the same reset request receipt, not backend account information", async () => {
    post.mockResolvedValue(ok("account-specific text"));
    const res = await handleEmailAuth(
      request({ email: "test@example.com" }),
      "password/reset-link",
    );
    expect((await res.json()).result).toEqual({ accepted: true });
  });
});
