# 영어·한국어 언어 전환 설계

## 배경

Hanbuddy의 사용자 화면은 현재 영어 고정 문구를 직접 렌더링한다. 공통 My Page에는 `Language / English` 메뉴가 있으나 다른 미구현 메뉴와 함께 비활성화되어 있다. PayPal 결제 UI와 Google Places·Maps도 별도의 locale 설정 없이 동작하며, Google Places Autocomplete는 `languageCode: "en"`으로 고정되어 있다.

서비스의 주 사용자는 한국에서 활동을 예약하는 외국인과 한국인 버디다. 따라서 서비스가 소유하는 전체 UI를 영어와 한국어로 제공하되, 프로그램 일정은 표시 언어와 관계없이 한국 시간대를 기준으로 해야 한다.

## 목표

- 모든 프론트엔드 고정 UI 문구를 영어와 한국어로 제공한다.
- URL에 locale을 명시해 같은 언어의 화면을 공유하고 다시 열 수 있게 한다.
- My Page의 기존 Language 메뉴에서 모바일 하단 시트로 언어를 변경한다.
- 언어 선택을 브라우저 쿠키에 저장하고 최초 방문에서는 브라우저 선호 언어를 감지한다.
- 기존 인증·역할별 접근 제어를 locale 경로에서도 동일하게 유지한다.
- PayPal UI, Google Places 결과와 Google Maps Embed UI를 앱 언어와 동기화한다.
- 프로그램 일정과 사용자에게 노출되는 시간 정보를 항상 `Asia/Seoul` 기준으로 계산하고 표시한다.
- 번역 누락, locale 라우팅, 외부 서비스 locale, 시간대 불변성을 자동 테스트한다.

## 비목표

- 액티비티 제목·설명, 사용자 자기소개, 요청 사항 등 사용자 작성 콘텐츠를 자동 번역하지 않는다.
- 번역 관리 SaaS나 기계 번역 API를 도입하지 않는다.
- 언어 preference를 백엔드 사용자 프로필에 저장하거나 여러 기기 사이에서 동기화하지 않는다.
- 영어·한국어 외 locale을 지원하지 않는다.
- locale별로 URL slug 자체를 번역하지 않는다. `/ko/my-page`처럼 locale 뒤 경로는 기존 영문 경로를 유지한다.
- 사용자의 현지 시간대로 프로그램 일정을 변환하는 기능을 제공하지 않는다.

## 고려한 접근

### 1. `next-intl`과 locale prefix 라우팅 — 채택

`next-intl`을 사용해 App Router의 Server·Client Component 번역, locale navigation, ICU 메시지, 날짜·숫자 형식과 locale 쿠키를 함께 관리한다. 모든 페이지 URL에는 `/en` 또는 `/ko` prefix를 사용한다.

장점:

- Next.js App Router의 서버 렌더링과 Client Component를 같은 메시지 체계로 지원한다.
- 번역, 복수형, 형식화, locale navigation을 직접 구현하지 않아도 된다.
- URL과 쿠키가 모두 언어 상태를 표현하므로 SSR과 hydration 결과가 일치한다.
- 현재 약 50개 TSX 파일의 전체 UI를 이관한 뒤에도 번역 구조를 일관되게 유지할 수 있다.

단점:

- 런타임 의존성이 하나 추가된다.
- 기존 App Router 파일과 내부 링크를 locale-aware 구조로 이관해야 한다.

### 2. Next.js 기본 dictionary 직접 구현 — 제외

동적 import로 locale JSON을 불러오는 Next.js 기본 예시를 확장하는 방식이다. 외부 의존성은 없지만 Client Component Provider, 타입 검사, locale navigation, 쿠키, 복수형과 formatter를 프로젝트가 직접 소유해야 한다. 전체 UI와 외부 SDK를 함께 전환하는 현재 범위에서는 유지보수 비용이 크다.

### 3. 클라이언트 전역 상태만 사용 — 제외

현재 URL을 유지한 채 React context나 localStorage로 언어를 바꾸는 방식이다. 구현 시작은 빠르지만 서버 렌더링 언어와 hydration 언어가 달라질 수 있고, 선택 언어를 링크로 공유할 수 없다. 승인된 locale prefix 요구와도 맞지 않는다.

## 라우트와 파일 구조

사용자에게 HTML을 렌더링하는 페이지와 레이아웃을 `[locale]` 아래에 둔다. locale과 무관한 Route Handler는 기존 고정 경로를 유지한다.

```text
src/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx                 # html lang, locale 검증, provider
│   │   ├── page.tsx                   # locale별 랜딩
│   │   └── (app)/                     # 기존 사용자 페이지
│   ├── api/                            # locale prefix 없음
│   ├── auth/google/callback/route.ts   # 외부 OAuth callback 고정 경로
│   └── favicon.ico
├── i18n/
│   ├── routing.ts                     # 지원 locale, prefix, 쿠키
│   ├── request.ts                     # 요청별 메시지 로딩
│   ├── navigation.ts                  # Link/router wrapper
│   ├── external-locales.ts            # PayPal·Google locale 매핑
│   └── formats.ts                     # locale별 표시 형식
├── messages/
│   ├── en.json                        # 기준 사전
│   └── ko.json
└── lib/
    └── datetime.ts                    # Asia/Seoul 변환·표시 경계
```

`localePrefix`는 `always`로 설정한다. `/`, `/explore`, `/my-page` 같은 기존 비-prefix 페이지 요청은 locale을 결정한 뒤 `/en/...` 또는 `/ko/...`로 리다이렉트한다. 기존 북마크는 깨지지 않으며, locale이 포함된 URL이 최종 canonical URL이 된다.

페이지 metadata의 title·description도 현재 사전으로 생성한다. 공개 페이지는 현재 locale URL을 canonical로 사용하고 `en`, `ko` 언어 대체 URL을 metadata에 명시한다.

고정 경로인 `/api/*`, `/_next/*`, 정적 파일, `/favicon.ico`, `/auth/google/callback`은 locale prefix 처리에서 제외한다. Google OAuth callback URL은 변경하지 않고, callback 이후 화면으로 보낼 때 쿠키의 유효한 locale을 목적지에 붙인다.

## Locale 결정과 저장

요청 언어는 다음 우선순위로 결정한다.

1. URL의 명시적 `/en` 또는 `/ko` prefix
2. 유효한 `NEXT_LOCALE` 쿠키
3. 요청의 `Accept-Language`
4. 기본 locale인 `en`

`Accept-Language`가 `ko` 또는 `ko-*`이면 한국어를 선택하고, 나머지는 영어로 정규화한다. 임의로 조작되었거나 지원하지 않는 쿠키 값은 무시한다. 명시적 URL locale이 저장된 쿠키와 다르면 URL을 우선하고 `next-intl`이 최근 선택값을 쿠키에 반영한다.

`NEXT_LOCALE`은 `sameSite: "lax"`, `path: "/"`, 1년의 `maxAge`를 사용한다. 인증 정보가 아니므로 `httpOnly`로 만들지 않으며, 언어 preference 외 데이터를 저장하지 않는다.

지원하지 않는 두 글자 언어 segment로 시작하는 경로는 404로 처리한다. 예를 들어 `/fr/explore`를 영어 경로로 조용히 바꾸지 않는다. Proxy는 지원하지 않는 언어형 segment를 `next-intl`의 prefix 자동 보정에 넘기지 않고 locale layout의 404 경계로 전달한다. 반면 `/explore`처럼 locale prefix가 없는 것으로 확인되는 기존 canonical 경로는 위 우선순위에 따라 정상 리다이렉트한다.

## Proxy와 인증 조합

Next.js 16은 프로젝트당 하나의 `proxy.ts`만 사용하므로 `next-intl` 라우팅과 기존 인증·역할 검사를 `src/proxy.ts`에서 조합한다.

1. 요청에서 명시적 또는 감지된 locale을 결정한다.
2. 인증 검사에 전달할 pathname에서는 locale prefix만 제거한다.
3. 기존 `getRouteAccessRedirect`는 locale이 없는 canonical pathname을 기준으로 그대로 역할·인증을 판단한다.
4. 인증 리다이렉트가 필요하면 목적지에 현재 locale을 붙인다.
5. 인증 리다이렉트가 없으면 `next-intl` middleware 응답으로 locale header, 쿠키와 prefix 정규화를 처리한다.

예시:

- 비로그인 `/ko/explore` → `/ko/login`
- Tourist의 `/en/dashboard` → `/en/explore`
- Buddy의 `/ko/activities/1` → `/ko/dashboard`
- locale 없는 `/my-page` + `NEXT_LOCALE=ko` → `/ko/my-page`
- locale 없는 `/dashboard` + 비로그인 + 한국어 브라우저 → `/ko/login`

가능하면 한 요청에서 최종 목적지로 리다이렉트해 locale 정규화와 인증 리다이렉트가 연속으로 발생하지 않게 한다. Proxy 테스트는 기존 인증 행렬에 `en`, `ko`, prefix 없음을 추가한다.

## 번역 사전 구조

`messages/en.json`을 키와 의미의 기준으로 사용하고 `messages/ko.json`이 같은 구조를 구현한다. 파일은 하나씩 유지하되 다음 화면 도메인 namespace로 나눈다.

- `Common`
- `Navigation`
- `Auth`
- `Onboarding`
- `MyPage`
- `Explore`
- `ActivityDetail`
- `Booking`
- `Applications`
- `BuddyDashboard`
- `MyActivities`
- `CreateActivity`
- `Applicants`
- `Payment`
- `Errors`
- `Accessibility`

Server Component는 `getTranslations`, Client Component는 `useTranslations`를 사용한다. 현재 locale의 메시지만 동적 import하고, `[locale]/layout.tsx`의 `NextIntlClientProvider`가 Client Component에 제공한다. 초기 범위에서는 현재 locale의 전체 사전을 Provider에 전달한다. 메시지 크기가 실제 성능 문제가 되기 전에는 route별 사전 분할을 추가하지 않는다.

고정 상태명, 버튼, 입력 label·placeholder·validation, 빈 화면, 로딩, 오류, dialog, `aria-label`, 이미지 대체 텍스트와 metadata를 모두 사전으로 이동한다. 브랜드명, 사용자 이름, 연락 앱 이름과 사용자 작성 콘텐츠는 원문을 유지한다. 국가명처럼 표준화된 지역 데이터는 번역 사전에 전체 목록을 복제하지 않고 현재 locale의 `Intl.DisplayNames`를 사용한다.

영문·한글 사전의 전체 키 집합과 값 타입이 일치하는지 재귀적으로 검사한다. 빈 값, 잘못된 ICU 메시지와 기준 사전에 없는 키는 CI에서 실패시킨다.

## 내부 Navigation 이관

`src/i18n/navigation.ts`에서 `createNavigation(routing)`으로 `Link`, `redirect`, `usePathname`, `useRouter`, `getPathname`을 제공한다. 사용자 페이지에서 직접 사용하는 `next/link`, `next/navigation` 이동은 이 wrapper로 이관한다.

두 locale에서 pathname은 같으므로 별도의 localized `pathnames` 매핑은 사용하지 않는다. 동적 segment, query string과 hash는 locale 전환 전후에 유지한다. API 요청 URL과 외부 링크에는 locale을 붙이지 않는다.

인증 helper는 locale이 없는 canonical app route를 계속 소유한다. UI navigation 경계와 Proxy redirect 경계에서만 locale을 붙여, 인증 정책이 번역 라우팅 세부사항에 의존하지 않게 한다.

## My Page 언어 선택 UI

현재 `MyPageContent`의 첫 번째 Language 메뉴를 활성화하고 나머지 미구현 메뉴와 분리한다.

- 영어 화면: `Language` / 현재 값 `English`
- 한국어 화면: `언어` / 현재 값 `한국어`
- Language 행에서는 `Coming soon`, `disabled`, 낮은 opacity와 금지 cursor를 제거한다.
- `Help Center`와 `Delete Account`는 기존 비활성 상태를 유지한다.

Language 행을 누르면 `LanguagePreferenceSheet` 하단 시트를 연다. 시트는 제목, 닫기 버튼, `English`, `한국어` radio option과 현재 선택 check를 표시한다. 옵션을 선택하면 즉시 현재 경로의 locale만 교체하고 시트를 닫는다. 현재 locale을 다시 선택하면 navigation 없이 닫는다.

하단 시트는 `role="dialog"`, `aria-modal="true"`, 이름이 있는 `radiogroup`을 사용한다. 열릴 때 선택된 옵션으로 focus를 이동하고, 닫힐 때 Language 행으로 focus를 복원한다. 닫기 버튼, backdrop과 Esc를 지원하며 전환 중 중복 선택을 막는다.

예를 들어 `/en/my-page?from=dashboard`에서 한국어를 선택하면 `/ko/my-page?from=dashboard`로 이동한다. 새 페이지는 서버에서 한국어로 렌더링되므로 언어 flash 없이 `html lang="ko"`와 실제 UI 언어가 일치한다.

## 외부 서비스 Locale 동기화

앱 locale과 외부 서비스 locale의 차이를 `external-locales.ts`에서 한 번만 매핑한다.

| 앱 locale | PayPal SDK | Google language | Google region |
| --------- | ---------- | --------------- | ------------- |
| `en`      | `en_US`    | `en`            | `KR`          |
| `ko`      | `ko_KR`    | `ko`            | `KR`          |

### PayPal

현재 V6 `PayPalProvider`에 locale을 전달한다. Provider key에도 PayPal locale을 포함해 locale이 바뀐 경우 SDK instance와 하위 결제 UI가 새 언어로 생성되도록 한다. PayPal 버튼, guest card UI와 PayPal checkout이 같은 locale을 받는다.

PayPal 자체가 렌더링하는 승인·오류 UI는 SDK locale에 맡기고, Hanbuddy가 렌더링하는 `Payment unavailable`, 처리 중, 취소, 실패 안내는 `Payment`와 `Errors` 사전을 사용한다. PayPal locale 지원이나 SDK 로딩이 실패하면 결제 영역만 locale별 대체 UI로 전환하고 나머지 예약 화면은 유지한다.

### Google Places와 Maps Embed

`searchGooglePlacePredictions`와 `fetchGooglePlaceDetails`가 앱 locale을 명시적으로 받도록 한다.

- Autocomplete request: `languageCode: "en" | "ko"`, `regionCode: "KR"`
- Place Details request: `languageCode`와 `regionCode` query parameter
- Maps Embed URL: `language=en|ko`, `region=KR`

장소 검색은 계속 한국 지역으로 제한하거나 bias한다. locale이 바뀌면 Places query key/effect dependency에도 locale을 포함해 이전 언어 응답을 재사용하지 않는다. 지도 iframe `src`가 locale별로 달라져 Google의 지도 label과 UI가 다시 로드된다. 특정 타일이나 장소 데이터에 요청 언어 번역이 없으면 Google이 제공하는 기본 표기를 허용한다.

## 한국 시간대 정책

표시 언어와 시간대는 서로 독립적으로 처리한다. locale은 날짜·요일·오전/오후의 표현만 바꾸고 모든 서비스 시간의 기준은 `Asia/Seoul`이다.

공통 상수 `SERVICE_TIME_ZONE = "Asia/Seoul"`을 두고 사용자에게 노출되는 모든 `Intl.DateTimeFormat` 또는 `next-intl` formatter에 `timeZone: SERVICE_TIME_ZONE`을 명시한다. 브라우저와 Vercel 런타임의 기본 시간대를 사용하지 않는다.

- 프로그램 생성의 `datetime-local` 값은 기기 시간대가 아니라 서울 현지 시각으로 해석한다.
- 백엔드에는 `2026-07-19T13:00:00+09:00` 형태로 명시적 offset을 보낸다.
- offset이 있는 API 응답은 instant로 파싱한 뒤 `Asia/Seoul`로 표시한다.
- `startAt` 외 신청 시각, 결제 만료 시각 등 사용자에게 노출되는 timestamp에도 같은 formatter를 사용한다.
- 시간 비교와 만료 계산은 절대 시각으로 수행하고, 입력·표시 경계에서만 서울 시간으로 변환한다.

프로그램 생성·예약·상세의 일정 선택 영역에는 다음 안내를 노출한다.

- 영어: `All times are in Korea Standard Time (KST).`
- 한국어: `모든 시간은 한국 표준시(KST) 기준입니다.`

현재 일정 생성의 `+09:00` 계약과 `startAt` 타입 주석은 유지한다. 문자열 slice에 의존하는 `splitStartAt`과 브라우저 기본 시간대를 사용하는 분산 formatter는 공통 datetime 유틸로 통합한다. 영어는 `Jul 19, 2026, 1:00 PM`, 한국어는 `2026. 7. 19. 오후 1:00`처럼 표현이 달라도 같은 서울 현지 시각을 나타내야 한다.

## 데이터 흐름

### 최초 방문

1. 사용자가 locale 없는 기존 URL로 접근한다.
2. Proxy가 locale 쿠키, `Accept-Language`, 기본 영어 순서로 locale을 결정한다.
3. 같은 요청에서 인증·역할 정책을 적용한다.
4. 최종 locale prefix URL로 리다이렉트한다.
5. `[locale]/layout.tsx`가 locale 사전과 `html lang`을 설정한다.

### My Page에서 언어 변경

1. 사용자가 Language 행을 누른다.
2. 하단 시트가 현재 locale이 선택된 상태로 열린다.
3. 다른 locale을 선택한다.
4. locale navigation이 현재 pathname, params, query와 hash를 보존해 URL locale만 교체한다.
5. `next-intl`이 `NEXT_LOCALE` 쿠키를 갱신한다.
6. 새 locale의 Server Component와 Client Component가 같은 사전으로 렌더링된다.

### 외부 UI 렌더링

1. 현재 app locale을 외부 locale mapping에 전달한다.
2. PayPal Provider는 해당 SDK locale로 생성된다.
3. Google Places 요청과 Maps Embed URL은 같은 Google language와 `KR` region을 사용한다.
4. 외부 서비스 실패 시 해당 영역의 locale별 fallback만 렌더링한다.

## 오류와 경계 처리

- 지원하지 않는 URL locale은 locale layout에서 검증해 404로 처리한다.
- 유효하지 않은 locale 쿠키와 header 값은 허용 목록 밖에서 사용하지 않는다.
- 인증 redirect helper는 locale 없는 canonical pathname만 받도록 해 locale parsing 오류가 권한 판단에 영향을 주지 않게 한다.
- 번역 키 누락은 개발과 CI에서 오류로 처리한다. 운영에서 예상하지 못한 누락이 발생하면 같은 키의 영어 문구로 대체하고 오류를 기록한다.
- API의 raw 오류 문자열을 그대로 사용자에게 노출하지 않는다. 알려진 상태·오류 코드는 locale 메시지로 매핑하고, 알 수 없는 오류는 공통 localized 메시지를 사용한다.
- Language 전환 navigation이 완료되지 않으면 현재 URL·쿠키·화면 언어를 유지한다.
- PayPal과 Google 오류는 각 기능 경계 안에서 처리하며 전체 페이지를 실패시키지 않는다.
- 잘못되거나 offset이 없는 backend timestamp는 임의로 브라우저 시간대로 해석하지 않고 localized unavailable 상태로 처리하며 개발 오류를 기록한다.

## 테스트와 검증

### 단위·컴포넌트 테스트

- `routing.ts`: 지원 locale, 기본 locale, prefix와 cookie 설정
- locale 결정: URL → 쿠키 → `Accept-Language` → 영어 우선순위
- message contract: 영문·한글 전체 키, 값 타입, 빈 값과 ICU syntax
- `LanguagePreferenceSheet`: 현재값, 선택, 닫기, focus 복원, Esc, 중복 입력 방지
- locale navigation: pathname, 동적 params, query와 hash 보존
- external locale mapping: `en_US`·`ko_KR`, `en`·`ko`, `KR`
- `PayPalPaymentProvider`: 현재 locale prop과 locale별 instance 재생성
- Google Places: Autocomplete·Details request의 language/region
- Google Maps Embed: locale별 `language`·`region` query
- datetime utility: offset parsing, 서울 변환, invalid input, locale별 표현
- 일정 생성 payload: 기기 시간대와 무관한 `+09:00`

### Proxy·페이지 회귀 테스트

- 비로그인, Tourist, Buddy 각각에 대해 `/en`, `/ko`, prefix 없는 보호 경로를 검증한다.
- 로그인·온보딩·역할별 Home redirect가 현재 locale을 유지하는지 검증한다.
- `/api`, OAuth callback과 정적 파일이 locale redirect 대상이 아닌지 검증한다.
- 대표 Server·Client 페이지를 두 locale로 렌더링해 `html lang`, heading, button, validation과 접근성 이름을 검증한다.
- My Page의 Language만 활성화되고 나머지 미구현 메뉴는 계속 비활성인지 검증한다.

### 시간대 회귀 테스트

테스트 프로세스의 `TZ`를 `UTC`, `America/Los_Angeles`, `Asia/Seoul`로 바꾸어도 같은 일정이 같은 서울 날짜·시각으로 표시되는지 확인한다. 날짜 경계에 가까운 instant를 포함해 전날이나 다음 날로 밀리는 회귀를 검증한다. locale 변경은 표현만 바꾸고 일정의 실제 서울 날짜·시각은 바꾸지 않아야 한다.

### 전체 검증

- `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`
- 390px 모바일 뷰포트에서 두 언어의 모든 주요 화면을 확인한다.
- 긴 한국어·영어 문구로 인한 잘림, overflow와 BottomActionBar 겹침을 확인한다.
- 언어 전환 전후 console error, hydration warning과 불필요한 연속 redirect가 없는지 확인한다.
- PayPal sandbox 버튼·guest checkout과 Google Places·지도 iframe을 두 locale에서 실제 브라우저로 확인한다.

## 구현 순서와 완료 기준

1. `next-intl` 설정, message contract와 locale navigation 기반을 추가한다.
2. `[locale]` 라우트 구조와 기존 Proxy 인증 조합을 완성한다.
3. 공통 layout·navigation·auth·My Page와 Language 하단 시트를 번역한다.
4. Tourist 화면, Buddy 화면과 공통 UI를 namespace 단위로 이관한다.
5. 날짜·시간 formatter를 `Asia/Seoul` 공통 유틸로 통합한다.
6. PayPal과 Google 연동에 locale을 전달한다.
7. hard-coded 사용자 UI 문구를 최종 검색하고 누락을 제거한다.
8. 자동 테스트, 전체 CI와 두 locale 브라우저 검증을 완료한다.

두 locale 중 하나라도 주요 사용자 흐름에 서비스 소유 hard-coded 문구, 번역 키 누락, locale 없는 내부 navigation 또는 기기 시간대 의존 일정 표시가 남아 있으면 완료로 보지 않는다.
