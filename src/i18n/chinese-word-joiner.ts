// 중국어는 브라우저가 한자 사이 어디서든 줄을 바꿔 제목이 "连接韩 / 国"처럼 단어 중간에서 끊긴다.
// 일본어용 word-break: auto-phrase는 중국어에 효과가 없어서, 메시지를 불러올 때 단어 안의 한자 사이에
// 보이지 않는 WORD JOINER(U+2060)를 넣어 단어 안에서는 줄이 바뀌지 않게 한다. 단어 사이는 그대로 끊긴다.
// 검색 결과에 그대로 쓰이는 metadata* 키는 건드리지 않는다. FAQ 구조화 데이터처럼 문구를 밖으로 내보낼 때는
// stripWordJoiners로 지운 뒤 쓴다.

export const WORD_JOINER = "⁠";

export type ChineseLocale = "zh-Hans" | "zh-Hant";

const HAN = /\p{Script=Han}/u;
const HAN_WORD = /^\p{Script=Han}{2,}$/u;
const SEARCH_ENGINE_KEY = /metadata/i;

const segmenters = new Map<ChineseLocale, Intl.Segmenter>();

function getSegmenter(locale: ChineseLocale) {
  let segmenter = segmenters.get(locale);
  if (!segmenter) {
    segmenter = new Intl.Segmenter(locale, { granularity: "word" });
    segmenters.set(locale, segmenter);
  }
  return segmenter;
}

export function joinChineseWords(text: string, locale: ChineseLocale): string {
  if (!HAN.test(text)) return text;

  let joined = "";
  for (const { segment } of getSegmenter(locale).segment(text)) {
    joined += HAN_WORD.test(segment) ? [...segment].join(WORD_JOINER) : segment;
  }
  return joined;
}

export function stripWordJoiners(text: string): string {
  return text.replaceAll(WORD_JOINER, "");
}

export function joinChineseWordsInMessages<T>(messages: T, locale: ChineseLocale): T {
  return joinValue(messages, locale) as T;
}

function joinValue(value: unknown, locale: ChineseLocale): unknown {
  if (typeof value === "string") return joinChineseWords(value, locale);
  if (Array.isArray(value)) return value.map((item) => joinValue(item, locale));
  if (value === null || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      SEARCH_ENGINE_KEY.test(key) ? child : joinValue(child, locale),
    ]),
  );
}
