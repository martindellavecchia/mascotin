# AGENTS.md

This file provides guidance to coding agents (Codex and others) working in this repository. `CLAUDE.md` carries the same guidance for Claude Code; keep both files in sync.

## Project Overview

**Huella** (repo and package still named mascoTin) is a pet community app for Argentina: pet discovery and matching (Tinder-style, pet-centric), chat and meetups, community feed/groups/events, adoptions, foster homes ("Hogares de tránsito") with a rescue/volunteer network, lost-pet alerts, pet passport with health records and an emergency QR, and a services marketplace (stores, providers, bookings, reviews).

Stack: Next.js 15 App Router, React 19, TypeScript, Prisma 6, PostgreSQL (Neon), NextAuth v4. UI language is Spanish (es-AR); code and variables are in English.

Deployed on Vercel via Git integration on `main` (alias https://mascotin-pi.vercel.app). GitHub: martindellavecchia/mascotin.

## Commands

```bash
npm run dev                   # Dev server on port 3000
npm run build                 # prisma generate && next build (also type-checks)
npm start                     # next start -p 3000
npm run lint                  # eslint src next.config.ts tailwind.config.ts
npx tsc --noEmit              # Type-check only
npm test                      # Jest unit/component suites (excludes src/__tests__/integration)
npm test -- src/__tests__/components/Header.test.tsx   # Single test file
npm test -- --testNamePattern="Header"                 # Match pattern
npm run test:watch            # Jest watch mode
npm run test:product          # Integration suites against a real local PostgreSQL (see Testing)
npm run test:product:upgrade  # Verifies migrations upgrade an older schema (local product_ DB)
npm run qa:visual             # Playwright visual QA (PERF_BASE_URL, QA_STORE_SLUG, QA_EMAIL, QA_PASSWORD)
npm run perf:audit            # Lighthouse budgets for /, /login, /shop
npm run canary:production     # Synthetic production canary; only when explicitly asked (needs CANARY_RUN=true)
npm run db:generate           # Generate Prisma Client
npm run db:migrate            # prisma migrate dev (create/apply migrations)
npm run db:push               # prisma db push (prototyping only, see Database)
npm run db:reset              # Reset database
```

## Architecture

**Routing** (`src/app/`):
- `(main)/` is the authenticated app shell: `Header` with a bottom nav on mobile and a 252px left sidebar from `lg`, wrapped in `PrivateSessionProvider` (session + React Query client). Home for logged-in users is `/inicio`.
- `(public)/` is the public shell: landing `/` and the `/shop` store directory (server-rendered and cached).
- Top-level auth pages: `login`, `register`, `forgot-password`, `reset-password`, `verify-email`.
- `p/[token]` is the public emergency pet passport (looked up by `emergencyToken`).
- `api/` holds the REST route handlers.
- Some routes are in Spanish (`/inicio`, `/hogares-de-transito`). Legacy `/help` URLs redirect to `/hogares-de-transito` in `next.config.ts`.
- `sitemap.ts`, `robots.ts`, and metadata use `SITE_URL` from `src/lib/site-url.ts`, which resolves to the production domain on Vercel production.

**Authentication**: NextAuth credentials provider, JWT strategy, bcryptjs, login rate-limited. Config in `src/lib/auth.ts`, cookie names in `src/lib/auth-cookies.ts`. The JWT carries `id`, `role`, `headerImage`, and `isBusinessOwner`. Emails listed in the `ADMIN_EMAILS` env var (comma-separated) are auto-promoted to ADMIN on login.
- The middleware is `src/middleware.ts` (inside `src/`). Public paths are defined in `src/lib/route-access.ts`: `/`, `/shop`, `/shop/*`, `/p/*`, auth pages, and files. It redirects logged-in users from `/` and auth pages to `/inicio`, and rewrites account shop paths (`src/lib/shop-routing.ts`).
- The middleware matcher excludes `/api`, so every API route must check auth itself. Use `requireAuth()`, `requireOwner()`, and `requirePetOwnership()` from `src/lib/api-helpers.ts`, and `requireAdmin()` from `src/lib/admin.ts`. Server components and layouts use `getCachedSession()` from `src/lib/session.ts`.
- API responses use `{ success: boolean, data?, error? }`, with Spanish error messages.

**Server logic**: domain logic lives in `src/lib/server/*` (files start with `import 'server-only'`). It covers feed, home, inbox, messages, bookings, meetups, foster/rescue/volunteer networks, solidarity alerts, search digests, push, stores and store cache, swipes, and product events. Route handlers and server components call into these instead of inlining Prisma queries. Use `serializeForClient()` before passing data to client components. Top-level `src/lib/*.ts` holds shared, mostly pure helpers: schemas, dates, geo, matching, media, and reputation.

**Database**: Prisma schema at `prisma/schema.prisma`, singleton client in `src/lib/db.ts`. Versioned migrations live in `prisma/migrations/` (a 2026-08-15 baseline plus additive migrations). Schema changes go through a new migration (`npm run db:migrate`), not `db push`. Production runs `prisma migrate deploy` before deploying code that reads the new columns. Key relationships and rules:
- User -> Owner -> Pet[]. Pet -> Swipe[], Match[] (pet-centric). Match -> Message[], Meetup[].
- Swipe/Match keep legacy `fromId`/`toId`/`user1Id`/`user2Id` columns with `@default("")`. Never populate them; use only the pet-based fields.
- Swipes keep a per-pet action sequence so only the last negative pass can be undone, without granting XP twice.
- User -> Post[], Comment[], Like[]. Group -> GroupMember[] (tracks last read), Post[], Event[], Message[].
- When `Post.eventId` is set, `Event.date` and `Event.location` are canonical. Create or edit linked Event+Post in one transaction (`src/lib/server/event-posts.ts`). Never infer links from text or dates.
- Marketplace: StoreCategory -> Store -> StoreService, StoreReview. ProviderProfile -> Service[] -> Appointment[] + AppointmentEvent history. Admins create stores and assign them to providers; users request provider access through `ProviderRequest`.
- Foster/rescue: FosterProfile, RescueCase/RescueNeed/RescueCaseEvent, FosterOffer, FosterPlacement, FosterAdoptionDraft, Volunteer*, SolidarityAlertProfile/SolidaritySubscription, PetSighting. Adoptions: AdopterProfile, AdoptionListing, AdoptionApplication.
- Product workflows: SavedSearch/SearchDelivery/SearchDigest, ProductEvent (deduplicated business events), PushSubscription/PushDelivery, and RateLimitBucket.
- `SyntheticRun` tags synthetic QA data. Exclude it from real metrics and clean it up after tests.

**Feature flags**: `productEnabled('SAVED_SEARCHES' | 'BOOKINGS' | 'MEETUPS')` in `src/lib/product-flags.ts` reads `PRODUCT_*_ENABLED=true`. `/api/product-features` exposes only these booleans. Business rules for searches, bookings, meetups, the inbox, and discover undo are in `PLANS/PRODUCT_WORKFLOWS.md`.

**Time zones**: user-facing dates render in `America/Argentina/Buenos_Aires` (`APP_TIME_ZONE` in `src/lib/date-format.ts`) to avoid hydration mismatches, using 24-hour format. APIs take ISO instants with an offset. Bookings use the provider's own time zone (`src/lib/booking-schedule.ts`, `src/lib/timezone-label.ts`).

**Crons** (`vercel.json`): `/api/cron/search-digests` runs daily at 12:00 UTC (09:00 Argentina) and `/api/cron/maintenance` at 03:17 UTC. Both require `Authorization: Bearer $CRON_SECRET`. The digest returns `hasMore: true` when it must be invoked again to continue.

**Data fetching**: React Query (client in `PrivateSessionProvider`, hooks in `src/hooks/useViewerData.ts`) and `useFetchWithError` (retry/timeout). Polling uses `useAdaptivePolling`, `usePageActivity`, and `useVisibilityActivation` so it pauses while the tab is hidden. Prefer server rendering and caching for public pages. There is no global client store.

**Media and notifications**: uploads go through `src/lib/media.ts`. They use Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set, otherwise validated base64 data URLs stored in the DB. Notifications combine the in-app `Notification` model with native Web Push over VAPID (`src/lib/push.ts`, `src/lib/server/push.ts`). Email through Resend is optional: `sendEmail()` logs in dev and skips when `RESEND_API_KEY` is missing.

**Rate limiting** (`src/lib/rate-limit.ts`): uses Upstash Redis when `UPSTASH_REDIS_REST_*` is set, else the DB `RateLimitBucket` for `distributed` limits (fails closed), else memory.

## UI: Huella design system

- Tokens live in `src/app/globals.css` (Tailwind v4 `@theme`): primary aubergine `#4b244a`, accent lime `#b8d35a`, cream background `#fff8ef`, plus semantic success/warning/info/highlight colors. Use semantic utilities (`bg-primary`, `text-muted-foreground`, `border-border`). Legacy `teal-*` utilities are aliased to the Huella palette for compatibility; don't add new hardcoded teal/slate colors.
- The font is Plus Jakarta Sans. The theme is forced to light in `src/components/providers.tsx`.
- Use `lucide-react` for icons; Material Symbols were removed. Use `cn()` from `src/lib/utils.ts` for class names; animations are CSS/Tailwind (`tailwindcss-animate`), respecting `motion-reduce`.
- Primitives live in `src/components/ui/`: shadcn plus app-specific ones (`page-header`, `empty-state`, `state-feedback`, `list-row`, `confirm-dialog`, `loading`). Use Button `variant="brand"` for violet buttons so the foreground keeps proper contrast. Brand assets are in `src/components/brand/`.
- Feature components are grouped by domain in `src/components/<domain>/` (community, feed, groups, help, home, messages, pets, profile, provider, searches, shop, …). A few legacy components (`Header`, `PetForm`, `PetCard`, `OwnerForm`, …) sit at the root of `src/components/`.
- Accessibility is checked in every QA round:
  - Every input and `SelectTrigger` needs an associated label (placeholders alone don't count) and a unique ID.
  - Modals use the shared `Dialog`, which handles focus containment, Escape, and returning focus, with a confirmation on discarding unsaved changes.
  - Text must meet contrast requirements.
  - The viewports used are 390×844, 768×1024, and 1440×900.

## Code Conventions

- **Imports order**: React -> Next.js -> third-party/UI -> custom hooks -> utils -> types
- **Use `@/` path alias** instead of relative imports
- **Components**: PascalCase filenames matching the component name, with `'use client'` for client components
- **Error messages and UI text**: Spanish (es-AR)
- **Zod v4** (different API from v3) in `src/lib/schemas.ts`, integrated with React Hook Form via `@hookform/resolvers`
- **No comments unless they're needed**
- **Conventional commits**: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `perf:`

## Testing

- Jest 30 + Testing Library + SWC. Tests live in `src/__tests__/`: root-level `*.test.ts` for lib/domain logic, plus `components/`, `hooks/`, `api/`, `api-integration/`, `pages/`, and `lib/`.
- `jest.setup.js` mocks browser APIs (matchMedia, ResizeObserver, IntersectionObserver, fetch), and `server-only` is mapped to a mock. Mock Next.js navigation and custom hooks in component tests. Coverage thresholds are permissive (4%).
- Integration tests (`src/__tests__/integration/`, `npm run test:product`) run in the node env with a 30s timeout against real PostgreSQL. `DATABASE_URL` must point to a **local** (localhost/127.0.0.1) database whose name starts with `product_`. The scripts refuse anything else.
- Browser verification scripts (`scripts/verify-*.mjs`) use Playwright against a local `next start -p 3100` and a local `product_` DB. They write screenshots and logs to `artifacts/`, which stays local and is never committed.
- On Windows worktrees where Jest misreads absolute paths, run `node node_modules/jest/bin/jest.js --config ./jest.config.js --runInBand`.
- Never write test data to production. Tag synthetic data with `SyntheticRun` and delete it afterwards.

## Environment Variables

Required: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`.

Optional:
- `ADMIN_EMAILS` for auto-promoted admins.
- `PRODUCT_SAVED_SEARCHES_ENABLED`, `PRODUCT_BOOKINGS_ENABLED`, `PRODUCT_MEETUPS_ENABLED`.
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` for Web Push.
- `BLOB_READ_WRITE_TOKEN`.
- `CRON_SECRET`.
- `RESEND_API_KEY` and `EMAIL_FROM`.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- `QA_*`, `PERF_BASE_URL`, `AUDIT_BASE_URL`, and `CANARY_*` for QA scripts only.

See `.env.example`. Never commit `.env*` files or put production secrets in QA config.

## Working in this repo (shared by Codex and Claude Code)

- Codex reads this file and Claude Code reads `CLAUDE.md`. Both carry the same guidance, so update them together.
- Feature and audit work happens on `codex/<topic>` branches. Releases are pushed to `main` and deployed automatically by Vercel. Only push, merge, or deploy when the user asks. After a release, check that the local, remote, and deployment SHAs match, that the deployment is READY, that the alias is correct, and that runtime logs are clean.
- Plans and implementation reports are in `PLANS/` (Spanish, often dated `NAME_YYYY-MM-DD.md`). Read the relevant one before changing a feature: `PRODUCT_WORKFLOWS.md`, `PRODUCT_IMPLEMENTATION_STATUS.md`, `AUDIT_IMPLEMENTATION_2026-09-30.md`, `HUELLA_SIX_FINDINGS_2026-09-30.md`, `PERFORMANCE_REMEDIATION_PLAN.md`, `SHOP_REPUTATION_IMPLEMENTATION_PLAN.md`.
- `artifacts/`, `projects/`, `worker.lock`, and untracked `PLANS/AUDIT_*` files are local working material. Don't commit, move, or delete them unless asked.
- These root files are historical and don't describe the current state: `CORRECCIONES.md`, `IMPLEMENTACION_PROGRESO.md`, `REPORTE_COMPLETO_CORRECCIONES.*`, `VERCEL_PREPARACION_COMPLETADA.md`, `worklog.md`, and `design-qa.md`.
- Usual bar before a release: `npm run lint`, `npm test`, `npm run build`, the relevant integration tests, and browser QA on the three viewports for UI changes.
