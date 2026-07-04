# Hanbuddy Frontend — 에이전트 지침

@AGENTS.md

## 프로젝트 개요
- Hanbuddy: 관광객(Tourist)과 현지 버디(Buddy/호스트)를 연결하는 액티비티 예약 서비스의 프론트엔드.
- Git remote: `origin` → `git@github.com:soma-team-01/hanbuddy-frontend.git`
- 프로젝트 뼈대 구축 완료. 화면 구현은 아직 시작 전.

## 기술 스택
- **Next.js 16** (App Router) · **React 19** · **TypeScript** · **Tailwind CSS v4** · **ESLint** · **npm**
- `src/` 디렉토리 + `@/*` 임포트 별칭
- 배포: **Vercel** (Production + Preview)
- 개발 명령: `npm run dev` (Turbopack), 빌드: `npm run build`, 린트: `npm run lint`

> **주의 (Next.js 16 / React 19 / Tailwind v4):** 이 버전들은 에이전트 학습 데이터보다 최신이라 API·관례가 다를 수 있다. 실제 Next.js 코드를 작성하기 전 `node_modules/next/dist/docs/`(특히 `01-app/`)를 참고할 것. 루트 `AGENTS.md`가 이 경고를 담고 있으며, `CLAUDE.md`가 이를 `@AGENTS.md`로 불러온다. Tailwind v4는 `tailwind.config.js` 대신 `src/app/globals.css`의 `@import "tailwindcss"` + PostCSS 기반 설정을 쓴다.

## 폴더 구조
```
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

## 브랜치 & 배포 전략 (GitHub Flow + develop, Vercel 연동)
```
main     ─ Vercel Production Branch → 실서비스 (직접 push 금지, PR로만 병합)
develop  ─ 고정 Preview URL = 통합 스테이징 (팀 QA·데모)
feature/*─ PR 단위 임시 Preview URL (리뷰용)
```
- **흐름**: `feature/xxx`(develop에서 분기) → PR → `develop` → 배포 준비되면 PR → `main`.
- **브랜치 네이밍**: `<type>/<설명>` — 커밋 prefix와 통일 (`feat/`, `fix/`, `docs/`…).
- **병합**: PR 리뷰 후 **Squash merge**.
- **Vercel**: Production Branch=`main`. 그 외 브랜치/PR은 자동 Preview 배포. 환경변수는 Production / Preview로 분리 관리(실 키는 Production 전용).
- Vercel 계정 연결(대시보드 설정)은 별도로 진행 필요.

## 커밋 규칙
- 커밋 메시지 형식: `<prefix>: <한국어 요약>`
  - 예: `feat: 액티비티 상세 화면 구현`, `docs: 에이전트 지침 추가`
- prefix는 Conventional Commits 관례를 따른다: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore` 등.
- 요약은 한국어로 간결하게 작성한다.

## 디자인 참고 (Figma)
- 파일: **Hanbuddy** — fileKey `wzlRJND1GMNskVuydcWpns`
  - URL: https://www.figma.com/design/wzlRJND1GMNskVuydcWpns/Hanbuddy
- 페이지: `prototype` (nodeId `0:1`) — 페이지 하나에 모든 화면 프레임이 배치됨.
- **중요: prototype의 인터랙션/플로우 연결은 무시하고, 각 프레임(GUI = 실제 화면 디자인)을 구현 기준으로 삼는다.**
- 디자인은 상세 스펙이 아니라 "이런 식으로 화면을 구성한다"는 초안 수준. 픽셀 단위 정밀 재현보다 화면 구성/요소 배치/흐름을 참고할 것.
- 모든 전체 화면 프레임은 모바일 **390px 폭** 기준.

### 화면 인벤토리 (프레임 nodeId)
Figma MCP `get_screenshot` / `get_design_context`에 아래 nodeId를 직접 넘겨 화면별로 확인·구현한다.

**온보딩/공통**
- Onboarding - Welcome — `2016:4`
- Shared: My Page — `2016:1186`
- Shared: Payment & Refund Info — `2016:1288`
- 마이페이지 수정 — `2038:188`

**Tourist(관광객) 플로우**
- Activity Discovery — `2016:86`
- Activity Detail — `2016:191`
- Booking Flow — `2016:295`
- My Applications — `2016:428`
- Cancellation Flow — `2016:524`

**Buddy(호스트) 플로우**
- Dashboard — `2016:601`
- Create Activity — `2016:734`
- My Activities — `2016:819`
- Applicant Management — `2016:951`

**Admin**
- Payment Verification — `2016:1052`

### 공통 UI 패턴 (확인된 것)
- 상단 `HanBuddy` TopAppBar (뒤로가기/타이틀/알림 아이콘).
- 하단 BottomNavBar: 관광객은 Explore / History / My Page, 버디는 대시보드 기반.
- 액티비티 카드: 이미지 + 평점(별점) + 제목 + 위치 + 호스트(이름/역할) + 가격(₩).
- 통화 표기는 원화(₩).

## Figma MCP 사용 메모
- `get_metadata`를 nodeId 없이 페이지 전체(`0:1`)로 호출하면 응답이 너무 커서(≈194k자) 실패한다. 프레임 단위 nodeId로 좁혀서 호출할 것.
- `get_screenshot`은 기본적으로 단기 URL을 반환 → `curl`로 받아 이미지로 확인.
