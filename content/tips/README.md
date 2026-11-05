# Tips 콘텐츠 계약

`/en/tips`에 노출되는 영어 정보 글은 이 폴더에 `<slug>.en.md`로 둔다. 자동화 파이프라인은 아래 형식만 쓴다.

- 파일 이름: `<slug>.en.md`. `slug`는 소문자·숫자·하이픈(kebab-case)이며 URL(`/en/tips/<slug>`)이 된다.
- 지금은 영어(`en`)만 지원한다. `.en.md`가 아닌 파일(이 README 포함)은 글로 읽지 않는다.
- 맨 위에 YAML 머리말, 그 아래 Markdown 본문(GFM: 제목, 목록, 표, 링크). 본문 제목은 `##`부터 쓴다(페이지 제목 h1은 `title`로 그린다).

```
---
title: "How to Buy KBO Tickets as a Foreigner"
description: "One or two sentence summary used for meta description."
publishedAt: "2026-11-04"
updatedAt: "2026-11-04"
relatedActivityIds: [2, 6]
---
```

| 필드                 | 필수 | 설명                                                                 |
| -------------------- | ---- | -------------------------------------------------------------------- |
| `title`              | 필수 | 글 제목. 콜론이 들어가면 큰따옴표로 감싼다                           |
| `description`        | 필수 | 메타 설명·목록 요약. 한두 문장                                       |
| `publishedAt`        | 필수 | `YYYY-MM-DD`, 실제 존재하는 날짜                                     |
| `updatedAt`          | 선택 | `YYYY-MM-DD`, `publishedAt`보다 이르면 안 된다. 없으면 `publishedAt` |
| `relatedActivityIds` | 선택 | hanbuddy.kr 활동 id 배열. 공개 목록에 없는 id는 링크에서 빠진다      |

이 밖의 키, 중복 키, 빈 값, 잘못된 날짜는 테스트와 빌드에서 오류가 난다. 글을 추가하면 `/en/tips`, `/en/tips/<slug>`, `sitemap.xml`, `llms.txt`에 자동으로 반영된다.
