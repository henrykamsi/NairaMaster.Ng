# NairaMaster.ng

A Nigerian micro-task platform where users earn money by completing social media tasks (follow, like, share, comment, visit, etc.), submit screenshot proof, and withdraw earnings to their bank accounts.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/nairamaster run dev` — run the frontend (auto-assigned port)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (PWA), Tailwind CSS, TanStack Query, Wouter
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (bcryptjs + jsonwebtoken), verified against DB on every request
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)

## Where things live

- `artifacts/nairamaster/src/pages/` — Home, Tasks, Settings, Auth, Admin pages
- `artifacts/nairamaster/src/hooks/use-auth.ts` — auth context
- `artifacts/api-server/src/routes/` — all API route handlers split by domain
- `artifacts/api-server/src/middlewares/auth.ts` — JWT + DB-validated auth middleware
- `lib/db/src/schema/` — Drizzle table definitions (users, tasks, submissions, withdrawals, etc.)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth)

## Architecture decisions

- **Auth is DB-validated on every request** — `requireAuth` middleware looks up the user from DB on every call; `isAdmin` is read from DB, never trusted from JWT claim alone. Blocked/suspended/disabled users are gated mid-session even with valid tokens.
- **Withdrawal writes are atomic** — balance deduction + fee transaction + withdrawal record are wrapped in a single PostgreSQL transaction via the raw pool client.
- **Withdrawal state machine** — approve/decline routes check the current status first; already-approved or already-declined requests are rejected with 409 to prevent double-refund.
- **Daily dues gate** — withdrawal blocked if user has unpaid daily dues (when `daily_dues_enabled` setting is true).
- **Score-based account suspension** — admin scoring route auto-disables accounts: score < 10 → 1-week disable, score < 15 → 24-hour disable.

## Product

- **Users**: sign up, log in, manage wallet (add money / withdraw), perform tasks, upload screenshots for proof, view task status (pending/approved/declined), see their score, manage daily dues debt, read documentation and updates, leave comments.
- **Admin**: access via passcode `3471` on sign-up screen. Full management of tasks, users (block/suspend/shadow-ban/restrict), submissions review, withdrawal processing, scoring, daily dues tracking, settings, banners, docs, and updates.

## Key platform rules

- Minimum withdrawal: ₦3,000 + ₦300 fee
- Task creation fee: ₦1,000 (₦800 on Monday promo)
- User-uploaded tasks: max 20 performers
- Daily dues: ₦400/day when user performs at least one task (admin can toggle on/off)
- Score < 15 → 24h account disable; score < 10 → 1 week disable
- WhatsApp support: 09118310148 | Bank: OPAY 9118310148 (Henry Kamsi Okwuabudike)

## User preferences

- App name: nairamaster.ng
- Admin passcode: 3471
- Owner WhatsApp: 09118310148
- Payment bank: OPAY, Account: 9118310148, Name: HENRY KAMSI OKWUABUDIKE
- Support email: kamsih924@gmail.com
- Footer: "All rights reserved — Henry Global Tech Industry 2026"

## Gotchas

- Always run `pnpm run typecheck:libs` before `pnpm --filter @workspace/api-server run typecheck` — stale lib declarations cause false errors.
- After any OpenAPI spec change, re-run `pnpm --filter @workspace/api-spec run codegen`.
- The `SESSION_SECRET` env var is required at startup — the server throws if it's absent.
