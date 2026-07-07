import { describe, expect, it } from "vitest";
import { getUserTypeHomePath, getUserTypeNavRole, parseUserType } from "./routes";

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
