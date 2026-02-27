# Codebase Concerns Map

## Concern Summary
- Foundation architecture is present but still early-stage.
- The main risks are around strict tenant isolation guarantees, RBAC hardening, and lack of automated verification.

## Tenant Isolation Concerns
- `tenantDb().userRole` returns raw `prisma.userRole` in `src/lib/db.ts`, which bypasses tenant-enforced helper wrapping.
- `src/services/bootstrap.service.ts` mixes direct Prisma calls and tenant wrapper calls, creating inconsistent scoping patterns.
- `src/lib/auth.ts` uses direct Prisma `userRole.findFirst` with role tenant filter; functional, but not unified under one scoped DB abstraction.

## RBAC/API Enforcement Concerns
- RBAC check exists only on one route (`src/app/api/admin-only/route.ts`), so authorization strategy is not yet systemic.
- Route catches all errors and returns `403`, obscuring distinction between malformed input, not found, and true authorization failures.
- No shared API middleware/policy layer exists yet for consistent enforcement.

## Service Layer Concerns
- Service layer pattern is partially implemented (bootstrap service only).
- Current helpers use `any` for DB args in `src/lib/db.ts`; this can hide query-shape mistakes and scoping regressions.
- Business rules for workflow-as-data architecture are not implemented yet in code.

## Data Model and Domain Progress
- Contract-defined workflow state machine and projection semantics are documented but absent from schema and source.
- Template versioning base entities exist, but immutability/version lifecycle behavior is not implemented in app logic.
- AuditEvent exists in schema, but audit write/read workflows are not present in API/service code.

## Operational and Quality Concerns
- No automated tests or CI checks are present to enforce architecture invariants.
- Default README remains scaffold text and does not describe tenant/RBAC operational procedures.
- `.env` holds local credentials; no documented separation between local/staging/prod environment setup in repo.

## Priority Watchlist
- Enforce tenant scoping uniformly across all model access paths.
- Expand RBAC enforcement from single endpoint to policy-wide pattern.
- Add regression tests for tenant isolation and authorization boundaries.
