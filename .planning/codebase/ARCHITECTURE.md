# Codebase Architecture Map

## Declared Architectural Contract
- Contract source: `docs/ARCHITECTURE_CONTRACT.md`
- Declared requirements include:
- Next.js App Router monolith with Prisma v6 + PostgreSQL.
- Multi-tenant model with strict `tenantId` scoping.
- RBAC enforcement at API layer.
- Service-layer pattern and migration discipline.
- Workflow-as-data direction referenced in design docs.

## Current Layering (Observed)
- Route layer: `src/app/api/*/route.ts`
- Service layer: `src/services/bootstrap.service.ts`
- Shared data/auth helpers: `src/lib/prisma.ts`, `src/lib/db.ts`, `src/lib/auth.ts`
- Persistence schema/migrations: `prisma/schema.prisma`, `prisma/migrations/*`

## Request/Data Flow Patterns
- `POST /api/bootstrap`:
- Route calls `bootstrapSystem()` service.
- Service performs create-or-find operations for tenant/user/role/userRole.
- `POST /api/admin-only`:
- Route parses JSON body and validates required fields.
- Route calls `requireRole(userId, tenantId, 'ADMIN')`.

## Multi-Tenant and RBAC Mechanisms
- Tenant scoping wrapper exists: `tenantDb(tenantId)` in `src/lib/db.ts`.
- RBAC check exists: `requireRole()` in `src/lib/auth.ts`.
- Prisma schema encodes tenant ownership for `User`, `Role`, `ECO`, `Template`.

## Architecture Alignment Notes (Current State)
- Service layer exists but is partial (only bootstrap flow currently routed through service file).
- Route files currently avoid direct Prisma client usage.
- Some service/auth code still imports root Prisma directly (`src/services/bootstrap.service.ts`, `src/lib/auth.ts`), so tenant scoping is mixed between wrapper usage and direct queries.
- `userRole` accessor in `tenantDb` returns raw `prisma.userRole` without enforced tenant filter.

## Design-Stage Features vs Implemented Features
- Workflow-as-data behaviors from design docs are not implemented yet in `src/`.
- Task state machine and projection rules are documented but not represented in schema/code yet.
- Template version spine and audit event base models are present in Prisma schema.

## Entry Points
- Web entry: `src/app/layout.tsx`, `src/app/page.tsx`
- API entry: `src/app/api/bootstrap/route.ts`, `src/app/api/admin-only/route.ts`
