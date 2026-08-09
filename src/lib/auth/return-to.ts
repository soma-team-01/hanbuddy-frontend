const MAX_RETURN_TO_LENGTH = 512;

/**
 * 로그인 후 복귀할 내부 경로만 허용한다.
 * 외부 URL(오픈 리다이렉트), 프로토콜 상대 URL(//host), 로그인 화면 자기 자신은 거른다.
 */
export function sanitizeReturnToPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length > MAX_RETURN_TO_LENGTH) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value.includes("\\") || value.includes("://")) return null;

  const [pathname] = value.split("?");
  if (pathname === "/login" || pathname === "/") return null;

  return value;
}

/** 브라우저 pathname에서 로케일 세그먼트를 제거해 로케일 독립 경로로 만든다 */
export function stripLocaleFromPathname(pathname: string): string {
  return pathname.replace(/^\/(en|ko)(?=\/|$)/, "") || "/";
}
