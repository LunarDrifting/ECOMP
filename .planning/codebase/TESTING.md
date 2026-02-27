# Codebase Testing Map

## Current Testing Footprint
- No unit test files detected (`*test*`, `*spec*`) in `src/`, `prisma/`, or `docs/`.
- No test framework dependency configured in `package.json`.
- No test script is defined in npm scripts.

## Current Verification Commands
- Lint command available: `npm run lint`.
- Build command available: `npm run build`.
- Runtime dev command: `npm run dev`.
- DB migration discipline documented in `docs/ARCHITECTURE_CONTRACT.md`.

## Existing Test-Relevant Patterns
- Service boundary exists (`src/services/bootstrap.service.ts`), which is a testable seam for business logic.
- Auth logic extracted to helper (`src/lib/auth.ts`), enabling isolated role-check tests.
- Tenant wrapper (`src/lib/db.ts`) is structured as composable methods, but currently typed with `any`.

## Database Verification Surface
- Prisma schema and SQL migrations are present and versioned.
- Migration sequence covers tenant/user, role/userRole, template spine, and audit events.
- No automated migration smoke test script currently defined.

## API Verification Surface
- Route handlers:
- `src/app/api/bootstrap/route.ts`
- `src/app/api/admin-only/route.ts`
- No API integration test harness currently configured.

## Quality Risks from Missing Tests
- Tenant isolation regressions could slip through in direct Prisma query paths.
- RBAC behavior changes are not protected by regression tests.
- Bootstrap idempotency behavior is not covered by automated checks.

## Suggested Test Areas (Map Guidance)
- Service-level tests for bootstrap create-or-find behavior.
- Auth helper tests for role presence/absence and tenant scoping.
- API route tests for input validation and status-code behavior.
- Migration validation in CI via `prisma migrate` commands.
