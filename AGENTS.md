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

## Folder Structure

```text
src/
├── app/              # 라우팅 = 페이지 (Figma 프레임 ≈ 여기 1개)
│   ├── (tourist)/    # Discovery, Detail, Booking...
│   ├── (buddy)/      # Dashboard, Create Activity...
│   └── admin/        # Payment Verification
├── components/
│   ├── ui/           # 버튼, 카드 등 최소 단위
│   └── layout/       # TopAppBar, BottomNavBar
├── lib/              # 서버 통신, 유틸
├── types/            # 공통 타입
└── styles/           # 전역 스타일/디자인 토큰
```

- `(tourist)`, `(buddy)`는 App Router의 **route group**(URL에 경로로 포함되지 않는 조직용 폴더).

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
- 향후 CI(build/lint/test) 추가 시 required status checks에 넣기.
- **Vercel**: Production Branch=`main`. 그 외 브랜치/PR은 자동 Preview 배포. 환경변수는 Production / Preview로 분리 관리(실 키는 Production 전용).

### Vercel Status

- 프로젝트: `hanbuddy-frontend` (team `minbros-projects` / `team_5xpcSletzWjNA6mWCYKBd4qG`, project `prj_N2tGWFSGPTsLxlZz2XnsSjzBKOiM`).
- GitHub 저장소 연결됨 -> **`main` push 시 프로덕션 자동 배포** 동작 확인.
- 프로덕션 URL: https://hanbuddy-frontend.vercel.app (공개, 정상 서빙).
- **Deployment Protection ON**: Preview/브랜치 URL은 Vercel 로그인 필요(팀원 초대 시 접근). 이 정책 유지하기로 결정.
- Vercel 조작은 Vercel MCP로 가능(팀/프로젝트/배포 조회 등).
- Vercel CLI는 설치되어 있지 않을 수 있다. 로컬에서 `vercel env pull`, `vercel deploy`, `vercel logs`가 필요하면 `npm i -g vercel` 설치가 필요하다.

### Planned Vercel Team Transfer

- **현재는 개인(Hobby) 팀 `minbros-projects`에 프로젝트가 있음. 팀 협업을 위해 별도 Vercel Team(Pro, 유료) 생성 예정.**
- 계획: SOMA 팀 명의 Vercel Team 생성 -> GitHub 앱이 `soma-team-01` org 접근 확인 -> 현재 프로젝트를 **Transfer**(배포·도메인·env 유지) -> 팀원 초대 -> GitHub 연동 재확인.
- **전환 완료 후 위 team/project ID 값을 갱신할 것** (teamId·projectId가 바뀜).
- 비용/크레딧은 팀 차원에서 확인 필요(Hobby는 비상업·멤버 추가 불가).

## Commit Rules

- 커밋 메시지 형식: `<prefix>: <한국어 요약>`
- 예: `feat: 액티비티 상세 화면 구현`, `docs: 에이전트 지침 추가`
- prefix는 Conventional Commits 관례를 따른다: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore` 등.
- 요약은 한국어로 간결하게 작성한다.

## Design Reference (Figma)

- 파일: **Hanbuddy** - fileKey `wzlRJND1GMNskVuydcWpns`
- URL: https://www.figma.com/design/wzlRJND1GMNskVuydcWpns/Hanbuddy
- **구현 기준 페이지: `GUI` (canvas nodeId `2038:269`)** - 섹션별로 정리된 최신 화면.
  - 페이지 직링크: https://www.figma.com/design/wzlRJND1GMNskVuydcWpns/Hanbuddy?node-id=2038-269
- `prototype` 페이지(nodeId `0:1`)는 초기 플로우 초안이므로 참고용으로만 사용한다.
- GUI 페이지 안에서도 화면별 디자인 구성(폰트 등)이 일부 제각각이라, 구현 시 아래 Shared UI Patterns의 토큰 체계로 통일한다.
- 디자인은 상세 스펙이 아니라 "이런 식으로 화면을 구성한다"는 초안 수준. 픽셀 단위 정밀 재현보다 화면 구성/요소 배치/흐름을 참고할 것.
- 모든 전체 화면 프레임은 모바일 **390px 폭** 기준.

### Screen Inventory (GUI 페이지, 구현 라우트 포함)

Figma MCP `get_screenshot` / `get_design_context`에 아래 nodeId를 직접 넘겨 화면별로 확인한다.

**공통: 로그인/회원가입** (section `2054:437`)

- Onboarding: Google Login - `2054:3154` -> `/`
- Onboarding: Profile Setup - `2054:3184` -> `/onboarding` (Tourist/Buddy 역할 선택 후 각 홈으로 이동)

**공통: 마이페이지** (section `2054:2807`)

- Shared: My Page - `2054:2965` -> `/my-page`
- Shared: Edit Profile - `2054:3041` -> `/my-page/edit`

**투어리스트** (section `2054:1106`)

- Activity Discovery - `2054:1264` -> `/explore`
- Activity Detail - `2054:1335` -> `/activities/[id]`
- Booking Flow - `2054:1448` -> `/activities/[id]/book`
- My Applications - `2054:1567` -> `/applications`
- Cancellation Confirmation - `2054:1661` -> `/applications` 내 모달

**버디** (section `2054:1796`)

- Dashboard - `2054:2325` -> `/dashboard`
- My Activities - `2054:2440` -> `/my-activities`
- Create Activity - `2054:2570` -> `/my-activities/create`
- Applicant Management - `2054:2708` -> `/my-activities/[id]/applicants`

> Admin: Payment Verification과 Shared: Payment & Refund Info는 prototype 페이지에만 있고 GUI 페이지에는 없어 구현 대상에서 제외됨.

### Shared UI Patterns

- 디자인 토큰: `src/app/globals.css`의 `@theme` (cream/ink/forest/sage/line/chip/sand/earth/success/warning/danger) + Manrope(`font-display`)·Be Vietnam Pro(`font-sans`).
- 상단 `TopAppBar`: 뒤로가기(`backHref`) 또는 닫기(`closeHref`) + 타이틀 + 우측 action 슬롯.
- 하단 `BottomNavBar`: 역할 공통 탭 **Home / Activity / My Page** (tourist: `/explore`·`/applications`·`/my-page`, buddy: `/dashboard`·`/my-activities`·`/my-page`). 활성 탭은 다크 그린 pill.
- 트랜잭션 화면(Detail/Booking/Create/Onboarding)은 하단 네비 대신 `BottomActionBar`(고정 액션 바)를 사용 - route group `(with-nav)` 밖에 배치.
- 액티비티 카드: 이미지 + 평점 배지 + 제목 + 위치 + 호스트(아바타/이름) + 가격(₩).
- 통화 표기는 원화(₩) - 디자인에 USD가 있어도 ₩로 통일 (`formatKrw`).
- 사람 아바타는 `Avatar` 컴포넌트(사진 없으면 이니셜 원형)로 통일.

## Figma MCP Notes

- **주의: `get_metadata`를 nodeId 없이 호출하면 페이지 목록이 나오는데, `prototype`(0:1)만 잡히고 `GUI` 페이지는 목록에 안 나온다.** GUI 페이지는 nodeId `2038:269`를 직접 지정해서 접근할 것.
- `get_metadata`를 페이지 전체(`0:1`, `2038:269`)로 호출하면 응답이 커서(190k~350k자) 파일로 저장된다. 저장된 XML에서 들여쓰기 얕은 라인만 추출하면 프레임 목록을 얻을 수 있고, 가능하면 프레임 단위 nodeId로 좁혀서 호출할 것.
- `get_screenshot`은 기본적으로 단기 URL(7일 만료)을 반환 -> `curl`로 받아 이미지로 확인. 세로로 긴 프레임은 기본 maxDimension(1024)에서 뭉개지므로 `maxDimension`을 2400 정도로 올려 재요청.
- 디자인 속 사진/지도 에셋은 `get_design_context` 응답 상단의 asset URL 상수로 얻어 `public/images/`에 저장해서 사용 (URL이 만료되므로 반드시 로컬 저장).
