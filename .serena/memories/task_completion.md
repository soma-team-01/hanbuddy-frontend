# Task Completion

- Before claiming frontend code is complete, run the same gate as CI when feasible: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`.
- CI order for PRs: format check -> lint -> typecheck -> test -> build.
- For generated or heavily edited files, run `npx prettier --write <paths>` or `npm run format` before the full check.
- If touching Next.js APIs/conventions, verify relevant Next 16 docs in `node_modules/next/dist/docs/` first.
- If starting or changing a frontend dev server for visual work, provide the local URL and verify rendered UI when practical.
- Do not push directly to `main` or `develop`; use feature branches and PR flow.
