import { describe, expect, it } from "vitest";
import {
  WORD_JOINER,
  joinChineseWords,
  joinChineseWordsInMessages,
  stripWordJoiners,
} from "./chinese-word-joiner";

describe("joinChineseWords", () => {
  it("glues the characters of a Chinese word so the browser cannot break inside it", () => {
    const joined = joinChineseWords("我们为你连接韩国的本地好友。", "zh-Hans");

    expect(joined).toContain(`韩${WORD_JOINER}国`);
    expect(joined).toContain(`好${WORD_JOINER}友`);
    expect(stripWordJoiners(joined)).toBe("我们为你连接韩国的本地好友。");
  });

  it("uses the Traditional Chinese segmenter for zh-Hant", () => {
    const joined = joinChineseWords("好友發起，你來參加，我們負責連結。", "zh-Hant");

    expect(joined).toContain(`參${WORD_JOINER}加`);
    expect(stripWordJoiners(joined)).toBe("好友發起，你來參加，我們負責連結。");
  });

  it("leaves breaks open between words, around punctuation and around Latin text", () => {
    const joined = joinChineseWords("在 HanBuddy 预订，好友", "zh-Hans");

    expect(joined).toContain("在 HanBuddy 预");
    expect(joined).not.toContain(`订${WORD_JOINER}，`);
    expect(joined).not.toContain(`，${WORD_JOINER}`);
  });

  it("keeps ICU arguments and plural syntax untouched", () => {
    const message = "{count, plural, other {#位旅客}}，{name}的好友";
    const joined = joinChineseWords(message, "zh-Hans");

    expect(stripWordJoiners(joined)).toBe(message);
    expect(joined).toContain("{count, plural, other {#");
    expect(joined).toContain("{name}");
  });
});

describe("joinChineseWordsInMessages", () => {
  const messages = {
    About: {
      metadataTitle: "关于 HanBuddy | 与本地好友一起的真实韩国体验",
      hero: { title: "我们为你连接韩国的本地好友。" },
      faq: { items: { what: { question: "HanBuddy 是什么？" } } },
    },
    Navigation: { viewMetadataTitle: "首尔体验" },
  };

  it("glues words in every message except the ones search engines read", () => {
    const joined = joinChineseWordsInMessages(messages, "zh-Hans");

    expect(joined.About.hero.title).toContain(`韩${WORD_JOINER}国`);
    expect(joined.About.metadataTitle).toBe(messages.About.metadataTitle);
    expect(joined.Navigation.viewMetadataTitle).toBe(messages.Navigation.viewMetadataTitle);
    expect(joined.About.faq.items.what.question).toBe(`HanBuddy 是什${WORD_JOINER}么？`);
  });

  it("does not mutate the imported message object", () => {
    joinChineseWordsInMessages(messages, "zh-Hans");

    expect(messages.About.hero.title).toBe("我们为你连接韩国的本地好友。");
  });
});
