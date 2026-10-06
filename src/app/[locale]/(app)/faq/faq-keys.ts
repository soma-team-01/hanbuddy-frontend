// About.faq.items.* 메시지 키. 참가자 대화에서 실제로 많이 나온 질문 순서다.
// 질문·답 문구와 키는 FAQ 구조화 데이터에도 그대로 쓰므로 바꾸지 않는다.
export const FAQ_KEYS = [
  "what",
  "buddies",
  "solo",
  "pay",
  "included",
  "dietary",
  "meet",
  "deadline",
  "cancel",
  "language",
] as const;

export type FaqKey = (typeof FAQ_KEYS)[number];

// /faq 화면은 질문을 세 묶음으로 나눠 보여준다. 묶음 이름은 About.faq.groups.*.
// 묶음 안 순서는 FAQ_KEYS 순서를 따른다.
export const FAQ_GROUPS = [
  { key: "hanbuddy", questions: ["what", "buddies", "solo", "language"] },
  { key: "booking", questions: ["pay", "included", "deadline", "cancel"] },
  { key: "day", questions: ["dietary", "meet"] },
] as const satisfies readonly { key: string; questions: readonly FaqKey[] }[];
