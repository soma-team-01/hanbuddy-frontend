# 활동 공개 상태·신청 이력 상세 프론트 인계

관련 이슈: [백엔드 #23](https://github.com/soma-team-01/hanbuddy-backend/issues/23)

## 목적과 연동 전제

버디는 활동을 공개·비공개로 전환할 수 있고, 투어리스트는 활동이 비공개·삭제되어도 **내 신청을 통해 상세 내용을 확인**할 수 있다. 비공개·삭제 활동에서는 신규 예약 영역을 표시하지 않는다.

백엔드 구현 브랜치는 `feat/#23-activity-visibility-history`다. 인계 시점에는 로컬 커밋만 완료했으므로, 프론트 연동 테스트 전에 해당 API의 백엔드 병합·배포 여부를 확인한다. 이 문서는 프론트 구현 지침이며 프론트 기능 구현 완료를 의미하지 않는다.

## 1. 상태와 화면 정책

| 활동 상태 | 공개 탐색·상세 | 버디 내 활동              | 본인 신청을 통한 상세 | 신규 예약                |
| --------- | -------------- | ------------------------- | --------------------- | ------------------------ |
| ACTIVE    | 기존 동작      | 수정·비공개·삭제          | 조회 가능             | 기존 일정·좌석 조건 적용 |
| INACTIVE  | 노출하지 않음  | 수정·재공개·삭제          | 조회 가능             | 불가                     |
| DELETED   | 노출하지 않음  | 목록 제외, 수정·복구 불가 | 조회 가능             | 불가                     |

- 미종료 확정 예약 또는 유효한 결제 대기 선점이 있으면 비공개·삭제가 거절된다. 신청자 없는 미래 일정은 제한하지 않는다.
- 종료 기준은 신청 일정의 시작 시각 + 일정표 총 소요시간이다. 과거 확정 예약, 완료·취소·대체 신청, 만료 선점은 비공개·삭제를 막지 않는다.
- INACTIVE는 다시 판매할 수 있는 상태이고, DELETED는 관리 목록에서 제거된 상태다. 신청자에게 같은 읽기 전용 화면을 제공해도 두 상태의 관리 목적은 다르다.
- 기존 조회 시 신청 완료 처리, 후기 작성 조건, 결제·취소·환불 정책은 변경하지 않는다.

## 2. 버디 공개·비공개 전환

### API

```http
PATCH /activities/me/{activityId}/status
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{ "status": "INACTIVE" }
```

재공개는 `ACTIVE`를 보낸다. 성공 응답의 `result`는 기존 `MyActivityDetailResponse`다. **전체 활동 수정 요청을 보내지 않는다.** 이 API는 가격·할인·과거 일정을 수정하거나 다시 제출하지 않고 공개 상태만 바꾼다.

- ACTIVE에는 비공개 버튼, INACTIVE에는 공개 버튼을 제공한다.
- DRAFT는 기존 편집·공개 흐름을 유지한다. 새 상태 API의 대상이 아니다.
- 삭제는 기존 `DELETE /activities/me/{activityId}`를 유지한다. 성공 시 기존처럼 관리 목록에서 제거한다.
- 비공개·삭제 실패 시 카드를 제거하거나 상태 배지를 바꾸지 않는다. 성공 후 내 활동·상세·대시보드 관련 쿼리를 갱신한다.

| HTTP / code                                 | 처리                                                                              |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| 409 / `ACTIVITY409_UNFINISHED_RESERVATIONS` | 종료되지 않은 예약 또는 유효한 결제 대기 신청이 있어 비공개·삭제할 수 없다고 안내 |
| 400 / `ACTIVITY400_STATUS`                  | 허용되지 않는 상태 전환. ACTIVE/INACTIVE 요청인지 확인                            |
| 400 / `VALIDATION400_REQUIRED`              | status 누락                                                                       |
| 403 / `ACTIVITY403_OWNER`, `USER403_BUDDY`  | 본인 버디 활동만 관리 가능                                                        |
| 404 / `ACTIVITY404`                         | 없거나 삭제된 활동. 목록 새로고침 유도                                            |

## 3. 내 신청 → 신청자 전용 활동 상세

### API

```http
GET /applications/{applicationId}/activity?language=KO&displayCurrency=KRW
Authorization: Bearer <accessToken>
```

경로에 `/me`가 들어가지 않는다. 로그인한 투어리스트 본인의 신청만 조회할 수 있다. `language`는 기존 콘텐츠 언어 설정을 전달하고, `displayCurrency`는 기존 로케일별 표시 통화 정책을 사용한다. 생략 시 표시 통화는 KRW다.

성공 응답은 기존 `ApiResponse` 래퍼를 사용하며 `result`의 타입은 다음과 같다. 중첩 `activity`는 기존 공개 상세 DTO와 동일한 구조다.

```ts
type AppliedActivityDetailResponse = {
  applicationId: number;
  activityScheduleId: number;
  startAt: string; // 신청한 회차, +09:00 오프셋 포함
  endAt: string;
  activityStatus: "ACTIVE" | "INACTIVE" | "DELETED";
  canBook: boolean;
  activity: TouristActivityDetailResponse;
};
```

위 타입은 프론트 작성 예시다. 백엔드 enum에는 DRAFT도 있지만 이 API는 DRAFT 활동을 404로 거절한다.

### 화면 연결

1. 내 신청 카드의 사진·제목 링크를 모두 **applicationId 기반 개인 상세 경로**로 변경한다. 예: `/{locale}/applications/{applicationId}/activity`. 이는 새 프론트 경로 제안이며 현재 존재하는 페이지가 아니다.
2. 새 페이지는 신청자 전용 API를 호출하고 `result.activity`를 기존 상세 변환 함수·화면에 전달한다. 비공개·삭제 활동을 공개 `GET /activities/{activityId}`로 다시 조회하거나 실패 시 해당 경로로 fallback하지 않는다.
3. `canBook=false`이면 날짜 선택, 예약 버튼, 고정/인라인 예약 바, 예약 캘린더를 렌더링하지 않는다. 고정 바용 하단 여백·높이 계산도 함께 해제한다.
4. INACTIVE·DELETED에는 “현재 예약을 받지 않는 활동입니다.”를 표시한다. ACTIVE의 매진·일정 없음과 삭제 상태를 혼동하지 않도록 안내 문구 조건을 나눈다.
5. 신청한 날짜·시간은 최상위 `startAt`, `endAt`을 사용한다. 비공개·삭제 활동의 `activity.schedules`는 빈 배열이므로 여기서 신청 회차를 찾으면 안 된다.
6. ACTIVE이고 `canBook=true`이면 기존 예약 흐름으로 이동할 수 있다. canBook은 미래 OPEN 일정 존재 기준이며, 최종 상태·좌석·충돌 검증은 신청 API가 수행한다.

**보존 범위:** 제목·사진·버디·상세 내용은 삭제 후에도 보존된 활동 데이터다. 예약 당시 콘텐츠를 고정한 스냅샷은 아니다. 과거 결제 가격은 기존 내 신청 응답의 결제 스냅샷을 계속 사용하고, 상세의 현재 활동 가격으로 다시 계산하지 않는다.

### 접근·캐시·부가 조회

- 인증 없음은 401, 다른 사람 신청은 403 `APPLICATION403_OWNER`, 투어리스트가 아니면 403 `USER403_TOURIST`다.
- 신청 없음·만료 선점·SUPERSEDED·결제 전 취소 등 내 신청 비노출 대상은 404 `APPLICATION404`다. 결제 후 취소한 신청은 기존 이력 정책대로 조회할 수 있다.
- 401은 기존 재인증 흐름, 403/404는 접근 불가 안내와 내 신청 복귀를 제공한다. 공개 상세 재조회로 우회하지 않는다.
- 백엔드 응답은 `Cache-Control: no-store`다. BFF에서도 개인 응답이 공용 캐시되지 않게 하고, 공개 활동 상세 쿼리 키와 분리한다. 개인 상세 키에는 applicationId·언어·표시 통화를 반영하고 계정 변경 시 기존 인증 쿼리 정리 정책을 적용한다.
- 기존 상세는 날씨·후기·호스트 정보를 추가 조회한다. 비공개·삭제 상태에서 각 API 접근 조건을 확인하고, 부가 조회 실패가 상세 본문 전체를 막거나 공개 상세 재조회로 이어지지 않게 한다. 이 작업이 부가 API의 접근 정책까지 변경한 것은 아니다.

## 4. 현재 코드 기준 수정 위치

아래 경로는 프론트 저장소 기준이다.

| 위치                                                                                | 작업                                                                                                                                                   |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/[locale]/(app)/(with-nav)/(tourist)/applications/application-list.tsx`     | 사진·제목의 `/activities/${application.activityId}` 링크 2곳을 신청자 상세 경로로 변경. 취소·후기·결제 이어가기 액션은 유지                            |
| `src/app/[locale]/(app)/(tourist)/activities/[id]/activity-detail-content.tsx`      | 공개 상세는 기존대로 유지. 새 신청 상세 페이지를 만들 때 로딩·오류·로케일 처리 참고                                                                    |
| `src/components/activity/ActivityDetailView.tsx`                                    | 예약 영역 표시 옵션 추가. 기존 `preview`는 바를 숨기지 않고 호스트 연락에도 영향을 주므로 읽기 전용 대용으로 사용하지 않음. 기존 호출의 기본 동작 유지 |
| `src/lib/api/activity-view.ts`                                                      | 기존 `mapTouristActivityDetailToActivity` 재사용. 빈 schedules 처리 확인                                                                               |
| `src/types/application.ts`, `src/types/activity.ts`, `src/types/buddy.ts`           | 신청 상세 래퍼와 공개 상태 변경 요청 타입 추가. 기존 DTO 재사용                                                                                        |
| `src/lib/api/applications.ts`, `src/lib/query/applications.ts`                      | 신청 상세 클라이언트와 개인 쿼리 키 추가                                                                                                               |
| `src/app/api/applications/[applicationId]/activity/route.ts` **신규**               | 인증 BFF GET 추가. `language`, `displayCurrency` 전달 및 no-store 유지                                                                                 |
| `src/app/api/activities/me/[activityId]/status/route.ts` **신규**                   | 인증 BFF PATCH 추가. 기존 `authenticated-backend` 유틸 사용                                                                                            |
| `src/lib/api/buddy.ts`, `src/lib/query/buddy.ts`                                    | 공개 상태 변경 클라이언트 추가, 성공 시 `buddyKeys` 및 관련 공개 활동 캐시 갱신                                                                        |
| `src/app/[locale]/(app)/(with-nav)/(buddy)/my-activities/my-activities-content.tsx` | 상태 전환 버튼, 진행 중 중복 클릭 방지, 삭제·전환 409 안내                                                                                             |
| `src/lib/api/error-messages.ts`, `src/messages/ko.json`, `src/messages/en.json`     | 신규 오류 코드와 상태 전환·예약 불가 안내 번역 추가                                                                                                    |

브라우저에서 백엔드에 직접 요청하지 않고 기존 same-origin `/api/*` BFF·인증 흐름을 유지한다. Next.js 코드 작성 전 저장소 AGENTS와 설치된 Next.js 문서를 확인한다.

## 5. 검증 체크리스트

- [ ] BFF 두 API의 경로·메서드·body·언어/통화·인증·오류 전달 계약 테스트.
- [ ] 본인 INACTIVE/DELETED 신청 상세에서 제목·사진·버디·신청 시간 표시, 예약 UI와 캘린더 미표시.
- [ ] 내 신청 사진·제목 모두 새 경로로 이동. 새로고침·언어 변경 후에도 공개 상세 요청 없음.
- [ ] 다른 계정·비로그인·만료/대체 신청의 접근 제한 및 계정 전환 후 캐시 유출 없음.
- [ ] ACTIVE 공개 탐색·상세·예약, 버디 미리보기·작성 검토 화면의 기존 동작 유지.
- [ ] ACTIVE ↔ INACTIVE 전환 성공 시 배지·목록 갱신, DELETED 복구 UI 없음.
- [ ] 미종료 확정 예약/유효 선점이 있으면 비공개·삭제 409 안내 및 기존 카드 유지.
- [ ] 과거 이력만 있는 활동은 비공개·삭제 가능하고 신청 카드·결제 내역·후기 기능 유지.
- [ ] 날씨·후기 등 부가 조회 오류가 보존된 상세 본문을 가리지 않음.
- [ ] 한국어·영어, 390/768/1024/1440px에서 예약 바와 불필요한 하단 공백 미표시 확인.
- [ ] `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` 통과.

백엔드는 전체 테스트 839건 통과(실패·오류·스킵 0). H2 기반 통합 테스트를 포함하며, 실제 PostgreSQL·스테이징·프론트 브라우저 연동 검증은 별도로 필요하다.
