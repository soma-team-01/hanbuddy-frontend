import { notFound } from "next/navigation";

// 정의되지 않은 주소를 로케일 레이아웃 안의 not-found 화면(홈 링크 포함)으로 보낸다.
export default function CatchAllPage() {
  notFound();
}
