# 확인 모달(ConfirmDialog) 및 Create Activity 이탈 가드 설계

- 날짜: 2026-07-09
- 상태: 사용자 승인됨
- 배경: 주요 액션 버튼(신청 제출, 활동 삭제, 로그아웃, 활동 등록)이 확인 단계 없이 즉시 실행된다.
  활동 삭제만 네이티브 `window.confirm`을 쓰고 있어 앱 디자인과 불일치한다. Create Activity 폼은
  뒤로가기 시 작성 중 입력이 경고 없이 사라진다.

## 범위

**포함**

1. 공용 `ConfirmDialog` 컴포넌트 신설 (`src/components/ui/ConfirmDialog.tsx`)
2. Booking Submit 확인 모달 (신청 요약 포함)
3. 활동 삭제 확인을 `window.confirm` → `ConfirmDialog(danger)`로 교체
4. Log Out 확인 모달
5. Create Activity 등록 제출 확인 모달
6. Create Activity 이탈 가드: 앱 내 뒤로가기 버튼 가드 + dirty 시 `beforeunload`

**제외**

- Booking 폼 이탈 가드 (입력량이 적어 모달 피로 대비 이득 낮음 — 사용자 결정)
- 브라우저 뒤로가기/스와이프 제스처 가드 (App Router에서 안정적 차단 불가 — 사용자 수용)
- Applications 신청 취소 다이얼로그(`CancelDialog`)는 사유 선택이 있는 특수 케이스로 현행 유지
- Edit Profile 저장·Onboarding 가입에는 확인 모달을 넣지 않음 (되돌리기 쉬움, 모달 피로 방지)

## ConfirmDialog 컴포넌트

CancelDialog와 동일한 `<dialog>` + `showModal` 패턴(중앙 정렬, backdrop blur, cream 배경, 좌우
버튼 2개)을 따른다. 다이얼로그는 표시만 담당하고 API 호출·에러 표시·리다이렉트는 호출부의 기존
메커니즘을 유지한다.

```ts
interface ConfirmDialogProps {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string; // 기본 "Cancel"
  tone?: "default" | "danger"; // danger면 확인 버튼 bg-danger
  isPending?: boolean; // 확인·취소 버튼 잠금
  onConfirm: () => void;
  onClose: () => void;
  children?: React.ReactNode; // 요약 등 커스텀 내용
}
```

## 적용 지점

| 지점           | 문구                                                                        | tone    | 확인 후 동작                                             |
| -------------- | --------------------------------------------------------------------------- | ------- | -------------------------------------------------------- |
| Booking Submit | "Submit this application?" + children 요약(활동명·세션 일시·게스트 수·총액) | default | 기존 `handleSubmit`. 에러 시 모달 닫고 기존 폼 에러 표시 |
| 활동 삭제      | "Delete this activity?" / "This action cannot be undone."                   | danger  | 기존 optimistic 삭제 + 롤백. `window.confirm` 제거       |
| Log Out        | "Log out?" / "You can log back in anytime."                                 | default | 기존 best-effort 로그아웃                                |
| 활동 등록      | "Publish this activity?" / "You can't edit an activity after publishing."   | default | 기존 `createMyActivity`                                  |

## Create Activity 이탈 가드

- `TopAppBar`에 `onLeftClick?: () => void` prop 추가. 지정하면 back/close를 `Link` 대신
  `button`으로 렌더한다. 기존 사용처(`backHref`/`closeHref`)는 변경 없음.
- dirty 판정: 폼의 아무 필드나 초깃값에서 변경되면 dirty.
- dirty 상태에서 뒤로가기 클릭 → `ConfirmDialog(danger)`: "Discard this activity?" /
  "Your changes will be lost." → 확인 시 `router.push("/my-activities")`. dirty가 아니면 즉시 이동.
- dirty 동안 `beforeunload` 리스너를 등록해 탭 닫기/새로고침 시 브라우저 기본 경고를 띄운다.

## 테스트 전략 (TDD)

- `ConfirmDialog` 단위: 확인/취소 콜백, `isPending` 잠금, danger 스타일, children 렌더.
- 화면 통합: 각 지점에서 버튼 클릭 → 모달 표시 → 확인 → API 호출(또는 이동) 플로우.
  기존 my-activities 테스트의 `window.confirm` stub은 제거하고 다이얼로그 플로우로 교체.
- 이탈 가드: dirty면 모달 표시, clean이면 즉시 이동, dirty 시 `beforeunload` 등록·해제.
