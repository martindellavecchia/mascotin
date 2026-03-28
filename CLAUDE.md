# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

mascoTin is a pet-focused social networking and matching app (Tinder-style for pets). Built with Next.js 15 App Router, React 19, TypeScript, Prisma ORM, PostgreSQL (Neon serverless), and NextAuth.js. UI language is Spanish; code/variables are in English.

## Commands

```bash
npm run dev              # Dev server on port 3000
npm run build            # Production build (standalone output)
npm start                # Production server (requires Bun)
npm run lint             # ESLint
npm test                 # Jest tests
npm run test:watch       # Jest watch mode
npm test -- src/__tests__/components/Header.test.tsx   # Single test file
npm test -- --testNamePattern="Header"                 # Match pattern
npm run db:generate      # Generate Prisma Client
npm run db:push          # Push schema to DB
npm run db:migrate       # Run migrations
npm run db:reset         # Reset database
```

## Architecture

**Next.js App Router** with route groups: `src/app/(pages)/` for page routes, `src/app/api/` for REST API routes.

**Authentication**: NextAuth.js with credentials provider, JWT session strategy, bcryptjs password hashing. Middleware (`middleware.ts`) protects all routes except `/login`, `/register`, and static assets. Auth config lives in `src/lib/auth.ts`.

**Database**: Prisma ORM with PostgreSQL. Schema at `prisma/schema.prisma`. Singleton client in `src/lib/db.ts`. Key entity relationships:
- User -> Owner -> Pet[] (one user has one owner profile, owner has many pets)
- Pet -> Swipe[], Match[] (pet-centric matching, not user-centric)
- Match -> Message[] (chat between matched pets' owners)
- User -> Post[], Comment[], Like[] (community feed)
- Group -> GroupMember[], Post[], Event[], Message[] (community groups)
- ProviderProfile -> Service[] -> Appointment[] (services marketplace)
- Swipe/Match models have legacy `fromId`/`toId`/`user1Id`/`user2Id` fields alongside new pet-based fields

**Data fetching**: Custom `useFetchWithError` hook (with retry/timeout) and TanStack React Query for server state.

**UI layer**: shadcn/ui components in `src/components/ui/`, app components in `src/components/core/` and `src/components/features/`. Styling via Tailwind CSS 4 with `cn()` from `src/lib/utils.ts` for conditional classes. Animations with Framer Motion.

**Validation**: Zod v4 schemas in `src/lib/schemas.ts`, integrated with React Hook Form via `@hookform/resolvers`.

**State management**: Zustand for client-side state, React Query for server state.

**Path alias**: `@/*` maps to `./src/*`.

## Code Conventions

- **Imports order**: React -> Next.js -> third-party/UI -> custom hooks -> utils -> types
- **Use `@/` path alias** instead of relative imports
- **Components**: PascalCase filenames matching component name, `'use client'` directive for client components
- **Error messages and UI text**: Spanish
- **Zod v4** (different API from v3) for schema validation
- **Conventional commits**: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`

## Testing

- Jest 30 + Testing Library + SWC compiler
- Tests in `src/__tests__/` mirroring source structure (components/, hooks/, api/)
- `jest.setup.js` provides global mocks for browser APIs (matchMedia, ResizeObserver, IntersectionObserver, fetch)
- Mock Next.js navigation (`useRouter`, `usePathname`) and custom hooks in tests
- Coverage thresholds are permissive (4%)

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (Neon)
- `NEXTAUTH_URL` - Auth callback URL
- `NEXTAUTH_SECRET` - JWT signing secret
