import { expect, it } from "vitest";
import { readReferrer } from "./referrer";

const origin = "https://hanbuddy.kr";

it.each([
  ["https://www.google.com/search?q=kbo+tickets&hl=en", "https://www.google.com/"],
  ["https://l.instagram.com/?u=https%3A%2F%2Fhanbuddy.kr%2Fen&e=token", "https://l.instagram.com/"],
  ["https://www.meetup.com/discover-korea/events/123/#comments", "https://www.meetup.com/"],
  ["http://m.facebook.com/", "http://m.facebook.com/"],
  [
    "https://user:secret@blog.example.com:8443/post?email=a%40b.com",
    "https://blog.example.com:8443/",
  ],
])("keeps only the referring origin: %s", (referrer, expected) => {
  expect(readReferrer(referrer, origin)).toBe(expected);
});

it.each([
  "",
  "not a url",
  "android-app://com.google.android.gm/",
  "https://hanbuddy.kr/en/explore",
  "https://www.hanbuddy.kr/en",
  "https://staging.hanbuddy.kr/en",
  "http://localhost:3000/en",
  "https://accounts.google.com/o/oauth2/v2/auth?code=secret",
  "https://www.paypal.com/checkoutnow?token=secret",
  "https://www.sandbox.paypal.com/",
])("drops internal, login, payment and non-web referrers: %s", (referrer) => {
  expect(readReferrer(referrer, "http://localhost:3000")).toBe("");
});

it("does not treat lookalike hosts as internal", () => {
  expect(readReferrer("https://nothanbuddy.kr/", origin)).toBe("https://nothanbuddy.kr/");
  expect(readReferrer("https://paypal.com.example.net/", origin)).toBe(
    "https://paypal.com.example.net/",
  );
});
