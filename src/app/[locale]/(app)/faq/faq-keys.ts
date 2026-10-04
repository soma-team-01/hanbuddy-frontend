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
