# Codebase Structure Map

## Top-Level Layout
- `src/` -> application code (routes, libs, services)
- `prisma/` -> schema and migration history
- `docs/` -> roadmap, architecture contract, phase docs, product PDFs
- `public/` -> static assets
- Root config -> `package.json`, `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`, `docker-compose.yml`

## Source Tree (`src/`)
- `src/app/` -> Next.js App Router UI shell and API route handlers
- `src/app/api/bootstrap/route.ts` -> bootstrap endpoint
- `src/app/api/admin-only/route.ts` -> RBAC-guarded endpoint
- `src/lib/prisma.ts` -> Prisma client singleton
- `src/lib/db.ts` -> tenant-scoped query helper wrapper
- `src/lib/auth.ts` -> role check helper (`requireRole`)
- `src/services/bootstrap.service.ts` -> bootstrap workflow business logic

## Data and Schema Tree (`prisma/`)
- `prisma/schema.prisma` -> canonical data model
- `prisma/migrations/20260227194901_init_tenant_user/migration.sql`
- `prisma/migrations/20260227200017_add_role_models/migration.sql`
- `prisma/migrations/20260227205408_add_eco_template_spine/migration.sql`
- `prisma/migrations/20260227205639_add_audit_event/migration.sql`
- `prisma/migrations/migration_lock.toml`

## Documentation Tree (`docs/`)
- `docs/ROADMAP.md` -> milestone/phase outline
- `docs/ARCHITECTURE_CONTRACT.md` -> architecture guardrails
- `docs/PHASE_1_1_PLAN.md` -> phase planning doc
- Product/design PDFs present for requirements and design context.

## Naming and Placement Patterns
- API routes follow App Router convention: `src/app/api/<segment>/route.ts`
- Service files use `<domain>.service.ts` convention (currently one file).
- Library helpers grouped in `src/lib/*`.
- Prisma migrations are timestamp-prefixed directories.

## Current Structural Maturity
- Structure reflects early milestone foundation work (tenant/RBAC/data spine).
- Domain modules are not yet split by bounded context.
- No test directories, CI configs, or app feature folders beyond bootstrap/RBAC foundation.
