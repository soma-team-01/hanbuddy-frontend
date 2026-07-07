import { describe, expect, it } from "vitest";
import { getUserTypeHomePath, getUserTypeNavRole } from "./routes";

describe("user type routes", () => {
  it.each([
    ["TOURIST", "/explore"],
    ["BUDDY", "/dashboard"],
    [undefined, "/login"],
    ["ADMIN", "/login"],
  ])("maps %s to %s", (userType, expectedPath) => {
    expect(getUserTypeHomePath(userType)).toBe(expectedPath);
  });

  it.each([
    ["TOURIST", "tourist"],
    ["BUDDY", "buddy"],
    [undefined, "tourist"],
    ["ADMIN", "tourist"],
  ] as const)("maps %s to the %s bottom nav", (userType, expectedRole) => {
    expect(getUserTypeNavRole(userType)).toBe(expectedRole);
  });
});
