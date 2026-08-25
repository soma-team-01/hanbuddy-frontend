import { describe, expect, it } from "vitest";
import { resolveChatSourceLanguage } from "./source-language";

describe("resolveChatSourceLanguage", () => {
  it("uses the current site language for tourists", () => {
    expect(resolveChatSourceLanguage("안녕하세요", "EN", "TOURIST")).toBe("EN");
    expect(resolveChatSourceLanguage("Hello", "JA", "TOURIST")).toBe("JA");
  });

  it("prefers Korean when a buddy message contains Hangul", () => {
    expect(resolveChatSourceLanguage("Hello, 내일 만나요", "KO", "BUDDY")).toBe("KO");
    expect(resolveChatSourceLanguage("ㅎㅎ", "KO", "BUDDY")).toBe("KO");
  });

  it("uses English for a buddy message with Latin letters and no Hangul", () => {
    expect(resolveChatSourceLanguage("See you at 3 PM!", "KO", "BUDDY")).toBe("EN");
  });

  it("defaults a buddy message containing only numbers, URLs, or emoji to Korean", () => {
    expect(resolveChatSourceLanguage("1234 😊", "KO", "BUDDY")).toBe("KO");
    expect(resolveChatSourceLanguage("https://hanbuddy.kr/123 😊", "KO", "BUDDY")).toBe("KO");
  });
});
