# Conventions

- Commit messages: `<prefix>: <한국어 요약>`; branch names align with prefixes (`feat/`, `fix/`, `docs/`, etc.).
- Protected branches: `main` and `develop` require PRs. `feature -> develop` uses squash merge; `develop -> main` uses merge commit.
- App structure: routes in `src/app`, minimal UI primitives in `src/components/ui`, layout components in `src/components/layout`, utilities/API helpers in `src/lib`, shared types in `src/types`.
- Shared design tokens: `cream`, `ink`, `forest`, `sage`, `line`, `chip`, `sand`, `earth`, `success`, `warning`, `danger`; fonts Manrope (`font-display`) and Be Vietnam Pro (`font-sans`).
- Navigation: `TopAppBar` supports back/close/title/action; `BottomNavBar` has role-aware Home/Activity/My Page tabs. Transactional screens use fixed `BottomActionBar` instead of bottom nav.
- Activity cards include image, rating badge, title, location, host avatar/name, and KRW price.
- Currency display is Korean won; normalize designs showing USD to `₩` via `formatKrw`.
- Person avatars use the shared `Avatar` component and fall back to circular initials.
- Figma is a layout/content reference, not a pixel-perfect contract; normalize inconsistent frame typography through project tokens.
