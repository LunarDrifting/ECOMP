# Codebase Conventions Map

## Code Style and Language
- TypeScript used across application code (`src/**/*.ts`, `src/**/*.tsx`).
- Strict mode enabled in `tsconfig.json`.
- ESLint configuration uses Next.js core-web-vitals + TypeScript presets (`eslint.config.mjs`).

## Imports and Module Boundaries
- Path alias convention: `@/*` mapped to `src/*` (`tsconfig.json`).
- Route handlers import domain logic from service/lib modules rather than inlining DB operations.
- Prisma client access centralized in `src/lib/prisma.ts`.

## Routing Conventions
- Next.js App Router route handlers use `export async function POST(...)` signatures.
- Route-level validation currently manual (`if (!userId || !tenantId) ...`).
- JSON response patterns use `NextResponse.json`.

## Data Access Conventions
- Tenant helper abstraction exists: `tenantDb(tenantId)` in `src/lib/db.ts`.
- Wrapper enforces tenant filter for `user` and `role` methods.
- Some direct Prisma reads/writes still appear in service/auth files for bootstrap and role lookup.

## Authorization Conventions
- RBAC check helper: `requireRole(userId, tenantId, requiredRole)` in `src/lib/auth.ts`.
- API route (`admin-only`) calls helper before success response.
- Error contract currently collapses auth failures to generic forbidden at route level.

## Error Handling Conventions
- Service layer throws generic `Error` values.
- Route handlers catch and translate to HTTP status (`500`, `403`, `400`).
- Logging is minimal (`console.error` in bootstrap route).

## Naming Conventions
- Models use PascalCase in Prisma (`Tenant`, `UserRole`, `TemplateVersion`).
- Service file naming uses suffix pattern (`bootstrap.service.ts`).
- Helper libs use concise nouns (`prisma.ts`, `db.ts`, `auth.ts`).

## Convention Gaps to Track
- `tenantDb().userRole` currently exposes raw Prisma model without tenant-guarded helper methods.
- `args: any` in `src/lib/db.ts` weakens compile-time safety for data-access contracts.
