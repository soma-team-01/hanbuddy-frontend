# 예약 알림 메일 로고

`logo-borderless.png`는 백엔드 예약 알림 메일에서 사용하는 공개 정적 이미지입니다.

- 메일 참조 URL: `https://www.hanbuddy.kr/assets/brand/logo-borderless.png`
- 원본: 백엔드 `src/main/resources/templates/notifications/hanbuddy-logo-v1.png`
- 형식: 투명 배경 PNG (메일 클라이언트 호환용)

이미 발송된 메일도 이 URL을 참조하므로 파일 경로를 유지해야 합니다. 웹 UI의
`/images/brand/logo-borderless.webp`로 경로를 대체하거나 리다이렉트하지 않습니다.

Staging 메일도 Production 도메인의 이미지를 사용하므로 복구에는 Production
프론트 배포가 필요합니다. 배포 후 인증 없이 이 경로가 `200 image/png`로 응답하는지
확인합니다. 메일 클라이언트가 외부 이미지 로딩을 차단하거나 실패 응답을 캐시한 경우에는
이미지 허용 또는 메일 새로고침이 추가로 필요할 수 있습니다.
