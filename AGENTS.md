# Hanbuddy Frontend - Agent Instructions

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Overview

- Hanbuddy: 관광객(Tourist)과 현지 버디(Buddy/호스트)를 연결하는 액티비티 예약 서비스의 프론트엔드.
- Git remote: `origin` -> `git@github.com:soma-team-01/hanbuddy-frontend.git`
- 프로젝트 뼈대 구축 완료. 화면 구현은 아직 시작 전.

## Tech Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript** · **Tailwind CSS v4** · **ESLint** · **npm**
- `src/` 디렉토리 + `@/*` 임포트 별칭
- 배포: **Vercel** (Production + Preview)
- 개발 명령: `npm run dev`, 빌드: `npm run build`, 린트: `npm run lint`, 타입체크: `npm run typecheck`

> **주의 (Next.js 16 / React 19 / Tailwind v4):** 이 버전들은 에이전트 학습 데이터보다 최신이라 API·관례가 다를 수 있다. 실제 Next.js 코드를 작성하기 전 `node_modules/next/dist/docs/`(특히 `01-app/`)를 참고할 것. Tailwind v4는 `tailwind.config.js` 대신 `src/app/globals.css`의 `@import "tailwindcss"` + PostCSS 기반 설정을 쓴다.

## Backend API

- 로컬 Swagger UI: http://localhost:8080/swagger-ui/index.html#/
- 로컬 API base URL: `http://localhost:8080`
- 프론트는 브라우저에서 백엔드를 직접 호출하지 않고, same-origin `/api/*` Route Handler를 거쳐 백엔드로 프록시하는 BFF 패턴을 유지한다.
- API 명세 반영 시 Swagger/OpenAPI 응답 shape를 먼저 확인하고, 타입·프록시 route·클라이언트 함수·계약 테스트를 함께 맞춘다.

## Folder Structure

```text
src/
├── app/              # App Router 페이지와 Route Handler
│   ├── [locale]/     # 영어/한국어 locale 동적 세그먼트
│   │   └── (app)/     # 앱 화면 공통 route group
│   │       ├── (tourist)/ # Discovery, Detail, Booking...
│   │       └── (buddy)/   # Dashboard, Create Activity...
│   └── admin/        # Payment Verification
├── components/
│   ├── ui/           # 버튼, 카드 등 최소 단위
│   └── layout/       # SiteHeader, MobileMenu, PageHeader, PageContainer
├── lib/              # 서버 통신, 유틸
├── types/            # 공통 타입
└── styles/           # 전역 스타일/디자인 토큰
```

- `[locale]`는 영어/한국어 URL 세그먼트이며, `(app)`, `(tourist)`, `(buddy)`는 App Router의 **route group**(URL에 경로로 포함되지 않는 조직용 폴더)이다.

## Branching And Deployment

```text
main     - Vercel Production Branch -> 실서비스 (직접 push 금지, PR로만 병합)
develop  - 고정 Preview URL = 통합 스테이징 (팀 QA·데모)
feature/*- PR 단위 임시 Preview URL (리뷰용)
```

- **흐름**: `feature/xxx`(develop에서 분기) -> PR -> `develop` -> 배포 준비되면 PR -> `main`.
- **브랜치 네이밍**: `<type>/<설명>` - 커밋 prefix와 통일 (`feat/`, `fix/`, `docs/`...).
- **병합 방식 (방향별)**:
  - `feature -> develop`: **Squash merge** (지저분한 중간 커밋을 기능당 커밋 1개로 압축).
  - `develop -> main`: **Merge commit** (long-lived 브랜치 간 이력 보존, squash 시 발생하는 히스토리 drift 방지).
- **GitHub Ruleset (적용됨, enforcement=active)**: `main`·`develop` 모두 **브랜치 삭제 금지 · force push 금지 · PR 필수 · code_quality(errors)**. bypass actors 없음 -> 관리자 포함 **직접 push 불가, 반드시 PR 경유**. 병합 방식은 위 방향별로 ruleset에 강제됨(main=merge만, develop=squash만).
- **필수 승인 수는 현재 0**(혼자 작업 중이라 self-merge 가능). **팀원 합류 시 1로 올릴 것.**
- **CI (`.github/workflows/ci.yml`)**: PR마다 `format:check → lint → typecheck → test → build` 5단계 실행. **PR 올리기 전 로컬에서 같은 5단계를 전부 통과시킬 것** - lint·typecheck·build만 돌리면 `format:check`(Prettier)와 `test`를 놓친다. 특히 스크립트로 자동 생성한 파일은 커밋 전 `npx prettier --write`를 거칠 것.
  ```bash
  npm run format:check && npm run lint && npm run typecheck && npm test && npm run build
  ```
- **Vercel**: Production Branch=`main`. 그 외 브랜치/PR은 자동 Preview 배포. 환경변수는 Production / Preview로 분리 관리(실 키는 Production 전용).

### Vercel Status

- 프로젝트: `hanbuddy-frontend` (team `soma-zeroone` / `team_2lOTZrUA6WOT5y80kaL9bfa9`, project `prj_N2tGWFSGPTsLxlZz2XnsSjzBKOiM`).
- 배포는 SOMA 팀 Vercel Team `soma-zeroone` 소속으로 동작 중(PR #14~#20 배포에서 확인, 2026-07-09 Vercel MCP로 프로젝트 accountId 일치 확인). 과거에는 개인(Hobby) 팀 `minbros-projects`(`team_5xpcSletzWjNA6mWCYKBd4qG`) 소속이었고, 팀이 바뀐 뒤에도 projectId는 동일하다.
- Vercel API/MCP 호출 시에는 teamId 대신 team slug(`soma-zeroone`)로도 조회 가능.
- GitHub 저장소 연결 유지 -> **`main` push 시 프로덕션 자동 배포**, PR별 Preview 배포 정상 동작.
- 프로덕션 URL: https://hanbuddy-frontend.vercel.app (공개, 정상 서빙 - 2026-07-09 확인).
- **Deployment Protection ON**: Preview/브랜치 URL은 Vercel 로그인 필요(팀원 초대 시 접근). 이 정책 유지하기로 결정.
- Vercel 조작은 Vercel MCP로 가능(팀/프로젝트/배포 조회 등). 단, 공식 `vercel` 플러그인이 머신에 설치·인증되어 있어야 하며, 세션에 따라 없을 수 있다.
- Vercel CLI는 설치되어 있지 않을 수 있다. 로컬에서 `vercel env pull`, `vercel deploy`, `vercel logs`가 필요하면 `npm i -g vercel` 설치가 필요하다.
- 팀 전환 관련 확인 필요 항목: 팀원 초대 상태, 팀 플랜 비용/크레딧.

## Commit Rules

- 커밋 메시지 형식: `<prefix>: <한국어 요약>`
- 예: `feat: 액티비티 상세 화면 구현`, `docs: 에이전트 지침 추가`
- prefix는 Conventional Commits 관례를 따른다: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore` 등.
- 요약은 한국어로 간결하게 작성한다.

## Responsive Web Design Authority

- 전체 UI의 구현 기준은 승인 사양 `docs/superpowers/specs/2026-07-27-hanbuddy-responsive-web-redesign-design.md`이다. 디자인 변경 전 이 문서를 먼저 확인하고, 상충하는 과거 시안이나 모바일 전용 관례보다 이 사양을 우선한다.
- HanBuddy는 모바일부터 데스크톱까지 자연스럽게 확장되는 반응형 웹이다. 기준 구간은 `<768px` 모바일, `768~1023px` 태블릿, `>=1024px` 데스크톱이며, 본문 컨테이너 최대 폭은 `1200px`이다.
- 주요 검증 폭은 `390px`, `768px`, `1024px`, `1440px`이다. 각 폭에서 영어와 한국어를 모두 확인한다.

### Brand Foundation

- `src/app/globals.css`의 의미 기반 warm-red 토큰을 사용한다.
  - canvas `#FFFAF7`, canvas-soft `#FFFFFF`
  - primary `#D13F32`, primary-hover `#B9342B`, primary-strong `#8F2F28`, primary-soft `#FFF0EC`
  - ink `#261B18`, muted `#675B56`
  - line-strong `#D6C5BF`, line-soft `#EEE2DD`
  - panel `#F8F3F0`, panel-raised `#FCF8F6`
  - on-primary `#FFFFFF`, on-primary-strong `#FFFFFF`
- 타이포그래피는 제목 `Plus Jakarta Sans`(600/700/800), 본문 `DM Sans`(400/500/600/700), 한국어 fallback `Noto Sans KR`(400/500/600/700)을 사용한다.
- 구형 cream/forest/sage/earth 계열 토큰과 모바일 앱 셸 스타일을 다시 도입하지 않는다.

### Responsive Navigation And Layout

- 모든 페이지는 전역 `SiteHeader`를 사용한다. `>=1024px`에서는 역할별 데스크톱 상단 내비게이션, `<1024px`에서는 접근 가능한 햄버거 `MobileMenu`를 표시한다.
- 모바일 메뉴는 포커스 이동·복귀, Escape와 배경 클릭 닫기, 배경 스크롤 잠금, 현재 경로 표시, 언어 전환을 지원해야 한다.
- 페이지 내부 제목·뒤로가기·닫기는 `PageHeader`, 공통 폭과 여백은 `PageContainer`로 구성한다. 전역 헤더와 페이지 헤더의 역할을 섞지 않는다.
- 영구 하단 내비게이션은 사용하지 않는다. 예약·생성 등 트랜잭션의 주요 액션은 모바일에서는 고정 액션 바, 데스크톱에서는 본문 또는 sticky 보조 패널로 제공한다.
- 화면군별 기본 레이아웃은 다음과 같다.
  - Landing/Login: 넓은 히어로와 중앙 정렬 인증 패널
  - Explore/My Activities: 모바일 1열에서 데스크톱 3~4열로 확장되는 카드 그리드
  - Detail/Booking: 본문 + `360px` 요약·예약 패널의 2열 구조
  - My Page: 프로필 요약 + 설정/계정 영역의 2열 구조
  - Dashboard: 주요 운영 정보 + 보조 요약의 2열 구조
  - Onboarding/Edit/Create: 읽기 편한 최대 `800px` 폼과 넉넉한 섹션 간격
- 액티비티 카드와 상세 정보는 API가 제공하는 필드만 사용한다. 존재하지 않는 상품 정보, 필터, 카테고리, 가짜 긴급성·재고 문구를 만들지 않는다.
- 마켓플레이스 UX는 Airbnb Experiences, GetYourGuide, Klook의 원칙만 참고한다: 강한 탐색 계층, 스캔 가능한 핵심 정보, 명확한 가격·평점·위치, 신뢰 가능한 CTA와 넉넉한 여백. 특정 서비스의 UI를 복제하지 않는다.
- 통화 표기는 `formatKrw`를 통한 원화(₩), 사람 이미지는 사진이 없을 때 이니셜을 표시하는 `Avatar`를 사용한다.

### Behavior Preservation And Verification

- 기존 라우트, same-origin `/api/*` BFF, 인증 쿠키와 역할별 리다이렉트, 결제·환불 흐름, API 계약, 영어/한국어 동작을 보존한다.
- Next.js 코드를 작성하기 전에 설치된 버전의 `node_modules/next/dist/docs/` 관련 문서를 확인한다.
- 변경은 테스트 우선으로 진행한다. 완료 전 다음 CI 순서를 전부 통과시킨다.
  ```bash
  npm run format:check && npm run lint && npm run typecheck && npm test && npm run build
  ```
- CI 후 실제 브라우저에서 `390/768/1024/1440px`와 영어/한국어를 점검한다. 최소한 내비게이션·햄버거 메뉴, 카드 그리드, 상세/예약 패널, 폼, 다이얼로그, 긴 번역 문자열의 overflow와 키보드 포커스를 확인한다.
