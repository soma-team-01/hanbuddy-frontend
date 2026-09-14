# Hanbuddy Frontend

관광객(Tourist)과 현지 버디(Buddy)를 연결하는 액티비티 예약 서비스의 프론트엔드입니다.

## 기술 스택

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS v4**
- **ESLint** + **Prettier**
- 배포: **AWS EC2**

## 시작하기

Node 버전은 `.nvmrc`(24)에 맞춥니다. `nvm`을 쓴다면:

```bash
nvm use
```

의존성 설치 후 개발 서버 실행:

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인합니다.

## 스크립트

| 명령                   | 설명                       |
| ---------------------- | -------------------------- |
| `npm run dev`          | 개발 서버 (Turbopack)      |
| `npm run build`        | 프로덕션 빌드              |
| `npm run start`        | 빌드 결과 실행             |
| `npm run lint`         | ESLint 검사                |
| `npm run typecheck`    | 타입 검사 (`tsc --noEmit`) |
| `npm run format`       | Prettier 포맷 적용         |
| `npm run format:check` | 포맷 검사 (CI에서 사용)    |

## 폴더 구조

```
src/
├── app/              # 라우팅 = 페이지 (Figma 프레임 ≈ 여기 1개)
│   ├── (tourist)/    # Discovery, Detail, Booking...
│   ├── (buddy)/      # Dashboard, Create Activity...
│   └── admin/        # Payment Verification
├── components/       # ui/ (버튼·카드 등), layout/ (TopAppBar·BottomNavBar)
├── lib/              # 서버 통신, 유틸
├── types/            # 공통 타입
└── styles/           # 전역 스타일/디자인 토큰
```

`(tourist)`, `(buddy)`는 App Router의 route group(URL 경로에 포함되지 않는 조직용 폴더)입니다.

## 브랜치 전략

```
main      ─ 실서비스(Production). PR로만 병합 (develop → main: merge commit)
develop   ─ 통합 및 수동 Staging 배포 기준 (feature → develop: squash)
feature/* ─ 개별 기능 작업 및 PR CI 검증 (develop에서 분기, Preview 배포 없음)
```

- 작업 흐름: `feature/xxx`(develop 분기) → PR → `develop` → 릴리즈 시 PR → `main`
- 브랜치/커밋 네이밍: `<type>/<설명>`, 커밋 메시지 `<prefix>: <한국어 요약>` (`feat`, `fix`, `docs`, `chore` …)
- `main`·`develop`은 GitHub Ruleset으로 보호됨 (직접 push 불가, PR 필수).

## 배포 (AWS EC2)

- `main` push → CI 성공 후 설정이 활성화된 경우 **Production** 자동 배포
- `develop` → GitHub Actions의 `Deploy staging` workflow로 **Staging** 수동 배포
- Feature 브랜치와 PR → 배포 없이 CI만 실행
- 사용하지 않는 Staging은 `Stop staging` workflow로 중지
- 자세한 구성과 운영 절차는 [`docs/deployment/aws-ec2.md`](docs/deployment/aws-ec2.md) 참고

## 참고

- 화면 디자인은 Figma 초안 기준 (상세는 `CLAUDE.md` 참고).
