import { describe, expect, it } from "vitest";
import { isValidDisplayName } from "./display-name";

describe("isValidDisplayName", () => {
  it.each(["John", "John Smith", "Jean-Luc", "O'Neil"])("accepts %s", (displayName) => {
    expect(isValidDisplayName(displayName)).toBe(true);
  });

  it.each([
    "한글",
    "John1",
    "John.Smith",
    " John",
    "John ",
    "-John",
    "John-",
    "'John",
    "John'",
    "John  Smith",
    "John--Smith",
    "John''Smith",
    "John -Smith",
    "John\n",
    "A",
    "A".repeat(31),
  ])("rejects %s", (displayName) => {
    expect(isValidDisplayName(displayName)).toBe(false);
  });
});
