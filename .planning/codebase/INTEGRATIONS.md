# Codebase Integrations Map

## Scope
- This file lists external systems and boundary integrations currently present in code.
- Observations are based on checked-in files only.

## Database Integration
- Primary external service: PostgreSQL.
- Local orchestration via Docker Compose (`docker-compose.yml`).
- Service definition: `postgres:16` image, exposed on `5432`.
- App connection string configured with `DATABASE_URL` in `.env`.
- Access path in code: Prisma client (`src/lib/prisma.ts`) and scoped wrapper (`src/lib/db.ts`).

## ORM and Query Boundary
- Prisma integration declared in `prisma/schema.prisma`.
- Migration history under `prisma/migrations/*`.
- Prisma-generated SQL includes tenant, role, template, and audit-event tables.
- No raw SQL usage in `src/` detected.

## HTTP/API Integrations
- In-repo HTTP endpoints:
- `POST /api/bootstrap` (`src/app/api/bootstrap/route.ts`)
- `POST /api/admin-only` (`src/app/api/admin-only/route.ts`)
- No outbound HTTP clients or third-party API SDKs detected.
- No webhook consumers/producers detected.

## Authentication/Authorization Integration
- RBAC authorization logic is local and DB-backed (`src/lib/auth.ts`).
- No external auth provider integration (e.g., Auth0/Clerk/NextAuth) found.

## Infrastructure Integration
- No message queue integration found.
- No cache integration (Redis/Memcached) found.
- No object storage integration found.
- No observability vendor integration (Sentry/Datadog/etc.) found.

## Build/Dev Tool Integrations
- Next.js + ESLint + TypeScript + Tailwind integration through standard config files.
- No CI workflow files detected in repo snapshot.

## Integration Risk Notes
- `.env` includes local database credentials and a localhost DSN; suitable for local dev but no env-tier split files are present.
