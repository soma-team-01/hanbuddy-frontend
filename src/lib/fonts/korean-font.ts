import type { CSSProperties } from "react";
import type { Locale } from "@/i18n/routing";

/**
 * 한글 웹 글꼴(Noto Sans KR)은 한국어 페이지에서만 쓴다.
 * 다른 언어 페이지는 글꼴 변수를 시스템 글꼴로 채워, 글꼴 목록(var(--font-noto-sans-kr))이 깨지지 않으면서
 * 푸터 사업자 정보 같은 짧은 한글 때문에 한글 글꼴 파일을 받지 않게 한다. 일본어·중국어의 한자도
 * 한국식 글자 모양 대신 각 언어의 시스템 글꼴로 그려진다(<html lang>에 맞춰 브라우저가 고른다).
 */
export function koreanFontRootProps(
  locale: Locale,
  koreanFontVariableClass: string,
): { className: string; style?: CSSProperties } {
  if (locale === "ko") return { className: koreanFontVariableClass };
  return {
    className: "",
    style: { "--font-noto-sans-kr": "system-ui" } as CSSProperties,
  };
}
