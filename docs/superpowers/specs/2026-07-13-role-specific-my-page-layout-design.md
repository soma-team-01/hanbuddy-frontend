# 역할별 My Page와 공통 하단 내비게이션 설계

## 배경

현재 Tourist의 Home(`/explore`)·Activity(`/applications`)와 Buddy의 Home(`/dashboard`)·Activity(`/my-activities`)는 각각 역할별 `(with-nav)` 레이아웃을 공유한다. 공용 My Page(`/my-page`)는 별도의 `(with-nav)` 레이아웃 아래에 있어 My Page 진입·이탈 시 `BottomNavBar`가 재마운트된다. 이 때문에 같은 DOM 요소의 `transform` 변경을 전제로 한 활성 pill transition이 Home ↔ Activity에서만 동작한다.

현재 My Page 화면은 두 역할에서 같지만, 앞으로 역할별 기능과 메뉴가 달라질 수 있으므로 역할별 화면 구현 경계를 미리 둔다. 사용자에게 노출되는 URL은 역할과 관계없이 `/my-page`로 유지한다.

## 목표

- Home, Activity, My Page 사이에서 하나의 `BottomNavBar` 인스턴스를 유지한다.
- `/my-page` URL을 유지하면서 Tourist와 Buddy의 My Page 화면 구현을 분리한다.
- 현재 공통 UI를 복제하지 않고, 역할별 화면이 독립적으로 확장될 수 있는 경계를 만든다.
- 기존 인증·역할별 접근 제어와 URL 체계를 변경하지 않는다.

## 고려한 접근

### 1. 단일 `/my-page` 라우트와 역할별 화면 컴포넌트 — 채택

공통 `(with-nav)` 레이아웃 아래에 모든 하단 내비게이션 대상 페이지를 배치한다. `/my-page/page.tsx`는 인증된 사용자 역할을 읽고 `TouristMyPage` 또는 `BuddyMyPage`를 선택한다. 두 역할별 컴포넌트는 현재 동일한 공통 My Page 뷰를 조합하지만, 이후 각자 메뉴와 섹션을 추가할 수 있다.

장점:

- 기존 URL을 유지한다.
- `BottomNavBar`가 공통 상위 레이아웃에 남아 transition이 유지된다.
- 역할별 화면 경계와 공통 UI 재사용을 동시에 확보한다.

단점:

- 역할 선택을 담당하는 얇은 서버 라우트가 필요하다.
- 현재는 두 역할 컴포넌트가 유사한 얇은 wrapper가 된다.

### 2. 역할별 공개 URL(`/tourist/my-page`, `/buddy/my-page`) — 제외

라우트와 화면의 소유권은 명확하지만 기존 `/my-page` 계약을 깨고 역할을 URL에 노출한다. 사용자의 역할은 인증 상태로 이미 결정되므로 별도 공개 URL의 제품적 가치가 없다.

### 3. `/my-page`를 역할별 내부 경로로 rewrite — 제외

외부 URL은 유지할 수 있지만 middleware/proxy rewrite와 내부 전용 경로가 추가된다. 단일 화면 선택으로 해결할 수 있는 문제에 라우팅 복잡도와 테스트 범위를 과도하게 늘린다.

Next.js 16 App Router에서는 서로 다른 route group의 페이지가 동일한 URL로 해석되면 경로 충돌이 발생하므로, 역할별 `page.tsx` 두 개를 각각 `/my-page`로 매핑하는 방식은 사용하지 않는다.

## 라우트와 레이아웃 구조

하단 내비게이션 대상 페이지를 하나의 공통 `(with-nav)` 레이아웃 아래로 이동한다.

```text
src/app/(app)/
├── (with-nav)/
│   ├── layout.tsx                  # 역할 판별 + 단일 BottomNavBar
│   ├── (tourist)/
│   │   ├── explore/
│   │   └── applications/
│   ├── (buddy)/
│   │   ├── dashboard/
│   │   └── my-activities/
│   └── my-page/
│       ├── page.tsx                # 역할별 화면 선택
│       ├── tourist-my-page.tsx
│       ├── buddy-my-page.tsx
│       └── my-page-content.tsx     # 현재 공통 화면 구성
├── (tourist)/                      # BottomNav가 없는 Tourist 화면
│   ├── activities/
│   └── my-page/edit/
└── (buddy)/                        # BottomNav가 없는 Buddy 화면
    └── my-activities/create/
```

Route group은 URL에 포함되지 않으므로 기존 `/explore`, `/applications`, `/dashboard`, `/my-activities`, `/my-page` 경로는 그대로 유지된다. 역할별 기존 `(with-nav)/layout.tsx`는 제거하고, 공통 `(with-nav)/layout.tsx`만 `BottomNavBar`를 렌더링한다.

## 컴포넌트 책임

- `SharedNavLayout`: 쿠키의 `userType`을 읽어 `BottomNavBar` 역할을 결정하고, 모든 nav 대상 페이지에서 동일한 nav 인스턴스를 유지한다.
- `MyPage`: 같은 역할 정보를 읽어 역할별 My Page 화면을 선택한다.
- `TouristMyPage` / `BuddyMyPage`: 역할별 화면 진입점이다. 현재는 공통 뷰를 조합하고, 향후 역할 전용 메뉴와 섹션을 소유한다.
- `MyPageContent`: 현재 공통인 TopAppBar, 프로필, 설정 메뉴, 로그아웃 구성을 담당한다.
- `ProfileCard` / `LogoutButton`: 기존 컴포넌트를 그대로 재사용한다.

역할 값의 기본 처리 방식은 기존 `getUserTypeNavRole` 규칙을 유지한다. 인증·역할 검증은 proxy 경계가 담당하며, 화면 계층은 검증된 쿠키를 표시 결정에만 사용한다.

## 데이터 흐름

1. proxy가 보호 경로 접근과 역할을 검증한다.
2. 공통 `(with-nav)/layout.tsx`가 `userType` 쿠키를 읽고 역할별 탭 링크를 선택한다.
3. `/my-page/page.tsx`가 같은 역할을 읽어 Tourist 또는 Buddy 화면 컴포넌트를 선택한다.
4. 역할별 화면은 공통 My Page 내용을 렌더링한다.
5. Home·Activity·My Page 사이의 client navigation에서는 공통 레이아웃과 `BottomNavBar`가 유지되고, indicator의 `transform`만 변경된다.

## 오류와 경계 처리

- 인증되지 않았거나 허용되지 않은 역할은 기존 proxy가 로그인 또는 역할별 Home으로 리다이렉트한다.
- 쿠키가 없거나 알 수 없는 값일 때의 UI fallback은 기존 규칙처럼 Tourist를 사용한다. 이 fallback은 보안 경계가 아니며 proxy 검증을 대체하지 않는다.
- 역할별 My Page 화면에서 데이터 조회 오류가 발생하면 기존 `ProfileCard`의 오류 처리 방식을 유지한다.

## 테스트와 검증

- `BottomNavBar` 컴포넌트 테스트에서 pathname 변경 후 동일 indicator DOM 노드의 transform이 갱신되는지 확인한다.
- My Page 라우트 테스트에서 Tourist와 Buddy 쿠키가 각각 올바른 역할별 화면을 선택하는지 확인한다.
- 공통 nav 레이아웃 테스트에서 역할별 `BottomNavBar` prop이 유지되는지 확인한다.
- 전체 CI 명령(`format:check`, `lint`, `typecheck`, `test`, `build`)을 실행한다.
- 390px 모바일 뷰포트에서 Home ↔ Activity, Home ↔ My Page, Activity ↔ My Page를 양방향으로 브라우저 검증한다.
- 검증 중 framework overlay와 console error/warning이 없는지 확인한다.

## 비목표

- My Page의 실제 역할별 메뉴나 기능을 새로 추가하지 않는다.
- `/my-page/edit` 화면을 역할별로 분리하지 않는다.
- 인증 또는 proxy 정책을 변경하지 않는다.
- View Transition API나 별도 animation 라이브러리를 도입하지 않는다.
