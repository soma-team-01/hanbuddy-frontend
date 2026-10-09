import type { BreadcrumbItem } from "@/lib/seo/json-ld";

/** 활동 상세의 위치: 메인 > 탐색 > 활동 제목. 화면 표시와 구조화 데이터가 같은 항목을 쓴다. */
export function activityBreadcrumbs(
  activity: { readonly id: string | number; readonly title: string },
  navigation: (key: "home" | "explore") => string,
): BreadcrumbItem[] {
  return [
    { name: navigation("home"), path: "" },
    { name: navigation("explore"), path: "/explore" },
    { name: activity.title, path: `/activities/${activity.id}` },
  ];
}
