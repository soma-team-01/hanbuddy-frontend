/** 페이지 HTML에서 구조화 데이터(<script type="application/ld+json">)를 모두 꺼내 JSON으로 파싱한다. */
export function extractJsonLd(html: string): Record<string, unknown>[] {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    ([, body]) => JSON.parse(body) as Record<string, unknown>,
  );
}

export function findJsonLd(html: string, type: string): Record<string, unknown> | undefined {
  return extractJsonLd(html).find((data) => data["@type"] === type);
}
