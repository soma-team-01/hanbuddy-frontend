import { notFound } from "next/navigation";

// 정의되지 않은 주소는 [locale]/not-found.tsx가 사이트 헤더·푸터 안에서 보여주도록 404를 던진다.
export default function CatchAllPage() {
  notFound();
}
