# Hanbuddy Frontend — 에이전트 지침

## 프로젝트 개요
- Hanbuddy: 관광객(Tourist)과 현지 버디(Buddy/호스트)를 연결하는 액티비티 예약 서비스의 프론트엔드.
- Git remote: `origin` → `git@github.com:soma-team-01/hanbuddy-frontend.git`
- 현재 저장소는 초기 상태(코드 미착수). 구현 시작 전 단계.

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
