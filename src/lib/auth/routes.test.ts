import { describe, expect, it } from "vitest";
import {
  getRouteAccessRedirect,
  getUserTypeHomePath,
  getUserTypeNavRole,
  parseUserType,
} from "./routes";

describe("user type routes", () => {
  it.each([
    ["TOURIST", "TOURIST"],
    ["BUDDY", "BUDDY"],
    [undefined, undefined],
    ["ADMIN", undefined],
  ] as const)("parses %s as %s", (value, expectedUserType) => {
    expect(parseUserType(value)).toBe(expectedUserType);
  });

  it.each([
    ["TOURIST", "/explore"],
    ["BUDDY", "/dashboard"],
    [undefined, "/login"],
    ["ADMIN", "/login"],
  ])("maps %s to %s", (userType, expectedPath) => {
    expect(getUserTypeHomePath(parseUserType(userType))).toBe(expectedPath);
  });

  it.each([
    ["TOURIST", "tourist"],
    ["BUDDY", "buddy"],
    [undefined, "tourist"],
    ["ADMIN", "tourist"],
  ] as const)("maps %s to the %s bottom nav", (userType, expectedRole) => {
    expect(getUserTypeNavRole(parseUserType(userType))).toBe(expectedRole);
  });
});

describe("route access redirects", () => {
  it.each([
    "/home",
    "/home/settings",
    "/activities/1/book",
    "/applications",
    "/dashboard",
    "/my-activities",
    "/my-activities/create",
    "/my-activities/1/applicants",
    "/my-page",
    "/my-page/edit",
  ])("redirects unauthenticated access to %s", (pathname) => {
    expect(getRouteAccessRedirect({ pathname })).toBe("/login");
  });

  it("fails closed when only part of the authenticated session is present", () => {
    expect(getRouteAccessRedirect({ pathname: "/dashboard", accessToken: "token" })).toBe("/login");
    expect(getRouteAccessRedirect({ pathname: "/applications", userType: "TOURIST" })).toBe(
      "/login",
    );
  });

  it.each([
    ["TOURIST", "/dashboard", "/explore"],
    ["TOURIST", "/my-activities/create", "/explore"],
    ["BUDDY", "/activities/1/book", "/dashboard"],
  ] as const)("redirects %s away from %s", (userType, pathname, expectedPath) => {
    expect(getRouteAccessRedirect({ pathname, accessToken: "token", userType })).toBe(expectedPath);
  });

  it.each([
    ["TOURIST", "/explore"],
    ["TOURIST", "/activities/1/book"],
    ["BUDDY", "/dashboard"],
    ["BUDDY", "/my-activities/create"],
    ["TOURIST", "/my-page/edit"],
    ["BUDDY", "/my-page"],
  ] as const)("allows %s to access %s", (userType, pathname) => {
    expect(getRouteAccessRedirect({ pathname, accessToken: "token", userType })).toBeNull();
  });

  it.each(["/explore", "/activities/1"])(
    "allows unauthenticated visitors to browse %s",
    (pathname) => {
      expect(getRouteAccessRedirect({ pathname })).toBeNull();
    },
  );

  it("requires a signup session for onboarding", () => {
    expect(getRouteAccessRedirect({ pathname: "/onboarding" })).toBe("/login");
    expect(
      getRouteAccessRedirect({ pathname: "/onboarding", signupToken: "signup-token" }),
    ).toBeNull();
  });

  it.each([
    ["TOURIST", "/explore"],
    ["BUDDY", "/dashboard"],
  ] as const)("redirects an authenticated %s away from public auth pages", (userType, home) => {
    expect(getRouteAccessRedirect({ pathname: "/login", accessToken: "token", userType })).toBe(
      home,
    );
    expect(
      getRouteAccessRedirect({
        pathname: "/onboarding",
        accessToken: "token",
        signupToken: "signup-token",
        userType,
      }),
    ).toBe(home);
  });

  it("leaves the public landing page alone", () => {
    expect(getRouteAccessRedirect({ pathname: "/" })).toBeNull();
  });
});
