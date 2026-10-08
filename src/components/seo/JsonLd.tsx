import { serializeJsonLd } from "@/lib/seo/json-ld";

/** 검색엔진·AI가 읽는 구조화 데이터. 서버에서 첫 HTML에 그대로 넣는다. */
export function JsonLd({ data }: Readonly<{ data: Record<string, unknown> }>) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
