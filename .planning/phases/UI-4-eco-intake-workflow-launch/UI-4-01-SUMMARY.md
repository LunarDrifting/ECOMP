---
phase: UI-4-eco-intake-workflow-launch
plan: "01"
subsystem: ui-api
tags: [intake-flow, eco, template-version, workflow-launch]
requires: [UI-3.1-approval-semantics-tightening]
provides:
  - tenant-scoped ecos list/create endpoints
  - tenant-scoped published template-versions endpoint
  - intake page for create->instantiate->launch flow
  - workflow query-param bootstrap for auto-load
affects: [backend, frontend, tests]
tech-stack:
  added: []
  patterns: [thin routes, service-layer wrappers, deterministic launch redirect]
key-files:
  created:
    - src/app/intake/page.tsx
    - src/app/api/ecos/route.ts
    - src/app/api/template-versions/route.ts
    - src/services/eco.service.ts
    - src/services/template.service.ts
  modified:
    - src/lib/db.ts
    - src/lib/api-client.ts
    - src/components/workflow/workflow-command-center.tsx
    - src/app/workflow/page.tsx
    - tests/integration/workflow-engine.integration.test.ts
key-decisions:
  - "New endpoints are tenant-scoped and route handlers remain Prisma-free by delegating to services."
  - "Intake flow uses existing instantiate endpoint and redirects with query params to workflow page."
  - "Workflow page now initializes command center from query params for deterministic auto-load."
requirements-completed:
  - UI4-ECO-LIST-ENDPOINT
  - UI4-ECO-CREATE-ENDPOINT
  - UI4-TEMPLATE-VERSIONS-ENDPOINT
  - UI4-INTAKE-PAGE-FLOW
  - UI4-WORKFLOW-QUERY-AUTOLOAD
  - UI4-TENANT-SCOPING
  - UI4-ROUTES-THIN-PRISMA-FREE
  - UI4-INTEGRATION-TESTS-MINIMAL
  - UI4-NO-SCHEMA-CHANGES
duration: 51min
completed: 2026-03-01
---

# Phase UI-4 Plan 01 Summary

Implemented end-to-end intake-to-workflow launch flow without schema or engine semantic changes.

## Accomplishments

- Added tenant-scoped ECO endpoints:
  - `GET /api/ecos?tenantId=...`
  - `POST /api/ecos`
- Added tenant-scoped published template versions endpoint:
  - `GET /api/template-versions?tenantId=...`
- Added service layer support:
  - eco list/create service
  - template-version list service
  - tenantDb helpers for eco list/create and published template version list
- Added new intake page `/intake`:
  - tenant/actor inputs
  - ECO creation
  - template version loading/selection
  - instantiate + redirect to `/workflow?tenantId=...&ecoId=...&actorId=...`
- Updated workflow bootstrap:
  - `/workflow` page reads query params and seeds command center
  - command center auto-loads projection from seeded tenant/eco values
  - optional ECO selector in workflow header populated from new endpoint
- Extended integration tests:
  - POST `/api/ecos` create + persistence assertion
  - GET `/api/template-versions` published + tenant-scoped assertion

## Verification

- Targeted lint passed for new UI-4 files; one existing warning remains in command center (`react-hooks/exhaustive-deps`).
- `npm run test` could not complete in this environment because database server at `localhost:5432` is not reachable.
- `npm run build` remains blocked in this sandbox by Turbopack process restriction (`Operation not permitted` while processing CSS pipeline).

## Manual E2E Run Steps

1. Open `/intake`.
2. Enter `tenantId` and optional `actorId`.
3. Create ECO with title.
4. Load template versions, pick one, click instantiate.
5. Confirm redirect to `/workflow?...` and projection auto-loads.

## Scope Guardrails Preserved

- No schema changes.
- No workflow engine semantic changes.
- New routes are thin and Prisma-free.
- Service-layer/tenantDb wrapper pattern preserved.

---
*Phase: UI-4-eco-intake-workflow-launch*
*Completed: 2026-03-01*
