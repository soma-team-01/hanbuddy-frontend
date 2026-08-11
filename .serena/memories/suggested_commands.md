# Suggested Commands

- Use Node 24: `nvm use` if needed.
- Install deps: `npm install`; CI install uses `npm ci`.
- Dev server: `npm run dev` (Next dev/Turbopack; default URL `http://localhost:3000`).
- Production build: `npm run build`; serve built app: `npm run start`.
- Lint: `npm run lint`.
- Typecheck: `npm run typecheck`.
- Tests: `npm test`; watch mode: `npm run test:watch`.
- Format all: `npm run format`; check only: `npm run format:check`.
- Full local PR gate: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`.
- Darwin shell utilities are standard; prefer `rg`/`rg --files` for search.
