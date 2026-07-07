# Tech Stack

- Next.js `16.2.10` App Router, React `19.2.4`, TypeScript, npm.
- Tailwind CSS v4 with `@tailwindcss/postcss`; theme/design tokens are in `src/app/globals.css` via `@import "tailwindcss"` and `@theme`, not a Tailwind config file.
- Node engine `>=24`; `.nvmrc` pins project runtime to Node 24.
- Test stack: Vitest `4.x`, Testing Library React/DOM/Jest-DOM, jsdom.
- Lint/format: ESLint 9, `eslint-config-next` 16.2.10, Prettier 3.9 with `prettier-plugin-tailwindcss`.
- Deployment: Vercel; production branch `main`, preview branches/PRs protected by Vercel login.
- Next.js 16/React 19/Tailwind v4 are newer than many model assumptions: before writing Next-specific code, check current docs in `node_modules/next/dist/docs/`; for external library/API questions use Context7 per AGENTS.md.
