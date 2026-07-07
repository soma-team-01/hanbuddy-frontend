/**
 * 브라우저에서 인증이 필요한 내부 API(/api/*)를 호출한다.
 * 401이면 refresh 토큰으로 세션을 한 번 갱신한 뒤 같은 요청을 재시도한다.
 */
export async function fetchWithAuthRetry(input: string, init?: RequestInit): Promise<Response> {
  const requestInit: RequestInit = { credentials: "same-origin", ...init };
  const response = await fetch(input, requestInit);
  if (response.status !== 401) return response;

  const refresh = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "same-origin",
  });
  if (!refresh.ok) return response;

  return fetch(input, requestInit);
}
